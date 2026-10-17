package com.example.selfhealthcare.dto;

import com.example.selfhealthcare.domain.Department;

//科室知识库条目（前端展示就诊须知用）
public record DepartmentOptionResponse(
        Long id,
        String name,
        String keywords,
        String indications,
        String visitNotice) {

    public static DepartmentOptionResponse from(Department department) {
        return new DepartmentOptionResponse(
                department.getId(),
                department.getName(),
                department.getKeywords(),
                department.getIndications(),
                department.getVisitNotice());
    }
}
