package com.example.selfhealthcare.exception;
//未授权（401）
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
