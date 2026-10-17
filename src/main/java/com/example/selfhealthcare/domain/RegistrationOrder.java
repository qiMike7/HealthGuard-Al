package com.example.selfhealthcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "registration_order")//挂号单表
public class RegistrationOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "health_record_id")
    private HealthRecord healthRecord;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id")
    private RegistrationSlot slot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UrgencyLevel urgency = UrgencyLevel.ROUTINE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RegistrationStatus status = RegistrationStatus.RECOMMENDED;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TriageSource triageSource;

    @Column(length = 500)
    private String ruleDepartments;

    @Column(length = 500)
    private String aiDepartments;

    @Column(length = 1000)
    private String primaryReason;

    @Column(length = 2000)
    private String aiReason;

    @Column(length = 1000)
    private String checkupSuggestions;

    @Column(length = 1000)
    private String precautions;

    @Column(length = 500)
    private String disclaimer;

    private LocalDate appointmentDate;

    private Integer feedbackRating;

    @Column(length = 500)
    private String feedbackComment;

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public HealthRecord getHealthRecord() {
        return healthRecord;
    }

    public void setHealthRecord(HealthRecord healthRecord) {
        this.healthRecord = healthRecord;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public void setDoctor(Doctor doctor) {
        this.doctor = doctor;
    }

    public RegistrationSlot getSlot() {
        return slot;
    }

    public void setSlot(RegistrationSlot slot) {
        this.slot = slot;
    }

    public UrgencyLevel getUrgency() {
        return urgency;
    }

    public void setUrgency(UrgencyLevel urgency) {
        this.urgency = urgency;
    }

    public RegistrationStatus getStatus() {
        return status;
    }

    public void setStatus(RegistrationStatus status) {
        this.status = status;
    }

    public TriageSource getTriageSource() {
        return triageSource;
    }

    public void setTriageSource(TriageSource triageSource) {
        this.triageSource = triageSource;
    }

    public String getRuleDepartments() {
        return ruleDepartments;
    }

    public void setRuleDepartments(String ruleDepartments) {
        this.ruleDepartments = ruleDepartments;
    }

    public String getAiDepartments() {
        return aiDepartments;
    }

    public void setAiDepartments(String aiDepartments) {
        this.aiDepartments = aiDepartments;
    }

    public String getPrimaryReason() {
        return primaryReason;
    }

    public void setPrimaryReason(String primaryReason) {
        this.primaryReason = primaryReason;
    }

    public String getAiReason() {
        return aiReason;
    }

    public void setAiReason(String aiReason) {
        this.aiReason = aiReason;
    }

    public String getCheckupSuggestions() {
        return checkupSuggestions;
    }

    public void setCheckupSuggestions(String checkupSuggestions) {
        this.checkupSuggestions = checkupSuggestions;
    }

    public String getPrecautions() {
        return precautions;
    }

    public void setPrecautions(String precautions) {
        this.precautions = precautions;
    }

    public String getDisclaimer() {
        return disclaimer;
    }

    public void setDisclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDate appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public Integer getFeedbackRating() {
        return feedbackRating;
    }

    public void setFeedbackRating(Integer feedbackRating) {
        this.feedbackRating = feedbackRating;
    }

    public String getFeedbackComment() {
        return feedbackComment;
    }

    public void setFeedbackComment(String feedbackComment) {
        this.feedbackComment = feedbackComment;
    }
}
