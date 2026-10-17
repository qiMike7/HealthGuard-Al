package com.example.selfhealthcare.domain;

public enum SlotPeriod {
    MORNING("上午"),
    AFTERNOON("下午");

    private final String label;

    SlotPeriod(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
