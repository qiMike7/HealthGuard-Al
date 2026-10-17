package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.TriageSource;
import com.example.selfhealthcare.domain.UrgencyLevel;
import java.math.BigDecimal;
import java.util.List;

//智能分诊推荐响应（双通道融合结果 + 可预约号源）
public record TriageRecommendResponse(
        Long orderId,
        Long recordId,
        String primaryDepartment,
        String primaryReason,
        List<DepartmentSuggestionItem> candidateDepartments,
        UrgencyLevel urgency,
        String urgencyLabel,
        String emergencyNotice,
        String rulePrimary,
        String aiPrimary,
        List<String> reasons,
        String aiReason,
        List<String> checkupSuggestions,
        List<String> precautions,
        TriageSource triageSource,
        BigDecimal confidence,
        List<DepartmentSlotResponse> availableSlots,
        String disclaimer) {
}
