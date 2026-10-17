package com.example.selfhealthcare.dto;

//推荐科室条目：source 标记依据来源（RULE / AI / BOTH）
public record DepartmentSuggestionItem(
        String department,
        String reason,
        String source) {
}
