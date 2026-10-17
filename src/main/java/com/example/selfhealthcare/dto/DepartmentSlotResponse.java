package com.example.selfhealthcare.dto;

import java.util.List;

//按科室聚合的医生与号源
public record DepartmentSlotResponse(
        Long departmentId,
        String departmentName,
        String visitNotice,
        List<DoctorSlotGroup> doctors) {
}
