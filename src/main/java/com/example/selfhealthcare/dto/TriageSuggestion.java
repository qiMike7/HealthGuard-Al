package com.example.selfhealthcare.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

//DeepSeek 结构化分诊输出（严格 JSON 反序列化目标）
@JsonIgnoreProperties(ignoreUnknown = true)
public record TriageSuggestion(
        String primaryDepartment,
        String primaryReason,
        List<Alternative> alternativeDepartments,
        String urgency,
        List<String> checkupSuggestions,
        List<String> precautions,
        BigDecimal confidence) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Alternative(String department, String reason) {
    }
}
