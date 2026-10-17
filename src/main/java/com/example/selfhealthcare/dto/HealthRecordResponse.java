package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.HealthRecord;
import com.example.selfhealthcare.domain.RiskLevel;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record HealthRecordResponse(
        Long id,
        LocalDate recordDate,
        BigDecimal weightKg,
        BigDecimal waistCircumferenceCm,
        Integer systolicPressure,
        Integer diastolicPressure,
        Integer heartRate,
        BigDecimal fastingBloodSugar,
        BigDecimal postprandialBloodSugar,
        BigDecimal bodyTemperature,
        BigDecimal bloodOxygen,
        BigDecimal cholesterolTotal,
        BigDecimal bmi,
        BigDecimal triglyceride,
        BigDecimal ldlCholesterol,
        BigDecimal hdlCholesterol,
        BigDecimal alt,
        BigDecimal ast,
        BigDecimal creatinine,
        BigDecimal uricAcid,
        BigDecimal bloodUreaNitrogen,
        BigDecimal hemoglobin,
        BigDecimal whiteBloodCell,
        String symptoms,
        String medicationTaken,
        RiskLevel riskLevel,
        Integer riskScore,
        String summary,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static HealthRecordResponse from(HealthRecord record) {
        return new HealthRecordResponse(
                record.getId(),
                record.getRecordDate(),
                record.getWeightKg(),
                record.getWaistCircumferenceCm(),
                record.getSystolicPressure(),
                record.getDiastolicPressure(),
                record.getHeartRate(),
                record.getFastingBloodSugar(),
                record.getPostprandialBloodSugar(),
                record.getBodyTemperature(),
                record.getBloodOxygen(),
                record.getCholesterolTotal(),
                record.getBmi(),
                record.getTriglyceride(),
                record.getLdlCholesterol(),
                record.getHdlCholesterol(),
                record.getAlt(),
                record.getAst(),
                record.getCreatinine(),
                record.getUricAcid(),
                record.getBloodUreaNitrogen(),
                record.getHemoglobin(),
                record.getWhiteBloodCell(),
                record.getSymptoms(),
                record.getMedicationTaken(),
                record.getRiskLevel(),
                record.getRiskScore(),
                record.getSummary(),
                record.getNotes(),
                record.getCreatedAt(),
                record.getUpdatedAt());
    }
}
