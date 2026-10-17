package com.example.selfhealthcare.domain;

public enum DoctorTitle {
    CHIEF("主任医师"),
    DEPUTY_CHIEF("副主任医师"),
    ATTENDING("主治医师"),
    PHYSICIAN("医师");

    private final String label;

    DoctorTitle(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
