package com.example.selfhealthcare.dto;

//挂号完成后的推荐准确性反馈
public record RegistrationFeedbackRequest(
        Integer rating,
        String comment) {
}
