package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.DoctorTitle;
import java.math.BigDecimal;
import java.util.List;

//按医生聚合的可预约号源
public record DoctorSlotGroup(
        Long doctorId,
        String doctorName,
        DoctorTitle title,
        String titleLabel,
        String hospitalName,
        String specialty,
        BigDecimal registrationFee,
        List<SlotOptionResponse> slots) {
}
