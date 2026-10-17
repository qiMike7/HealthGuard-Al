package com.example.selfhealthcare.domain;

public enum UrgencyLevel {
    EMERGENCY("急诊", 3),
    URGENT("尽快就诊", 2),
    ROUTINE("可择期", 1);

    private final String label;
    private final int weight;

    UrgencyLevel(String label, int weight) {
        this.label = label;
        this.weight = weight;
    }

    public String getLabel() {
        return label;
    }

    public int getWeight() {
        return weight;
    }
}
