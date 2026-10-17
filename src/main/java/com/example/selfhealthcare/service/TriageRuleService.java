package com.example.selfhealthcare.service;

import com.example.selfhealthcare.domain.Department;
import com.example.selfhealthcare.domain.Gender;
import com.example.selfhealthcare.domain.HealthAlert;
import com.example.selfhealthcare.domain.HealthRecord;
import com.example.selfhealthcare.domain.UrgencyLevel;
import com.example.selfhealthcare.domain.UserProfile;
import com.example.selfhealthcare.repository.DepartmentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

//规则分诊引擎：基于体检指标的确定性科室推荐，作为 AI 幻觉的兜底通道
@Service
public class TriageRuleService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal BMI_OVERWEIGHT = new BigDecimal("24.0");
    private static final BigDecimal BMI_OBESITY = new BigDecimal("28.0");
    private static final BigDecimal GLUCOSE_DIABETES = new BigDecimal("7.0");
    private static final BigDecimal GLUCOSE_SEVERE = new BigDecimal("11.1");
    private static final BigDecimal POST_MEAL_SEVERE = new BigDecimal("11.1");
    private static final BigDecimal OXYGEN_WARNING = new BigDecimal("95.0");
    private static final BigDecimal OXYGEN_CRITICAL = new BigDecimal("90.0");
    private static final BigDecimal CHOLESTEROL_WARNING = new BigDecimal("5.2");
    private static final BigDecimal CHOLESTEROL_HIGH = new BigDecimal("6.2");
    private static final BigDecimal WAIST_HIGH_MALE = new BigDecimal("90.0");
    private static final BigDecimal WAIST_HIGH_FEMALE = new BigDecimal("85.0");
    private static final BigDecimal ALT_AST_WARNING = new BigDecimal("50");
    private static final BigDecimal ALT_AST_HIGH = new BigDecimal("100");
    private static final BigDecimal CREATININE_WARNING = new BigDecimal("115");
    private static final BigDecimal CREATININE_HIGH = new BigDecimal("178");
    private static final BigDecimal URIC_ACID_WARNING = new BigDecimal("420");
    private static final BigDecimal URIC_ACID_HIGH = new BigDecimal("480");
    private static final BigDecimal HEMOGLOBIN_LOW = new BigDecimal("120");
    private static final BigDecimal HEMOGLOBIN_SEVERE = new BigDecimal("90");

    private static final String CARDIO = "心血管内科";
    private static final String ENDOCRINE = "内分泌科";
    private static final String RESPIRATORY = "呼吸内科";
    private static final String NUTRITION = "营养科";
    private static final String GASTROENTEROLOGY = "消化内科";
    private static final String NEPHROLOGY = "肾内科";
    private static final String EMERGENCY = "急诊科";
    private static final String FALLBACK = "中医科";

    private final DepartmentRepository departmentRepository;

    public TriageRuleService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    public RuleTriageResult triage(UserProfile profile, HealthRecord record, List<HealthAlert> alerts) {
        Map<String, UrgencyLevel> departmentUrgency = new LinkedHashMap<>();
        List<String> reasons = new ArrayList<>();

        if (record != null) {
            assessPressure(record, departmentUrgency, reasons);
            assessGlucose(record, departmentUrgency, reasons);
            assessOxygen(record, departmentUrgency, reasons);
            assessCholesterol(record, departmentUrgency, reasons);
            assessWeight(profile, record, departmentUrgency, reasons);
            assessLabIndicators(record, departmentUrgency, reasons);
        }

        if (alerts != null) {
            for (HealthAlert alert : alerts) {
                if (alert.getSeverity() != null
                        && (alert.getSeverity().name().equals("CRITICAL") || alert.getSeverity().name().equals("HIGH"))) {
                    escalate(departmentUrgency, CARDIO, UrgencyLevel.URGENT);
                }
            }
        }

        matchSymptomKeywords(record, departmentUrgency, reasons);

        return buildResult(departmentUrgency, reasons);
    }

    private void assessPressure(HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        Integer systolic = record.getSystolicPressure();
        Integer diastolic = record.getDiastolicPressure();
        if (systolic == null && diastolic == null) {
            return;
        }
        if ((systolic != null && systolic >= 180) || (diastolic != null && diastolic >= 120)) {
            escalate(map, CARDIO, UrgencyLevel.EMERGENCY);
            reasons.add("血压达到危险值（" + systolic + "/" + diastolic + " mmHg），存在高血压危象风险，建议尽快心血管内科就诊。");
        } else if ((systolic != null && systolic >= 140) || (diastolic != null && diastolic >= 90)) {
            escalate(map, CARDIO, UrgencyLevel.URGENT);
            reasons.add("血压偏高（" + systolic + "/" + diastolic + " mmHg），建议心血管内科评估。");
        } else if ((systolic != null && systolic >= 130) || (diastolic != null && diastolic >= 85)) {
            escalate(map, CARDIO, UrgencyLevel.ROUTINE);
            reasons.add("血压处于临界范围，建议心血管内科随访观察。");
        }
    }

    private void assessGlucose(HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        BigDecimal fasting = record.getFastingBloodSugar();
        if (fasting != null) {
            if (fasting.compareTo(GLUCOSE_SEVERE) >= 0) {
                escalate(map, ENDOCRINE, UrgencyLevel.URGENT);
                reasons.add("空腹血糖显著升高（" + fasting + " mmol/L），建议尽快内分泌科完善检查。");
            } else if (fasting.compareTo(GLUCOSE_DIABETES) >= 0) {
                escalate(map, ENDOCRINE, UrgencyLevel.ROUTINE);
                reasons.add("空腹血糖达到糖尿病风险区间（" + fasting + " mmol/L），建议内分泌科复测。");
            }
        }
        BigDecimal postMeal = record.getPostprandialBloodSugar();
        if (postMeal != null && postMeal.compareTo(POST_MEAL_SEVERE) >= 0) {
            escalate(map, ENDOCRINE, UrgencyLevel.URGENT);
            reasons.add("餐后血糖明显升高（" + postMeal + " mmol/L），建议内分泌科评估。");
        }
    }

    private void assessOxygen(HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        BigDecimal oxygen = record.getBloodOxygen();
        if (oxygen == null) {
            return;
        }
        if (oxygen.compareTo(OXYGEN_CRITICAL) < 0) {
            escalate(map, RESPIRATORY, UrgencyLevel.EMERGENCY);
            reasons.add("血氧饱和度偏低（" + oxygen + "%），存在缺氧风险，建议尽快呼吸内科就诊。");
        } else if (oxygen.compareTo(OXYGEN_WARNING) < 0) {
            escalate(map, RESPIRATORY, UrgencyLevel.URGENT);
            reasons.add("血氧低于理想范围（" + oxygen + "%），建议呼吸内科排查。");
        }
    }

    private void assessCholesterol(HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        BigDecimal cholesterol = record.getCholesterolTotal();
        if (cholesterol == null) {
            return;
        }
        if (cholesterol.compareTo(CHOLESTEROL_HIGH) >= 0) {
            escalate(map, CARDIO, UrgencyLevel.URGENT);
            escalate(map, ENDOCRINE, UrgencyLevel.ROUTINE);
            reasons.add("总胆固醇明显升高（" + cholesterol + " mmol/L），建议心血管内科/内分泌科评估血脂与代谢。");
        } else if (cholesterol.compareTo(CHOLESTEROL_WARNING) >= 0) {
            escalate(map, NUTRITION, UrgencyLevel.ROUTINE);
            reasons.add("总胆固醇偏高（" + cholesterol + " mmol/L），建议营养科指导饮食结构调整。");
        }
    }

    private void assessWeight(UserProfile profile, HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        BigDecimal bmi = resolveBmi(profile, record);
        if (bmi != null) {
            if (bmi.compareTo(BMI_OBESITY) >= 0) {
                escalate(map, NUTRITION, UrgencyLevel.ROUTINE);
                escalate(map, ENDOCRINE, UrgencyLevel.ROUTINE);
                reasons.add("BMI " + bmi + " 提示肥胖，建议营养科与内分泌科联合评估。");
            } else if (bmi.compareTo(BMI_OVERWEIGHT) >= 0) {
                escalate(map, NUTRITION, UrgencyLevel.ROUTINE);
                reasons.add("BMI " + bmi + " 提示超重，建议营养科制定减重方案。");
            }
        }

        BigDecimal waist = record.getWaistCircumferenceCm();
        Gender gender = profile == null ? null : profile.getGender();
        if (waist != null && gender != null) {
            BigDecimal threshold = gender == Gender.MALE ? WAIST_HIGH_MALE : WAIST_HIGH_FEMALE;
            if (waist.compareTo(threshold) >= 0) {
                escalate(map, NUTRITION, UrgencyLevel.ROUTINE);
                reasons.add("腰围 " + waist + " cm 提示中心性肥胖风险，建议营养科干预。");
            }
        }
    }

    private void assessLabIndicators(HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        // 肝功能 → 消化内科
        BigDecimal alt = record.getAlt();
        BigDecimal ast = record.getAst();
        boolean liverAbnormal = (alt != null && alt.compareTo(ALT_AST_WARNING) >= 0)
                || (ast != null && ast.compareTo(ALT_AST_WARNING) >= 0);
        if (liverAbnormal) {
            boolean severe = (alt != null && alt.compareTo(ALT_AST_HIGH) >= 0)
                    || (ast != null && ast.compareTo(ALT_AST_HIGH) >= 0);
            escalate(map, GASTROENTEROLOGY, severe ? UrgencyLevel.URGENT : UrgencyLevel.ROUTINE);
            reasons.add(severe
                    ? "转氨酶明显升高，提示肝功能受损，建议尽快消化内科复查。"
                    : "转氨酶轻度升高，建议消化内科随访并排查脂肪肝、饮酒等因素。");
        }

        // 肾功能 / 尿酸 → 肾内科
        BigDecimal creatinine = record.getCreatinine();
        BigDecimal uricAcid = record.getUricAcid();
        if ((creatinine != null && creatinine.compareTo(CREATININE_HIGH) >= 0)
                || (uricAcid != null && uricAcid.compareTo(URIC_ACID_HIGH) >= 0)) {
            escalate(map, NEPHROLOGY, UrgencyLevel.URGENT);
            reasons.add("肌酐或尿酸明显升高，提示肾功能或代谢异常，建议肾内科进一步评估。");
        } else if ((creatinine != null && creatinine.compareTo(CREATININE_WARNING) >= 0)
                || (uricAcid != null && uricAcid.compareTo(URIC_ACID_WARNING) >= 0)) {
            escalate(map, NEPHROLOGY, UrgencyLevel.ROUTINE);
            reasons.add("肌酐或尿酸轻度偏高，建议肾内科随访并多饮水、控制饮食。");
        }

        // 血常规（贫血）→ 急诊科 / 营养科
        BigDecimal hemoglobin = record.getHemoglobin();
        if (hemoglobin != null && hemoglobin.compareTo(HEMOGLOBIN_LOW) < 0) {
            if (hemoglobin.compareTo(HEMOGLOBIN_SEVERE) < 0) {
                escalate(map, EMERGENCY, UrgencyLevel.URGENT);
                reasons.add("血红蛋白明显偏低提示中度以上贫血，建议尽快就诊查明原因。");
            } else {
                escalate(map, NUTRITION, UrgencyLevel.ROUTINE);
                reasons.add("血红蛋白偏低提示轻度贫血，建议营养科评估并加强铁与蛋白摄入。");
            }
        }
    }

    private void matchSymptomKeywords(HealthRecord record, Map<String, UrgencyLevel> map, List<String> reasons) {
        String symptoms = record == null ? null : record.getSymptoms();
        if (symptoms == null || symptoms.isBlank()) {
            return;
        }
        String normalized = symptoms.toLowerCase();
        for (Department department : departmentRepository.findAll()) {
            String keywords = department.getKeywords();
            if (keywords == null || keywords.isBlank()) {
                continue;
            }
            for (String keyword : keywords.split(",")) {
                String trimmed = keyword.trim();
                if (!trimmed.isEmpty() && normalized.contains(trimmed.toLowerCase())) {
                    escalate(map, department.getName(), UrgencyLevel.ROUTINE);
                    reasons.add("症状描述命中「" + trimmed + "」，与" + department.getName() + "诊疗范围相关。");
                    break;
                }
            }
        }
    }

    private RuleTriageResult buildResult(Map<String, UrgencyLevel> map, List<String> reasons) {
        if (map.isEmpty()) {
            return new RuleTriageResult(
                    FALLBACK,
                    List.of(),
                    UrgencyLevel.ROUTINE,
                    List.of("本次体检指标未见明显异常，建议保持规律作息并按期常规体检随访。"));
        }

        List<Map.Entry<String, UrgencyLevel>> sorted = new ArrayList<>(map.entrySet());
        sorted.sort(Comparator.comparingInt((Map.Entry<String, UrgencyLevel> e) -> e.getValue().getWeight()).reversed());

        String primary = sorted.getFirst().getKey();
        UrgencyLevel urgency = sorted.getFirst().getValue();
        List<String> candidates = sorted.stream()
                .skip(1)
                .limit(2)
                .map(Map.Entry::getKey)
                .toList();

        List<String> distinctReasons = reasons.stream().distinct().toList();
        return new RuleTriageResult(primary, candidates, urgency, distinctReasons);
    }

    private BigDecimal resolveBmi(UserProfile profile, HealthRecord record) {
        if (record.getBmi() != null) {
            return record.getBmi().setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal weight = record.getWeightKg();
        BigDecimal height = profile == null ? null : profile.getHeightCm();
        if (weight == null || height == null || height.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal heightMeter = height.divide(HUNDRED, 4, RoundingMode.HALF_UP);
        return weight.divide(heightMeter.multiply(heightMeter), 2, RoundingMode.HALF_UP);
    }

    private void escalate(Map<String, UrgencyLevel> map, String department, UrgencyLevel urgency) {
        map.merge(department, urgency, (existing, incoming) ->
                incoming.getWeight() > existing.getWeight() ? incoming : existing);
    }

    public record RuleTriageResult(
            String primaryDepartment,
            List<String> candidateDepartments,
            UrgencyLevel urgency,
            List<String> reasons) {
    }
}
