package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.RegistrationOrder;
import com.example.selfhealthcare.domain.RegistrationSlot;
import java.time.LocalDate;

//首页就诊提醒：用户最近一个即将到来的已预约号源
public record UpcomingRegistrationResponse(
        Long id,
        String departmentName,
        String doctorName,
        LocalDate appointmentDate,
        String periodLabel,
        long upcomingCount) {

    public static UpcomingRegistrationResponse from(RegistrationOrder order, long upcomingCount) {
        RegistrationSlot slot = order.getSlot();
        return new UpcomingRegistrationResponse(
                order.getId(),
                order.getDepartment() == null ? null : order.getDepartment().getName(),
                order.getDoctor() == null ? null : order.getDoctor().getName(),
                slot != null ? slot.getDate() : order.getAppointmentDate(),
                slot == null || slot.getPeriod() == null ? null : slot.getPeriod().getLabel(),
                upcomingCount);
    }
}
