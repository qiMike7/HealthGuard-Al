package com.example.selfhealthcare.dto;

import java.math.BigDecimal;
import java.util.List;

//挂号与推荐反馈统计
public record RegistrationStatsResponse(
        long total,
        long recommended,
        long registered,
        long completed,
        long cancelled,
        long feedbackCount,
        BigDecimal averageRating,
        BigDecimal accuracyRate,
        List<CountItem> departmentDistribution,
        List<CountItem> statusDistribution) {

    public record CountItem(String label, long count) {
    }
}
