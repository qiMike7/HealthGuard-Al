package com.example.selfhealthcare.dto;

//基于推荐单确认号源，生成正式挂号单
public record RegistrationOrderRequest(
        Long orderId,
        Long slotId) {
}
