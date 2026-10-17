package com.example.selfhealthcare.service;

import com.example.selfhealthcare.domain.AlertStatus;
import com.example.selfhealthcare.domain.AppUser;
import com.example.selfhealthcare.domain.HealthAlert;
import com.example.selfhealthcare.domain.HealthRecord;
import com.example.selfhealthcare.domain.RegistrationOrder;
import com.example.selfhealthcare.domain.RiskLevel;
import com.example.selfhealthcare.domain.UserProfile;
import com.example.selfhealthcare.dto.HealthRecordRequest;
import com.example.selfhealthcare.dto.HealthRecordResponse;
import com.example.selfhealthcare.dto.PagedResponse;
import com.example.selfhealthcare.exception.NotFoundException;
import com.example.selfhealthcare.repository.HealthAlertRepository;
import com.example.selfhealthcare.repository.HealthRecordRepository;
import com.example.selfhealthcare.repository.RegistrationOrderRepository;
import com.example.selfhealthcare.util.PagingSupport;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
//健康记录业务
@Service
public class HealthRecordService {

    private static final Logger log = LoggerFactory.getLogger(HealthRecordService.class);

    private final HealthRecordRepository healthRecordRepository;
    private final HealthAlertRepository healthAlertRepository;
    private final RegistrationOrderRepository registrationOrderRepository;
    private final AuthService authService;
    private final UserProfileService userProfileService;
    private final RiskAssessmentService riskAssessmentService;

    public HealthRecordService(
            HealthRecordRepository healthRecordRepository,
            HealthAlertRepository healthAlertRepository,
            RegistrationOrderRepository registrationOrderRepository,
            AuthService authService,
            UserProfileService userProfileService,
            RiskAssessmentService riskAssessmentService) {
        this.healthRecordRepository = healthRecordRepository;
        this.healthAlertRepository = healthAlertRepository;
        this.registrationOrderRepository = registrationOrderRepository;
        this.authService = authService;
        this.userProfileService = userProfileService;
        this.riskAssessmentService = riskAssessmentService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<HealthRecordResponse> listRecords(int page, int size, RiskLevel riskLevel) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        int normalizedPage = PagingSupport.normalizePage(page);
        Pageable pageable = PageRequest.of(
                normalizedPage - 1,
                PagingSupport.normalizeSize(size),
                Sort.by(Sort.Order.desc("recordDate"), Sort.Order.desc("createdAt")));

        Page<HealthRecord> records = riskLevel == null
                ? healthRecordRepository.findByUserId(currentUser.getId(), pageable)
                : healthRecordRepository.findByUserIdAndRiskLevel(currentUser.getId(), riskLevel, pageable);

        return PagingSupport.toResponse(records, normalizedPage, HealthRecordResponse::from);
    }

    @Transactional(readOnly = true)
    public HealthRecordResponse getRecord(Long id) {
        return HealthRecordResponse.from(findOwnedEntity(id));
    }

    @Transactional
    public HealthRecordResponse createRecord(HealthRecordRequest request) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        return saveRecord(new HealthRecord(), currentUser, request);
    }

    @Transactional
    public HealthRecordResponse updateRecord(Long id, HealthRecordRequest request) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        HealthRecord record = findOwnedEntity(id, currentUser.getId());
        return saveRecord(record, currentUser, request);
    }

    @Transactional
    public void deleteRecord(Long id) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        HealthRecord record = findOwnedEntity(id, currentUser.getId());
        // 先解除引用该记录的挂号单（health_record_id 可空），避免外键约束失败
        List<RegistrationOrder> referencingOrders = registrationOrderRepository.findByHealthRecordId(record.getId());
        if (!referencingOrders.isEmpty()) {
            referencingOrders.forEach(order -> order.setHealthRecord(null));
            registrationOrderRepository.saveAll(referencingOrders);
        }
        healthAlertRepository.deleteByHealthRecordId(record.getId());
        healthRecordRepository.delete(record);
    }

    @Transactional
    public HealthRecordResponse createImportedRecord(AppUser user, HealthRecordRequest request) {
        return saveRecord(new HealthRecord(), user, request);
    }

    @Transactional(readOnly = true)
    public HealthRecord findOwnedEntity(Long id) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        return findOwnedEntity(id, currentUser.getId());
    }

    private HealthRecord findOwnedEntity(Long id, Long userId) {
        return healthRecordRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("未找到对应的健康记录"));
    }

    private HealthRecordResponse saveRecord(HealthRecord record, AppUser user, HealthRecordRequest request) {
        apply(record, user, request);

        UserProfile profile = userProfileService.findByUserId(user.getId()).orElse(null);
        RiskAssessmentService.AssessmentResult assessmentResult = riskAssessmentService.assess(profile, record);
        record.setBmi(assessmentResult.bmi());
        record.setRiskScore(assessmentResult.riskScore());
        record.setRiskLevel(assessmentResult.riskLevel());
        record.setSummary(assessmentResult.summary());

        HealthRecord savedRecord = healthRecordRepository.save(record);
        log.info("【记录保存调试】savedRecord id={}, userId={}, recordDate={}", savedRecord.getId(), user.getId(), savedRecord.getRecordDate());
        refreshAlerts(savedRecord, assessmentResult);

        return HealthRecordResponse.from(savedRecord);
    }

    private void refreshAlerts(HealthRecord record, RiskAssessmentService.AssessmentResult assessmentResult) {
        healthAlertRepository.deleteByHealthRecordId(record.getId());
        List<HealthAlert> alerts = assessmentResult.alerts().stream()
                .map(alertDraft -> {
                    HealthAlert alert = new HealthAlert();
                    alert.setUser(record.getUser());
                    alert.setHealthRecord(record);
                    alert.setObservedDate(record.getRecordDate());
                    alert.setCategory(alertDraft.category());
                    alert.setTitle(alertDraft.title());
                    alert.setIndicator(alertDraft.indicator());
                    alert.setSuggestion(alertDraft.suggestion());
                    alert.setSeverity(alertDraft.severity());
                    alert.setStatus(AlertStatus.PENDING);
                    return alert;
                })
                .toList();
        if (!alerts.isEmpty()) {
            healthAlertRepository.saveAll(alerts);
        }
    }

    private void apply(HealthRecord record, AppUser user, HealthRecordRequest request) {
        record.setUser(user);
        record.setRecordDate(request.recordDate());
        record.setWeightKg(request.weightKg());
        record.setWaistCircumferenceCm(request.waistCircumferenceCm());
        record.setSystolicPressure(request.systolicPressure());
        record.setDiastolicPressure(request.diastolicPressure());
        record.setHeartRate(request.heartRate());
        record.setFastingBloodSugar(request.fastingBloodSugar());
        record.setPostprandialBloodSugar(request.postprandialBloodSugar());
        record.setBodyTemperature(request.bodyTemperature());
        record.setBloodOxygen(request.bloodOxygen());
        record.setCholesterolTotal(request.cholesterolTotal());
        record.setTriglyceride(request.triglyceride());
        record.setLdlCholesterol(request.ldlCholesterol());
        record.setHdlCholesterol(request.hdlCholesterol());
        record.setAlt(request.alt());
        record.setAst(request.ast());
        record.setCreatinine(request.creatinine());
        record.setUricAcid(request.uricAcid());
        record.setBloodUreaNitrogen(request.bloodUreaNitrogen());
        record.setHemoglobin(request.hemoglobin());
        record.setWhiteBloodCell(request.whiteBloodCell());
        record.setSymptoms(normalize(request.symptoms()));
        record.setMedicationTaken(normalize(request.medicationTaken()));
        record.setNotes(normalize(request.notes()));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
