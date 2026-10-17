package com.example.selfhealthcare.domain;

public enum TriageSource {
    AI_HYBRID("AI+规则双通道"),
    AI_ONLY("AI 分诊"),
    RULE_ONLY("规则分诊");

    private final String label;

    TriageSource(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
