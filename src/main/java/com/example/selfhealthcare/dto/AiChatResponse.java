package com.example.selfhealthcare.dto;

import java.time.LocalDateTime;

//AI 医生对话的单条回复
public record AiChatResponse(
        String model,
        String reply,
        String disclaimer,
        LocalDateTime generatedAt) {
}
