package com.example.selfhealthcare.controller;

import com.example.selfhealthcare.domain.RegistrationStatus;
import com.example.selfhealthcare.dto.DepartmentOptionResponse;
import com.example.selfhealthcare.dto.PagedResponse;
import com.example.selfhealthcare.dto.RegistrationFeedbackRequest;
import com.example.selfhealthcare.dto.RegistrationOrderRequest;
import com.example.selfhealthcare.dto.RegistrationOrderResponse;
import com.example.selfhealthcare.dto.RegistrationStatsResponse;
import com.example.selfhealthcare.dto.TriageRecommendRequest;
import com.example.selfhealthcare.dto.TriageRecommendResponse;
import com.example.selfhealthcare.service.RegistrationService;
import com.example.selfhealthcare.service.TriageRecommendationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController//智能分诊与辅助挂号
public class TriageController {

    private final TriageRecommendationService triageRecommendationService;
    private final RegistrationService registrationService;

    public TriageController(
            TriageRecommendationService triageRecommendationService,
            RegistrationService registrationService) {
        this.triageRecommendationService = triageRecommendationService;
        this.registrationService = registrationService;
    }

    @PostMapping("/api/triage/recommend")
    public TriageRecommendResponse recommend(@RequestBody(required = false) TriageRecommendRequest request) {
        Long recordId = request == null ? null : request.recordId();
        return triageRecommendationService.recommend(recordId);
    }

    @GetMapping("/api/triage/departments")
    public List<DepartmentOptionResponse> listDepartments() {
        return triageRecommendationService.listDepartments();
    }

    @PostMapping("/api/registration/orders")
    public RegistrationOrderResponse confirmOrder(@Valid @RequestBody RegistrationOrderRequest request) {
        return registrationService.confirmSlot(request.orderId(), request.slotId());
    }

    @GetMapping("/api/registration/orders")
    public PagedResponse<RegistrationOrderResponse> listOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) RegistrationStatus status) {
        return registrationService.listOrders(page, size, status);
    }

    @GetMapping("/api/registration/orders/{id}")
    public RegistrationOrderResponse getOrder(@PathVariable Long id) {
        return registrationService.getOrder(id);
    }

    @PatchMapping("/api/registration/orders/{id}/cancel")
    public RegistrationOrderResponse cancelOrder(@PathVariable Long id) {
        return registrationService.cancel(id);
    }

    @PatchMapping("/api/registration/orders/{id}/complete")
    public RegistrationOrderResponse completeOrder(@PathVariable Long id) {
        return registrationService.complete(id);
    }

    @PostMapping("/api/registration/orders/{id}/feedback")
    public RegistrationOrderResponse submitFeedback(
            @PathVariable Long id, @Valid @RequestBody RegistrationFeedbackRequest request) {
        return registrationService.submitFeedback(id, request);
    }

    @GetMapping("/api/registration/stats")
    public RegistrationStatsResponse stats() {
        return registrationService.stats();
    }
}
