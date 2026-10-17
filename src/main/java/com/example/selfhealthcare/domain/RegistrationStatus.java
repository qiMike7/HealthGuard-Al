package com.example.selfhealthcare.domain;

public enum RegistrationStatus {
    RECOMMENDED("待确认"),
    REGISTERED("已预约"),
    COMPLETED("已完成"),
    CANCELLED("已取消");

    private final String label;

    RegistrationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
