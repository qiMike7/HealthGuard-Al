package com.example.selfhealthcare.exception;
//请求参数错误（400）
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
