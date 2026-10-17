package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.SlotPeriod;
import java.time.LocalDate;

//单个可预约号源
public record SlotOptionResponse(
        Long slotId,
        LocalDate date,
        SlotPeriod period,
        String periodLabel,
        Integer remaining,
        Integer total) {
}
