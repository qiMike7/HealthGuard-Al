package com.example.selfhealthcare.service;

import com.example.selfhealthcare.domain.AlertSeverity;
import com.example.selfhealthcare.domain.Gender;
import com.example.selfhealthcare.domain.HealthRecord;
import com.example.selfhealthcare.domain.RiskLevel;
import com.example.selfhealthcare.domain.UserProfile;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
//风险等级评估
@Service
public class RiskAssessmentService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal BMI_WARNING = new BigDecimal("24.0");
    private static final BigDecimal BMI_HIGH = new BigDecimal("28.0");
    private static final BigDecimal TEMP_WARNING = new BigDecimal("37.3");
    private static final BigDecimal TEMP_CRITICAL = new BigDecimal("39.0");
    private static final BigDecimal GLUCOSE_WARNING = new BigDecimal("6.1");
    private static final BigDecimal GLUCOSE_HIGH = new BigDecimal("7.0");
    private static final BigDecimal GLUCOSE_CRITICAL = new BigDecimal("11.1");
    private static final BigDecimal OXYGEN_WARNING = new BigDecimal("95.0");
    private static final BigDecimal OXYGEN_CRITICAL = new BigDecimal("90.0");
    private static final BigDecimal CHOLESTEROL_WARNING = new BigDecimal("5.2");
    private static final BigDecimal CHOLESTEROL_HIGH = new BigDecimal("6.2");
    private static final BigDecimal TRIGLYCERIDE_WARNING = new BigDecimal("1.7");
    private static final BigDecimal TRIGLYCERIDE_HIGH = new BigDecimal("2.3");
    private static final BigDecimal LDL_WARNING = new BigDecimal("3.4");
    private static final BigDecimal LDL_HIGH = new BigDecimal("4.1");
    private static final BigDecimal HDL_LOW = new BigDecimal("1.0");
    private static final BigDecimal ALT_AST_WARNING = new BigDecimal("50");
    private static final BigDecimal ALT_AST_HIGH = new BigDecimal("100");
    private static final BigDecimal CREATININE_WARNING = new BigDecimal("115");
    private static final BigDecimal CREATININE_HIGH = new BigDecimal("178");
    private static final BigDecimal URIC_ACID_WARNING = new BigDecimal("420");
    private static final BigDecimal URIC_ACID_HIGH = new BigDecimal("480");
    private static final BigDecimal HEMOGLOBIN_WARNING = new BigDecimal("120");
    private static final BigDecimal HEMOGLOBIN_SEVERE = new BigDecimal("90");
    private static final BigDecimal WBC_LOW = new BigDecimal("3.5");
    private static final BigDecimal WBC_HIGH = new BigDecimal("9.5");
    private static final BigDecimal POST_MEAL_GLUCOSE_WARNING = new BigDecimal("7.8");
    private static final BigDecimal POST_MEAL_GLUCOSE_HIGH = new BigDecimal("11.1");
    private static final BigDecimal WAIST_HIGH_MALE = new BigDecimal("90.0");
    private static final BigDecimal WAIST_HIGH_FEMALE = new BigDecimal("85.0");

    public AssessmentResult assess(UserProfile profile, HealthRecord record) {
        List<AlertDraft> alerts = new ArrayList<>();
        int score = 0;

        BigDecimal bmi = calculateBmi(record.getWeightKg(), profile == null ? null : profile.getHeightCm());
        if (bmi != null) {
            BigDecimal roundedBmi = bmi.setScale(2, RoundingMode.HALF_UP);
            if (roundedBmi.compareTo(BMI_HIGH) >= 0) {
                alerts.add(new AlertDraft("体重管理", "肥胖风险升高", "BMI " + roundedBmi,
                        "建议尽快调整饮食结构并增加有氧运动频率，必要时咨询营养或内分泌门诊。", AlertSeverity.HIGH));
                score += 2;
            } else if (roundedBmi.compareTo(BMI_WARNING) >= 0) {
                alerts.add(new AlertDraft("体重管理", "超重趋势", "BMI " + roundedBmi,
                        "建议控制高糖高脂摄入，每周保持至少150分钟中等强度运动。", AlertSeverity.MEDIUM));
                score += 1;
            }
            bmi = roundedBmi;
        }

        Integer systolic = record.getSystolicPressure();
        Integer diastolic = record.getDiastolicPressure();
        if (systolic != null || diastolic != null) {
            if ((systolic != null && systolic >= 180) || (diastolic != null && diastolic >= 120)) {
                alerts.add(new AlertDraft("血压风险", "血压达到危险值", describePressure(systolic, diastolic),
                        "存在高血压危象风险，建议立即复测并尽快前往医院评估。", AlertSeverity.CRITICAL));
                score += 3;
            } else if ((systolic != null && systolic >= 140) || (diastolic != null && diastolic >= 90)) {
                alerts.add(new AlertDraft("血压风险", "高血压风险较高", describePressure(systolic, diastolic),
                        "建议连续监测近一周血压，减少盐分摄入并评估是否需要心血管专科随访。", AlertSeverity.HIGH));
                score += 2;
            } else if ((systolic != null && systolic >= 130) || (diastolic != null && diastolic >= 85)) {
                alerts.add(new AlertDraft("血压风险", "血压偏高", describePressure(systolic, diastolic),
                        "建议控制熬夜和压力，减少高盐饮食，并继续观察血压变化。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal glucose = record.getFastingBloodSugar();
        if (glucose != null) {
            if (glucose.compareTo(GLUCOSE_CRITICAL) >= 0) {
                alerts.add(new AlertDraft("血糖风险", "血糖显著升高", "空腹血糖 " + glucose + " mmol/L",
                        "存在明显高血糖风险，建议尽快就医完善糖化血红蛋白和胰岛功能检查。", AlertSeverity.CRITICAL));
                score += 3;
            } else if (glucose.compareTo(GLUCOSE_HIGH) >= 0) {
                alerts.add(new AlertDraft("血糖风险", "糖尿病风险升高", "空腹血糖 " + glucose + " mmol/L",
                        "建议连续复测空腹血糖，控制精制碳水摄入并预约内分泌门诊。", AlertSeverity.HIGH));
                score += 2;
            } else if (glucose.compareTo(GLUCOSE_WARNING) >= 0) {
                alerts.add(new AlertDraft("血糖风险", "血糖处于临界范围", "空腹血糖 " + glucose + " mmol/L",
                        "建议改善饮食结构和运动习惯，按期复查空腹血糖。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal postMealGlucose = record.getPostprandialBloodSugar();
        if (postMealGlucose != null) {
            if (postMealGlucose.compareTo(POST_MEAL_GLUCOSE_HIGH) >= 0) {
                alerts.add(new AlertDraft("血糖风险", "餐后血糖显著升高", "餐后血糖 " + postMealGlucose + " mmol/L",
                        "建议结合饮食记录和空腹血糖进一步评估，必要时到内分泌门诊完善检查。", AlertSeverity.HIGH));
                score += 2;
            } else if (postMealGlucose.compareTo(POST_MEAL_GLUCOSE_WARNING) >= 0) {
                alerts.add(new AlertDraft("血糖风险", "餐后血糖偏高", "餐后血糖 " + postMealGlucose + " mmol/L",
                        "建议减少高糖高油食物摄入，关注饭后散步和规律运动。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal oxygen = record.getBloodOxygen();
        if (oxygen != null) {
            if (oxygen.compareTo(OXYGEN_CRITICAL) < 0) {
                alerts.add(new AlertDraft("呼吸风险", "血氧偏低", "血氧饱和度 " + oxygen + "%",
                        "建议尽快复测并观察呼吸困难情况，如持续下降需立即就医。", AlertSeverity.CRITICAL));
                score += 3;
            } else if (oxygen.compareTo(OXYGEN_WARNING) < 0) {
                alerts.add(new AlertDraft("呼吸风险", "血氧低于理想范围", "血氧饱和度 " + oxygen + "%",
                        "建议减少剧烈活动，排查呼吸道不适并持续监测。", AlertSeverity.HIGH));
                score += 2;
            }
        }

        BigDecimal cholesterol = record.getCholesterolTotal();
        if (cholesterol != null) {
            if (cholesterol.compareTo(CHOLESTEROL_HIGH) >= 0) {
                alerts.add(new AlertDraft("血脂风险", "血脂异常风险较高", "总胆固醇 " + cholesterol + " mmol/L",
                        "建议控制油脂和精制糖摄入，并评估是否需要进一步血脂谱检查。", AlertSeverity.HIGH));
                score += 2;
            } else if (cholesterol.compareTo(CHOLESTEROL_WARNING) >= 0) {
                alerts.add(new AlertDraft("血脂风险", "血脂偏高", "总胆固醇 " + cholesterol + " mmol/L",
                        "建议优化饮食结构，增加膳食纤维和规律运动。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal waist = record.getWaistCircumferenceCm();
        if (profile != null && profile.getGender() != null && waist != null) {
            BigDecimal waistThreshold = profile.getGender() == Gender.MALE ? WAIST_HIGH_MALE : WAIST_HIGH_FEMALE;
            if (waist.compareTo(waistThreshold) >= 0) {
                alerts.add(new AlertDraft("体重管理", "中心性肥胖风险", "腰围 " + waist + " cm",
                        "腰围提示内脏脂肪堆积风险上升，建议控制精制碳水和夜宵，并增加持续性运动。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal triglyceride = record.getTriglyceride();
        if (triglyceride != null) {
            if (triglyceride.compareTo(TRIGLYCERIDE_HIGH) >= 0) {
                alerts.add(new AlertDraft("血脂风险", "甘油三酯显著升高", "甘油三酯 " + triglyceride + " mmol/L",
                        "建议低脂低糖饮食、限制饮酒，并评估是否需要降脂治疗。", AlertSeverity.HIGH));
                score += 2;
            } else if (triglyceride.compareTo(TRIGLYCERIDE_WARNING) >= 0) {
                alerts.add(new AlertDraft("血脂风险", "甘油三酯偏高", "甘油三酯 " + triglyceride + " mmol/L",
                        "建议减少精制糖与油脂摄入，增加有氧运动并按期复查血脂。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal ldl = record.getLdlCholesterol();
        if (ldl != null) {
            if (ldl.compareTo(LDL_HIGH) >= 0) {
                alerts.add(new AlertDraft("血脂风险", "低密度脂蛋白偏高", "LDL-C " + ldl + " mmol/L",
                        "低密度脂蛋白是动脉粥样硬化危险因素，建议评估降脂治疗并加强生活方式干预。", AlertSeverity.HIGH));
                score += 2;
            } else if (ldl.compareTo(LDL_WARNING) >= 0) {
                alerts.add(new AlertDraft("血脂风险", "低密度脂蛋白边缘升高", "LDL-C " + ldl + " mmol/L",
                        "建议控制饱和脂肪摄入，增加膳食纤维并定期复查血脂谱。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal hdl = record.getHdlCholesterol();
        if (hdl != null && hdl.compareTo(HDL_LOW) < 0) {
            alerts.add(new AlertDraft("血脂风险", "高密度脂蛋白偏低", "HDL-C " + hdl + " mmol/L",
                    "高密度脂蛋白偏低不利于心血管保护，建议增加有氧运动并控制体重。", AlertSeverity.MEDIUM));
            score += 1;
        }

        BigDecimal alt = record.getAlt();
        if (alt != null) {
            if (alt.compareTo(ALT_AST_HIGH) >= 0) {
                alerts.add(new AlertDraft("肝功能", "谷丙转氨酶明显升高", "ALT " + alt + " U/L",
                        "提示肝功能可能受损，建议避免饮酒与肝毒性药物，尽快复查并排查肝炎、脂肪肝。", AlertSeverity.HIGH));
                score += 2;
            } else if (alt.compareTo(ALT_AST_WARNING) >= 0) {
                alerts.add(new AlertDraft("肝功能", "谷丙转氨酶轻度升高", "ALT " + alt + " U/L",
                        "建议规律作息、避免熬夜与饮酒，择期复查肝功能。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal ast = record.getAst();
        if (ast != null && ast.compareTo(ALT_AST_WARNING) >= 0) {
            boolean astHigh = ast.compareTo(ALT_AST_HIGH) >= 0;
            alerts.add(new AlertDraft("肝功能", "谷草转氨酶升高", "AST " + ast + " U/L",
                    "谷草转氨酶升高多与肝脏或心肌受损相关，建议结合ALT复查并评估诱因。",
                    astHigh ? AlertSeverity.HIGH : AlertSeverity.MEDIUM));
            score += astHigh ? 2 : 1;
        }

        BigDecimal creatinine = record.getCreatinine();
        if (creatinine != null) {
            if (creatinine.compareTo(CREATININE_HIGH) >= 0) {
                alerts.add(new AlertDraft("肾功能", "肌酐明显升高", "肌酐 " + creatinine + " μmol/L",
                        "提示肾功能可能受损，建议尽快肾内科复查肾功能与尿常规。", AlertSeverity.HIGH));
                score += 2;
            } else if (creatinine.compareTo(CREATININE_WARNING) >= 0) {
                alerts.add(new AlertDraft("肾功能", "肌酐偏高", "肌酐 " + creatinine + " μmol/L",
                        "建议多饮水、避免肾毒性药物，并定期复查肾功能。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal uricAcid = record.getUricAcid();
        if (uricAcid != null) {
            if (uricAcid.compareTo(URIC_ACID_HIGH) >= 0) {
                alerts.add(new AlertDraft("肾功能", "尿酸显著升高", "尿酸 " + uricAcid + " μmol/L",
                        "高尿酸增加痛风与肾损害风险，建议低嘌呤饮食、多饮水并评估降尿酸治疗。", AlertSeverity.HIGH));
                score += 2;
            } else if (uricAcid.compareTo(URIC_ACID_WARNING) >= 0) {
                alerts.add(new AlertDraft("肾功能", "尿酸偏高", "尿酸 " + uricAcid + " μmol/L",
                        "建议减少海鲜、动物内脏与啤酒摄入，多饮水并定期复查。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal hemoglobin = record.getHemoglobin();
        if (hemoglobin != null) {
            if (hemoglobin.compareTo(HEMOGLOBIN_SEVERE) < 0) {
                alerts.add(new AlertDraft("血常规", "血红蛋白明显偏低", "血红蛋白 " + hemoglobin + " g/L",
                        "提示中度以上贫血，建议尽快就诊查明贫血原因（缺铁、慢病或失血等）。", AlertSeverity.HIGH));
                score += 2;
            } else if (hemoglobin.compareTo(HEMOGLOBIN_WARNING) < 0) {
                alerts.add(new AlertDraft("血常规", "血红蛋白偏低", "血红蛋白 " + hemoglobin + " g/L",
                        "提示轻度贫血，建议加强铁与蛋白摄入并结合临床复查血常规。", AlertSeverity.MEDIUM));
                score += 1;
            }
        }

        BigDecimal wbc = record.getWhiteBloodCell();
        if (wbc != null && (wbc.compareTo(WBC_LOW) < 0 || wbc.compareTo(WBC_HIGH) > 0)) {
            boolean extreme = wbc.compareTo(new BigDecimal("2.0")) < 0 || wbc.compareTo(new BigDecimal("15.0")) > 0;
            alerts.add(new AlertDraft("血常规", wbc.compareTo(WBC_LOW) < 0 ? "白细胞计数偏低" : "白细胞计数偏高",
                    "白细胞 " + wbc + " ×10⁹/L",
                    extreme ? "白细胞显著异常，可能与感染或血液系统疾病相关，建议尽快复查并就诊。"
                            : "白细胞轻度异常，建议结合症状与体温复查血常规。",
                    extreme ? AlertSeverity.HIGH : AlertSeverity.MEDIUM));
            score += extreme ? 2 : 1;
        }

        RiskLevel riskLevel = determineRiskLevel(alerts, score);
        String summary = buildSummary(alerts, riskLevel);
        return new AssessmentResult(riskLevel, score, bmi, summary, alerts);
    }

    private BigDecimal calculateBmi(BigDecimal weightKg, BigDecimal heightCm) {
        if (weightKg == null || heightCm == null || heightCm.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        // 防御：身高明显不合理（多为解析错误）时不计算，避免 BMI 溢出
        if (heightCm.compareTo(new BigDecimal("50")) < 0 || heightCm.compareTo(new BigDecimal("250")) > 0) {
            return null;
        }
        BigDecimal heightMeter = heightCm.divide(HUNDRED, 4, RoundingMode.HALF_UP);
        BigDecimal bmi = weightKg.divide(heightMeter.multiply(heightMeter), 2, RoundingMode.HALF_UP);
        // 防御：BMI 超出合理区间视为无效
        if (bmi.compareTo(new BigDecimal("5")) < 0 || bmi.compareTo(new BigDecimal("100")) > 0) {
            return null;
        }
        return bmi;
    }

    private RiskLevel determineRiskLevel(List<AlertDraft> alerts, int score) {
        AlertSeverity maxSeverity = alerts.stream()
                .map(AlertDraft::severity)
                .filter(Objects::nonNull)
                .max(Comparator.comparingInt(alert -> alert.toRiskLevel().getWeight()))
                .orElse(AlertSeverity.LOW);

        if (maxSeverity == AlertSeverity.CRITICAL) {
            return RiskLevel.CRITICAL;
        }
        if (maxSeverity == AlertSeverity.HIGH || score >= 5) {
            return RiskLevel.HIGH;
        }
        if (maxSeverity == AlertSeverity.MEDIUM || score >= 2) {
            return RiskLevel.MEDIUM;
        }
        return alerts.isEmpty() ? RiskLevel.LOW : RiskLevel.MEDIUM;
    }

    private String describePressure(Integer systolic, Integer diastolic) {
        if (systolic == null && diastolic == null) {
            return "血压数据缺失";
        }
        if (systolic == null) {
            return "舒张压 " + diastolic + " mmHg";
        }
        if (diastolic == null) {
            return "收缩压 " + systolic + " mmHg";
        }
        return systolic + "/" + diastolic + " mmHg";
    }

    private String buildSummary(List<AlertDraft> alerts, RiskLevel riskLevel) {
        if (alerts.isEmpty()) {
            return "本次健康指标整体平稳，建议保持规律作息、均衡饮食和持续记录。";
        }
        String topics = alerts.stream()
                .map(AlertDraft::category)
                .distinct()
                .limit(3)
                .reduce((left, right) -> left + "、" + right)
                .orElse("多项指标");
        return "系统识别为" + riskLevel.getLabel() + "，重点关注" + topics + "等问题，建议根据预警建议尽快干预。";
    }

    public record AssessmentResult(
            RiskLevel riskLevel,
            int riskScore,
            BigDecimal bmi,
            String summary,
            List<AlertDraft> alerts) {
    }

    public record AlertDraft(
            String category,
            String title,
            String indicator,
            String suggestion,
            AlertSeverity severity) {
    }
}
