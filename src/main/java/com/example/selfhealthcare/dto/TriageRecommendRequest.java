package com.example.selfhealthcare.dto;

//分诊请求：recordId 可为空，为空时取用户最新一条健康记录
public record TriageRecommendRequest(
        Long recordId) {
}
