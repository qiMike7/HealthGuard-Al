package com.example.selfhealthcare.domain;

public enum HospitalLevel {
    TIER3_A("三甲"),
    TIER3_B("三乙"),
    TIER2_A("二甲"),
    COMMUNITY("社区医院");

    private final String label;

    HospitalLevel(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
