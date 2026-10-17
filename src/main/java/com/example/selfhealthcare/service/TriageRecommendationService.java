package com.example.selfhealthcare.service;

import com.example.selfhealthcare.domain.AppUser;
import com.example.selfhealthcare.domain.Department;
import com.example.selfhealthcare.domain.Doctor;
import com.example.selfhealthcare.domain.HealthAlert;
import com.example.selfhealthcare.domain.HealthRecord;
import com.example.selfhealthcare.domain.RegistrationOrder;
import com.example.selfhealthcare.domain.RegistrationSlot;
import com.example.selfhealthcare.domain.RegistrationStatus;
import com.example.selfhealthcare.domain.TriageSource;
import com.example.selfhealthcare.domain.UrgencyLevel;
import com.example.selfhealthcare.domain.UserProfile;
import com.example.selfhealthcare.dto.DepartmentSlotResponse;
import com.example.selfhealthcare.dto.DepartmentOptionResponse;
import com.example.selfhealthcare.dto.DepartmentSuggestionItem;
import com.example.selfhealthcare.dto.DoctorSlotGroup;
import com.example.selfhealthcare.dto.SlotOptionResponse;
import com.example.selfhealthcare.dto.TriageRecommendResponse;
import com.example.selfhealthcare.dto.TriageSuggestion;
import com.example.selfhealthcare.exception.AiIntegrationException;
import com.example.selfhealthcare.exception.BadRequestException;
import com.example.selfhealthcare.exception.NotFoundException;
import com.example.selfhealthcare.repository.DepartmentRepository;
import com.example.selfhealthcare.repository.DoctorRepository;
import com.example.selfhealthcare.repository.HealthAlertRepository;
import com.example.selfhealthcare.repository.HealthRecordRepository;
import com.example.selfhealthcare.repository.RegistrationOrderRepository;
import com.example.selfhealthcare.repository.RegistrationSlotRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

