package com.example.selfhealthcare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

//AI 医生对话的单条消息（role 取 user 或 assistant）
public record AiChatMessage(
        @NotBlank(message = "消息角色不能为空")
        @Size(max = 16, message = "消息角色长度不合法")
        String role,
        @NotBlank(message = "消息内容不能为空")
        @Size(max = 2000, message = "单条消息长度不能超过2000个字符")
        String content) {
}
