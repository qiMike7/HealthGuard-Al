package com.example.selfhealthcare.service;

import com.example.selfhealthcare.domain.Department;
import com.example.selfhealthcare.domain.HealthAlert;
import com.example.selfhealthcare.domain.HealthRecord;
import com.example.selfhealthcare.domain.UserProfile;
import com.example.selfhealthcare.dto.TriageSuggestion;
import com.example.selfhealthcare.exception.AiIntegrationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

//DeepSeek 结构化分诊：把体检异常与档案交给大模型，要求返回严格 JSON 的挂号建议
@Service
public class DeepSeekTriageService {

    private static final String SCHEMA_HINT = """
            {
              "primaryDepartment": "string，首选科室，必须是候选科室列表中的名称",
              "primaryReason": "string，首选该科室的理由",
              "alternativeDepartments": [
                {"department": "string，备选科室，必须是候选科室列表中的名称", "reason": "string"}
              ],
              "urgency": "EMERGENCY | URGENT | ROUTINE 三选一",
              "checkupSuggestions": ["string，建议就诊时完善的检查项目"],
              "precautions": ["string，就诊前注意事项"],
              "confidence": 0.0
            }""";

    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final boolean enabled;

    public DeepSeekTriageService(
            ObjectMapper objectMapper,
            @Value("${deepseek.api-key:}") String apiKey,
            @Value("${deepseek.base-url:https://api.deepseek.com}") String baseUrl,
            @Value("${deepseek.model:deepseek-chat}") String model,
            @Value("${deepseek.enabled:false}") boolean enabled) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.enabled = enabled;
    }

    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public TriageSuggestion triage(UserProfile profile, HealthRecord record, List<HealthAlert> alerts, List<Department> departments) {
        if (!isAvailable()) {
            throw new AiIntegrationException("AI 分诊功能当前未启用或未配置 DeepSeek");
        }

        String systemPrompt = """
                你是一名医院门诊智能分诊助手，负责根据用户的体检异常指标与健康档案，推荐最合适的挂号科室。
                严格遵守：
                1. 只做科室分诊建议，不做疾病诊断，不替代医生。
                2. primaryDepartment 与 alternativeDepartments 中的科室名称，必须来自【候选科室列表】，不得杜撰。
                3. urgency 只能取 EMERGENCY（需急诊）/ URGENT（尽快就诊）/ ROUTINE（可择期）之一。
                4. 最多给出 2 个备选科室；若无明显必要可为空数组。
                5. 只输出一个符合给定 schema 的 JSON 对象，不要输出任何解释文字、不要用 markdown 代码块。
                输出 JSON 结构如下：
                """ + SCHEMA_HINT;

        String userContext = buildContext(profile, record, alerts, departments);

        String raw = callDeepSeek(systemPrompt, userContext, false);
        try {
            return parse(raw);
        } catch (Exception first) {
            // 解析失败重试一次，追加更严格的纯 JSON 指令
            String retry = callDeepSeek(systemPrompt, userContext, true);
            try {
                return parse(retry);
            } catch (Exception second) {
                throw new AiIntegrationException("DeepSeek 分诊结果无法解析为结构化 JSON，已降级为规则分诊", second);
            }
        }
    }

    private String buildContext(UserProfile profile, HealthRecord record, List<HealthAlert> alerts, List<Department> departments) {
        StringBuilder sb = new StringBuilder();

        sb.append("【用户档案（已脱敏，不含姓名）】\n");
        if (profile != null) {
            sb.append("性别：").append(profile.getGender() == null ? "-" : profile.getGender().getLabel()).append('\n');
            sb.append("年龄：").append(profile.getAge() == null ? "-" : profile.getAge()).append('\n');
            sb.append("身高/体重：").append(nz(profile.getHeightCm())).append(" cm / ").append(nz(profile.getWeightKg())).append(" kg\n");
            sb.append("慢性病史：").append(orDash(profile.getChronicDiseases())).append('\n');
            sb.append("家族病史：").append(orDash(profile.getFamilyHistory())).append('\n');
            sb.append("过敏史：").append(orDash(profile.getAllergies())).append('\n');
        } else {
            sb.append("（档案信息不足）\n");
        }

        if (record != null) {
            sb.append("\n【本次体检指标】\n");
            sb.append("日期：").append(record.getRecordDate()).append('\n');
            appendIfPresent(sb, "血压(mmHg)", pressure(record.getSystolicPressure(), record.getDiastolicPressure()));
            appendIfPresent(sb, "空腹血糖(mmol/L)", record.getFastingBloodSugar());
            appendIfPresent(sb, "餐后血糖(mmol/L)", record.getPostprandialBloodSugar());
            appendIfPresent(sb, "心率(次/分)", record.getHeartRate());
            appendIfPresent(sb, "血氧(%)", record.getBloodOxygen());
            appendIfPresent(sb, "体温(℃)", record.getBodyTemperature());
            appendIfPresent(sb, "总胆固醇(mmol/L)", record.getCholesterolTotal());
            appendIfPresent(sb, "BMI", record.getBmi());
            appendIfPresent(sb, "腰围(cm)", record.getWaistCircumferenceCm());
            appendIfPresent(sb, "甘油三酯(mmol/L)", record.getTriglyceride());
            appendIfPresent(sb, "低密度脂蛋白LDL-C(mmol/L)", record.getLdlCholesterol());
            appendIfPresent(sb, "高密度脂蛋白HDL-C(mmol/L)", record.getHdlCholesterol());
            appendIfPresent(sb, "谷丙转氨酶ALT(U/L)", record.getAlt());
            appendIfPresent(sb, "谷草转氨酶AST(U/L)", record.getAst());
            appendIfPresent(sb, "肌酐(μmol/L)", record.getCreatinine());
            appendIfPresent(sb, "尿酸(μmol/L)", record.getUricAcid());
            appendIfPresent(sb, "尿素氮(mmol/L)", record.getBloodUreaNitrogen());
            appendIfPresent(sb, "血红蛋白(g/L)", record.getHemoglobin());
            appendIfPresent(sb, "白细胞(×10⁹/L)", record.getWhiteBloodCell());
            appendIfPresent(sb, "症状主诉", record.getSymptoms());
            sb.append("系统风险等级：").append(record.getRiskLevel() == null ? "-" : record.getRiskLevel().getLabel()).append('\n');
            appendIfPresent(sb, "系统摘要", record.getSummary());
        }

        if (alerts != null && !alerts.isEmpty()) {
            sb.append("\n【已生成的健康预警】\n");
            for (HealthAlert alert : alerts) {
                sb.append("- [").append(alert.getSeverity()).append("] ")
                        .append(alert.getTitle());
                if (alert.getIndicator() != null) {
                    sb.append("（").append(alert.getIndicator()).append("）");
                }
                sb.append('\n');
            }
        }

        sb.append("\n【候选科室列表（只能从中选择科室名称）】\n");
        for (Department department : departments) {
            sb.append("- ").append(department.getName())
                    .append("：").append(department.getIndications() == null ? "" : department.getIndications())
                    .append('\n');
        }

        return sb.toString();
    }

    private String callDeepSeek(String systemPrompt, String userContext, boolean strictRetry) {
        String userMessage = strictRetry
                ? userContext + "\n\n再次强调：只输出纯 JSON 对象，不要有任何额外文字或代码块标记。"
                : userContext;

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)),
                "temperature", 0.2,
                "max_tokens", 800,
                "response_format", Map.of("type", "json_object"));

        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
                    .build();

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/chat/completions")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new AiIntegrationException("DeepSeek 未返回有效内容");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new AiIntegrationException("DeepSeek 分诊结果中没有可用的回答");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.getFirst().get("message");
            String content = message == null ? null : String.valueOf(message.get("content"));
            if (content == null || content.isBlank()) {
                throw new AiIntegrationException("DeepSeek 返回了空分诊结果");
            }
            return content;
        } catch (RestClientException exception) {
            throw new AiIntegrationException("调用 DeepSeek 分诊失败，请检查 API Key、网络或额度", exception);
        }
    }

    private TriageSuggestion parse(String raw) throws Exception {
        String json = stripFences(raw);
        return objectMapper.readValue(json, TriageSuggestion.class);
    }

    private String stripFences(String raw) {
        String text = raw.trim();
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            if (firstNewline > 0) {
                text = text.substring(firstNewline + 1);
            }
            int fenceEnd = text.lastIndexOf("```");
            if (fenceEnd >= 0) {
                text = text.substring(0, fenceEnd);
            }
            text = text.trim();
        }
        int braceStart = text.indexOf('{');
        int braceEnd = text.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            text = text.substring(braceStart, braceEnd + 1);
        }
        return text;
    }

    private void appendIfPresent(StringBuilder sb, String label, Object value) {
        if (value == null) {
            return;
        }
        if (value instanceof String str && str.isBlank()) {
            return;
        }
        sb.append(label).append("：").append(value).append('\n');
    }

    private String pressure(Integer systolic, Integer diastolic) {
        if (systolic == null && diastolic == null) {
            return null;
        }
        return nz(systolic) + "/" + nz(diastolic);
    }

    private String nz(Object value) {
        return value == null ? "-" : String.valueOf(value);
    }

    private String orDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
