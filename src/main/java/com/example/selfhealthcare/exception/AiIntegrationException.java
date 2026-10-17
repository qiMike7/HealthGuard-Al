package com.example.selfhealthcare.exception;
//AI 服务调用失败
public class AiIntegrationException extends RuntimeException {

    public AiIntegrationException(String message) {
        super(message);
    }

    public AiIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