//挂号分诊核心编排：并行规则与 AI 双通道，交叉验证后落推荐单并聚合可预约号源
@Service
public class TriageRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(TriageRecommendationService.class);
    private static final String DISCLAIMER =
            "分诊与挂号建议由规则引擎与 AI 共同生成，仅供参考，不构成医疗诊断；请结合实际症状与医生面诊判断。";
    private static final String EMERGENCY_NOTICE =
            "检测到危急指标，建议立即前往急诊科或拨打 120，请勿等待常规号源。";
    private static final int SLOT_WINDOW_DAYS = 7;

    private final AuthService authService;
    private final UserProfileService userProfileService;
    private final HealthRecordRepository healthRecordRepository;
    private final HealthAlertRepository healthAlertRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final RegistrationSlotRepository registrationSlotRepository;
    private final RegistrationOrderRepository registrationOrderRepository;
    private final TriageRuleService triageRuleService;
    private final DeepSeekTriageService deepSeekTriageService;

    public TriageRecommendationService(
            AuthService authService,
            UserProfileService userProfileService,
            HealthRecordRepository healthRecordRepository,
            HealthAlertRepository healthAlertRepository,
            DepartmentRepository departmentRepository,
            DoctorRepository doctorRepository,
            RegistrationSlotRepository registrationSlotRepository,
            RegistrationOrderRepository registrationOrderRepository,
            TriageRuleService triageRuleService,
            DeepSeekTriageService deepSeekTriageService) {
        this.authService = authService;
        this.userProfileService = userProfileService;
        this.healthRecordRepository = healthRecordRepository;
        this.healthAlertRepository = healthAlertRepository;
        this.departmentRepository = departmentRepository;
        this.doctorRepository = doctorRepository;
        this.registrationSlotRepository = registrationSlotRepository;
        this.registrationOrderRepository = registrationOrderRepository;
        this.triageRuleService = triageRuleService;
        this.deepSeekTriageService = deepSeekTriageService;
    }

    @Transactional
    public TriageRecommendResponse recommend(Long recordId) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        HealthRecord record = resolveRecord(currentUser, recordId);
        UserProfile profile = userProfileService.findByUserId(currentUser.getId()).orElse(null);
        List<HealthAlert> alerts = healthAlertRepository.findByHealthRecordId(record.getId());
        List<Department> departments = departmentRepository.findAllByOrderByNameAsc();
        Map<String, Department> departmentIndex = departments.stream()
                .collect(Collectors.toMap(Department::getName, d -> d, (a, b) -> a, LinkedHashMap::new));

        TriageRuleService.RuleTriageResult rule = triageRuleService.triage(profile, record, alerts);

        TriageSuggestion ai = null;
        if (deepSeekTriageService.isAvailable()) {
            try {
                ai = deepSeekTriageService.triage(profile, record, alerts, departments);
            } catch (AiIntegrationException exception) {
                log.warn("AI 分诊不可用，降级为规则分诊：{}", exception.getMessage());
            }
        }

        String rulePrimary = firstKnownDepartment(rule.primaryDepartment(), departmentIndex);
        String aiPrimary = ai == null ? null : firstKnownDepartment(ai.primaryDepartment(), departmentIndex);

        MergeResult merged = merge(rule, rulePrimary, ai, aiPrimary);

        Department primaryDepartment = departmentIndex.get(merged.primary);
        if (primaryDepartment == null) {
            primaryDepartment = departments.getFirst();
        }

        // 先清除该记录已有的 RECOMMENDED 草稿单，保证同一记录只保留最新一条，避免累积空白单
        registrationOrderRepository.deleteByUserIdAndHealthRecordIdAndStatus(
                currentUser.getId(), record.getId(), RegistrationStatus.RECOMMENDED);

        RegistrationOrder savedOrder = persistRecommendedOrder(
                currentUser, record, primaryDepartment, merged, rule, ai);

        List<DepartmentSlotResponse> slots = buildAvailableSlots(merged.recommendedDepartments);

        return new TriageRecommendResponse(
                savedOrder.getId(),
                record.getId(),
                merged.primary,
                merged.primaryReason,
                merged.candidates,
                merged.urgency,
                merged.urgency.getLabel(),
                merged.urgency == UrgencyLevel.EMERGENCY ? EMERGENCY_NOTICE : null,
                rulePrimary,
                aiPrimary,
                merged.reasons,
                merged.aiReason,
                merged.checkupSuggestions,
                merged.precautions,
                merged.source,
                merged.confidence,
                slots,
                DISCLAIMER);
    }

    @Transactional(readOnly = true)
    public List<DepartmentOptionResponse> listDepartments() {
        return departmentRepository.findAllByOrderByNameAsc().stream()
                .map(DepartmentOptionResponse::from)
                .toList();
    }

    private MergeResult merge(
            TriageRuleService.RuleTriageResult rule,
            String rulePrimary,
            TriageSuggestion ai,
            String aiPrimary) {

        UrgencyLevel ruleUrgency = rule.urgency();
        UrgencyLevel aiUrgency = parseUrgency(ai == null ? null : ai.urgency());

        MergeResult result = new MergeResult();
        List<String> reasons = new ArrayList<>(rule.reasons());

        if (ai == null) {
            result.source = TriageSource.RULE_ONLY;
            result.primary = rulePrimary;
            result.primaryReason = reasons.isEmpty() ? "依据体检指标的规则分诊结果。" : reasons.getFirst();
            result.urgency = ruleUrgency;
            result.confidence = new BigDecimal("0.70");
        } else {
            String joinedAiReason = buildAiReason(ai);
            result.aiReason = joinedAiReason;
            result.checkupSuggestions = ai.checkupSuggestions() == null ? List.of() : ai.checkupSuggestions();
            result.precautions = ai.precautions() == null ? List.of() : ai.precautions();
            result.confidence = ai.confidence() == null ? new BigDecimal("0.75") : ai.confidence();

            if (rulePrimary != null && rulePrimary.equals(aiPrimary)) {
                result.source = TriageSource.AI_HYBRID;
                result.primary = rulePrimary;
                result.primaryReason = "规则引擎与 AI 均推荐「" + rulePrimary + "」，置信度较高。"
                        + (ai.primaryReason() == null ? "" : " AI 说明：" + ai.primaryReason());
                result.confidence = new BigDecimal("0.90");
            } else {
                // 双通道不一致：以规则首选为安全首选（保证确定性兜底），AI 首选并列展示
                result.source = TriageSource.AI_HYBRID;
                result.primary = rulePrimary;
                result.primaryReason = reasons.isEmpty()
                        ? "规则引擎推荐「" + rulePrimary + "」。"
                        : reasons.getFirst();
                result.confidence = new BigDecimal("0.60");
            }

            UrgencyLevel effective = aiUrgency == null ? ruleUrgency
                    : (aiUrgency.getWeight() > ruleUrgency.getWeight() ? aiUrgency : ruleUrgency);
            result.urgency = effective;
        }

        // 规则命中 EMERGENCY 无条件覆盖
        if (ruleUrgency == UrgencyLevel.EMERGENCY) {
            result.urgency = UrgencyLevel.EMERGENCY;
        }
        if (result.urgency == null) {
            result.urgency = UrgencyLevel.ROUTINE;
        }

        // 候选科室：规则候选 + AI 首选/候选，标注来源
        result.candidates = buildCandidates(rule, ai, aiPrimary, rulePrimary);

        // 汇总所有推荐科室（首选 + 候选）
        LinkedHashSet<String> all = new LinkedHashSet<>();
        all.add(result.primary);
        for (DepartmentSuggestionItem item : result.candidates) {
            all.add(item.department());
        }
        result.recommendedDepartments.addAll(all);
        result.reasons = reasons.stream().distinct().toList();

        return result;
    }

    private List<DepartmentSuggestionItem> buildCandidates(
            TriageRuleService.RuleTriageResult rule, TriageSuggestion ai, String aiPrimary, String rulePrimary) {

        Map<String, DepartmentSuggestionItem> byDepartment = new LinkedHashMap<>();

        for (String candidate : rule.candidateDepartments()) {
            byDepartment.put(candidate, new DepartmentSuggestionItem(candidate, "规则引擎依据体检指标推荐。", "RULE"));
        }

        if (ai != null) {
            if (aiPrimary != null && !aiPrimary.equals(rulePrimary)) {
                byDepartment.merge(aiPrimary,
                        new DepartmentSuggestionItem(aiPrimary,
                                ai.primaryReason() == null ? "AI 分诊推荐。" : ai.primaryReason(), "AI"),
                        this::combineSource);
            }
            if (ai.alternativeDepartments() != null) {
                for (TriageSuggestion.Alternative alt : ai.alternativeDepartments()) {
                    String dept = alt.department();
                    if (dept == null || dept.isBlank() || dept.equals(rulePrimary)) {
                        continue;
                    }
                    byDepartment.merge(dept,
                            new DepartmentSuggestionItem(dept, alt.reason() == null ? "AI 分诊推荐。" : alt.reason(), "AI"),
                            this::combineSource);
                }
            }
        }

        byDepartment.remove(rulePrimary);
        return byDepartment.values().stream()
                .limit(3)
                .toList();
    }

    private DepartmentSuggestionItem combineSource(DepartmentSuggestionItem existing, DepartmentSuggestionItem incoming) {
        String source = existing.source().equals(incoming.source()) ? existing.source() : "BOTH";
        String reason = "BOTH".equals(source)
                ? "规则引擎与 AI 均推荐该科室。" + incoming.reason()
                : existing.reason();
        return new DepartmentSuggestionItem(existing.department(), reason, source);
    }

    private String buildAiReason(TriageSuggestion ai) {
        StringBuilder sb = new StringBuilder();
        if (ai.primaryReason() != null && !ai.primaryReason().isBlank()) {
            sb.append(ai.primaryReason().trim()).append(' ');
        }
        if (ai.alternativeDepartments() != null) {
            for (TriageSuggestion.Alternative alt : ai.alternativeDepartments()) {
                if (alt.reason() != null && !alt.reason().isBlank()) {
                    sb.append('「').append(alt.department()).append("」").append(alt.reason().trim()).append(' ');
                }
            }
        }
        String text = sb.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private RegistrationOrder persistRecommendedOrder(
            AppUser user,
            HealthRecord record,
            Department primaryDepartment,
            MergeResult merged,
            TriageRuleService.RuleTriageResult rule,
            TriageSuggestion ai) {

        RegistrationOrder order = new RegistrationOrder();
        order.setUser(user);
        order.setHealthRecord(record);
        order.setDepartment(primaryDepartment);
        order.setUrgency(merged.urgency);
        order.setStatus(RegistrationStatus.RECOMMENDED);
        order.setTriageSource(merged.source);
        order.setRuleDepartments(joinDepartments(rule.primaryDepartment(), rule.candidateDepartments()));
        order.setAiDepartments(ai == null ? null : joinDepartments(ai.primaryDepartment(),
                ai.alternativeDepartments() == null ? List.of()
                        : ai.alternativeDepartments().stream().map(TriageSuggestion.Alternative::department).toList()));
        order.setPrimaryReason(truncate(merged.primaryReason, 1000));
        order.setAiReason(truncate(merged.aiReason, 2000));
        order.setCheckupSuggestions(truncate(join(merged.checkupSuggestions), 1000));
        order.setPrecautions(truncate(join(merged.precautions), 1000));
        order.setDisclaimer(truncate(DISCLAIMER, 500));
        return registrationOrderRepository.save(order);
    }

    private List<DepartmentSlotResponse> buildAvailableSlots(List<String> departmentNames) {
        List<String> validNames = departmentNames.stream()
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .toList();
        if (validNames.isEmpty()) {
            return List.of();
        }

        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(SLOT_WINDOW_DAYS);

        List<DepartmentSlotResponse> result = new ArrayList<>();
        for (String name : validNames) {
            List<Doctor> doctors = doctorRepository.findByDepartmentName(name);
            if (doctors.isEmpty()) {
                continue;
            }
            Department department = departmentRepository.findByName(name).orElse(null);
            List<Long> doctorIds = doctors.stream().map(Doctor::getId).toList();
            List<RegistrationSlot> slots = registrationSlotRepository
                    .findByDoctorIdInAndDateBetweenAndRemainingSlotsGreaterThanOrderByDateAscPeriodAsc(
                            doctorIds, start, end, 0);

            Map<Long, List<RegistrationSlot>> slotsByDoctor = slots.stream()
                    .collect(Collectors.groupingBy(slot -> slot.getDoctor().getId()));

            List<DoctorSlotGroup> groups = doctors.stream()
                    .filter(doctor -> slotsByDoctor.containsKey(doctor.getId()))
                    .map(doctor -> new DoctorSlotGroup(
                            doctor.getId(),
                            doctor.getName(),
                            doctor.getTitle(),
                            doctor.getTitle() == null ? null : doctor.getTitle().getLabel(),
                            doctor.getHospital() == null ? null : doctor.getHospital().getName(),
                            doctor.getSpecialty(),
                            doctor.getRegistrationFee(),
                            slotsByDoctor.get(doctor.getId()).stream()
                                    .map(slot -> new SlotOptionResponse(
                                            slot.getId(),
                                            slot.getDate(),
                                            slot.getPeriod(),
                                            slot.getPeriod() == null ? null : slot.getPeriod().getLabel(),
                                            slot.getRemainingSlots(),
                                            slot.getTotalSlots()))
                                    .toList()))
                    .toList();

            if (!groups.isEmpty()) {
                result.add(new DepartmentSlotResponse(
                        department == null ? null : department.getId(),
                        name,
                        department == null ? null : department.getVisitNotice(),
                        groups));
            }
        }
        return result;
    }

    private HealthRecord resolveRecord(AppUser user, Long recordId) {
        if (recordId != null) {
            return healthRecordRepository.findByIdAndUserId(recordId, user.getId())
                    .orElseThrow(() -> new NotFoundException("未找到指定的健康记录"));
        }
        return healthRecordRepository.findTop1ByUserIdOrderByRecordDateDescCreatedAtDesc(user.getId())
                .orElseThrow(() -> new BadRequestException("还没有可用于分诊的健康记录，请先录入或导入体检报告"));
    }

    private String firstKnownDepartment(String name, Map<String, Department> index) {
        if (name == null) {
            return null;
        }
        String trimmed = name.trim();
        return index.containsKey(trimmed) ? trimmed : null;
    }

    private UrgencyLevel parseUrgency(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UrgencyLevel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String joinDepartments(String primary, List<String> candidates) {
        LinkedHashSet<String> set = new LinkedHashSet<>();
        if (primary != null && !primary.isBlank()) {
            set.add(primary.trim());
        }
        if (candidates != null) {
            candidates.stream().filter(c -> c != null && !c.isBlank()).map(String::trim).forEach(set::add);
        }
        return truncate(String.join("、", set), 500);
    }

    private String join(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join("；", values);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    //融合结果中间载体
    private static final class MergeResult {
        private TriageSource source = TriageSource.RULE_ONLY;
        private String primary;
        private String primaryReason;
        private String aiReason;
        private UrgencyLevel urgency = UrgencyLevel.ROUTINE;
        private BigDecimal confidence = new BigDecimal("0.70");
        private List<DepartmentSuggestionItem> candidates = List.of();
        private List<String> reasons = List.of();
        private List<String> checkupSuggestions = List.of();
        private List<String> precautions = List.of();
        private final List<String> recommendedDepartments = new ArrayList<>();
    }
}
