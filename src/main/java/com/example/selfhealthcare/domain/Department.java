package com.example.selfhealthcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "department")//科室知识库表
public class Department extends BaseEntity {

    @Column(nullable = false, unique = true, length = 60)
    private String name;

    @Column(length = 500)
    private String keywords;

    @Column(length = 500)
    private String relatedIndicators;

    @Column(length = 1000)
    private String indications;

    @Column(length = 1000)
    private String visitNotice;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getKeywords() {
        return keywords;
    }

    public void setKeywords(String keywords) {
        this.keywords = keywords;
    }

    public String getRelatedIndicators() {
        return relatedIndicators;
    }

    public void setRelatedIndicators(String relatedIndicators) {
        this.relatedIndicators = relatedIndicators;
    }

    public String getIndications() {
        return indications;
    }

    public void setIndications(String indications) {
        this.indications = indications;
    }

    public String getVisitNotice() {
        return visitNotice;
    }

    public void setVisitNotice(String visitNotice) {
        this.visitNotice = visitNotice;
    }
}
