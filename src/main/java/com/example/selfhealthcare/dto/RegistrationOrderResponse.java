package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.Doctor;
import com.example.selfhealthcare.domain.RegistrationOrder;
import com.example.selfhealthcare.domain.RegistrationSlot;
import com.example.selfhealthcare.domain.RegistrationStatus;
import com.example.selfhealthcare.domain.TriageSource;
import com.example.selfhealthcare.domain.UrgencyLevel;
import java.time.LocalDate;
import java.time.LocalDateTime;

//挂号单响应（需在事务内映射以加载懒加载关联）
public record RegistrationOrderResponse(
        Long id,
        Long recordId,
        String departmentName,
        String doctorName,
        String doctorTitleLabel,
        String hospitalName,
        LocalDate appointmentDate,
        String periodLabel,
        UrgencyLevel urgency,
        String urgencyLabel,
        RegistrationStatus status,
        String statusLabel,
        TriageSource triageSource,
        String primaryReason,
        String aiReason,
        String checkupSuggestions,
        String precautions,
        Integer feedbackRating,
        String feedbackComment,
        LocalDateTime createdAt) {

    public static RegistrationOrderResponse from(RegistrationOrder order) {
        Doctor doctor = order.getDoctor();
        RegistrationSlot slot = order.getSlot();
        return new RegistrationOrderResponse(
                order.getId(),
                order.getHealthRecord() == null ? null : order.getHealthRecord().getId(),
                order.getDepartment() == null ? null : order.getDepartment().getName(),
                doctor == null ? null : doctor.getName(),
                doctor == null || doctor.getTitle() == null ? null : doctor.getTitle().getLabel(),
                doctor == null || doctor.getHospital() == null ? null : doctor.getHospital().getName(),
                slot == null ? order.getAppointmentDate() : slot.getDate(),
                slot == null || slot.getPeriod() == null ? null : slot.getPeriod().getLabel(),
                order.getUrgency(),
                order.getUrgency() == null ? null : order.getUrgency().getLabel(),
                order.getStatus(),
                order.getStatus() == null ? null : order.getStatus().getLabel(),
                order.getTriageSource(),
                order.getPrimaryReason(),
                order.getAiReason(),
                order.getCheckupSuggestions(),
                order.getPrecautions(),
                order.getFeedbackRating(),
                order.getFeedbackComment(),
                order.getCreatedAt());
    }
}
