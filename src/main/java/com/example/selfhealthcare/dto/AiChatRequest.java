package com.example.selfhealthcare.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

//AI 医生多轮对话请求：携带最近的历史消息
public record AiChatRequest(
        Long focusRecordId,
        @Valid @NotEmpty(message = "对话内容不能为空")
        @Size(max = 20, message = "单次最多携带20条历史消息")
        List<AiChatMessage> messages) {
}
