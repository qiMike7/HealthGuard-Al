package com.example.selfhealthcare.exception;
//文档导入失败
public class ImportProcessingException extends RuntimeException {

    public ImportProcessingException(String message) {
        super(message);
    }

    public ImportProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
