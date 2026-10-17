package com.example.selfhealthcare.service;

import com.example.selfhealthcare.domain.AppUser;
import com.example.selfhealthcare.domain.Doctor;
import com.example.selfhealthcare.domain.RegistrationOrder;
import com.example.selfhealthcare.domain.RegistrationSlot;
import com.example.selfhealthcare.domain.RegistrationStatus;
import com.example.selfhealthcare.dto.PagedResponse;
import com.example.selfhealthcare.dto.RegistrationFeedbackRequest;
import com.example.selfhealthcare.dto.RegistrationOrderResponse;
import com.example.selfhealthcare.dto.RegistrationStatsResponse;
import com.example.selfhealthcare.exception.BadRequestException;
import com.example.selfhealthcare.exception.NotFoundException;
import com.example.selfhealthcare.repository.RegistrationOrderRepository;
import com.example.selfhealthcare.repository.RegistrationSlotRepository;
import com.example.selfhealthcare.util.PagingSupport;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

//挂号单业务：号源确认、取消、完成、反馈与统计
@Service
public class RegistrationService {

    private final RegistrationOrderRepository registrationOrderRepository;
    private final RegistrationSlotRepository registrationSlotRepository;
    private final AuthService authService;

    public RegistrationService(
            RegistrationOrderRepository registrationOrderRepository,
            RegistrationSlotRepository registrationSlotRepository,
            AuthService authService) {
        this.registrationOrderRepository = registrationOrderRepository;
        this.registrationSlotRepository = registrationSlotRepository;
        this.authService = authService;
    }

    @Transactional
    public RegistrationOrderResponse confirmSlot(Long orderId, Long slotId) {
        RegistrationOrder order = findOwnedOrder(orderId);
        if (order.getStatus() != RegistrationStatus.RECOMMENDED) {
            throw new BadRequestException("该推荐单已处理，无法重复预约");
        }
        if (slotId == null) {
            throw new BadRequestException("请选择要预约的号源");
        }

        RegistrationSlot slot = registrationSlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("未找到对应的号源"));
        if (slot.getRemainingSlots() == null || slot.getRemainingSlots() <= 0) {
            throw new BadRequestException("该号源已约满，请选择其它时段");
        }

        Doctor doctor = slot.getDoctor();
        slot.setRemainingSlots(slot.getRemainingSlots() - 1);
        registrationSlotRepository.save(slot);

        order.setDoctor(doctor);
        order.setSlot(slot);
        order.setDepartment(doctor.getDepartment());
        order.setAppointmentDate(slot.getDate());
        order.setStatus(RegistrationStatus.REGISTERED);
        return RegistrationOrderResponse.from(registrationOrderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public PagedResponse<RegistrationOrderResponse> listOrders(int page, int size, RegistrationStatus status) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        int normalizedPage = PagingSupport.normalizePage(page);
        Pageable pageable = PageRequest.of(
                normalizedPage - 1,
                PagingSupport.normalizeSize(size),
                Sort.by(Sort.Order.desc("createdAt")));

        Page<RegistrationOrder> orders = status == null
                ? registrationOrderRepository.findByUserId(currentUser.getId(), pageable)
                : registrationOrderRepository.findByUserIdAndStatus(currentUser.getId(), status, pageable);

        return PagingSupport.toResponse(orders, normalizedPage, RegistrationOrderResponse::from);
    }

    @Transactional(readOnly = true)
    public RegistrationOrderResponse getOrder(Long id) {
        return RegistrationOrderResponse.from(findOwnedOrder(id));
    }

    @Transactional
    public RegistrationOrderResponse cancel(Long id) {
        RegistrationOrder order = findOwnedOrder(id);
        if (order.getStatus() != RegistrationStatus.REGISTERED) {
            throw new BadRequestException("仅已预约的挂号单可以取消");
        }
        RegistrationSlot slot = order.getSlot();
        if (slot != null) {
            slot.setRemainingSlots(Math.min(slot.getTotalSlots(), slot.getRemainingSlots() + 1));
            registrationSlotRepository.save(slot);
        }
        order.setStatus(RegistrationStatus.CANCELLED);
        return RegistrationOrderResponse.from(registrationOrderRepository.save(order));
    }

    @Transactional
    public RegistrationOrderResponse complete(Long id) {
        RegistrationOrder order = findOwnedOrder(id);
        if (order.getStatus() != RegistrationStatus.REGISTERED) {
            throw new BadRequestException("仅已预约的挂号单可以标记完成");
        }
        order.setStatus(RegistrationStatus.COMPLETED);
        return RegistrationOrderResponse.from(registrationOrderRepository.save(order));
    }

    @Transactional
    public RegistrationOrderResponse submitFeedback(Long id, RegistrationFeedbackRequest request) {
        RegistrationOrder order = findOwnedOrder(id);
        if (order.getStatus() != RegistrationStatus.COMPLETED) {
            throw new BadRequestException("仅已完成的挂号单可以提交反馈");
        }
        Integer rating = request.rating();
        if (rating == null || rating < 1 || rating > 5) {
            throw new BadRequestException("评分需在 1 到 5 之间");
        }
        order.setFeedbackRating(rating);
        order.setFeedbackComment(normalize(request.comment()));
        return RegistrationOrderResponse.from(registrationOrderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public RegistrationStatsResponse stats() {
        AppUser currentUser = authService.requireAuthenticatedUser();
        List<RegistrationOrder> orders = registrationOrderRepository.findByUserId(currentUser.getId());

        long recommended = countByStatus(orders, RegistrationStatus.RECOMMENDED);
        long registered = countByStatus(orders, RegistrationStatus.REGISTERED);
        long completed = countByStatus(orders, RegistrationStatus.COMPLETED);
        long cancelled = countByStatus(orders, RegistrationStatus.CANCELLED);

        List<RegistrationOrder> feedbackOrders = orders.stream()
                .filter(order -> order.getFeedbackRating() != null)
                .toList();
        long feedbackCount = feedbackOrders.size();

        BigDecimal averageRating = BigDecimal.ZERO;
        BigDecimal accuracyRate = BigDecimal.ZERO;
        if (feedbackCount > 0) {
            int sum = feedbackOrders.stream().mapToInt(RegistrationOrder::getFeedbackRating).sum();
            averageRating = BigDecimal.valueOf(sum)
                    .divide(BigDecimal.valueOf(feedbackCount), 2, RoundingMode.HALF_UP);
            long satisfied = feedbackOrders.stream().filter(order -> order.getFeedbackRating() >= 4).count();
            accuracyRate = BigDecimal.valueOf(satisfied * 100L)
                    .divide(BigDecimal.valueOf(feedbackCount), 2, RoundingMode.HALF_UP);
        }

        Map<String, Long> departmentCount = new LinkedHashMap<>();
        for (RegistrationOrder order : orders) {
            String name = order.getDepartment() == null ? "未知科室" : order.getDepartment().getName();
            departmentCount.merge(name, 1L, Long::sum);
        }

        List<RegistrationStatsResponse.CountItem> statusDistribution = List.of(
                new RegistrationStatsResponse.CountItem(RegistrationStatus.RECOMMENDED.getLabel(), recommended),
                new RegistrationStatsResponse.CountItem(RegistrationStatus.REGISTERED.getLabel(), registered),
                new RegistrationStatsResponse.CountItem(RegistrationStatus.COMPLETED.getLabel(), completed),
                new RegistrationStatsResponse.CountItem(RegistrationStatus.CANCELLED.getLabel(), cancelled));

        List<RegistrationStatsResponse.CountItem> departmentDistribution = departmentCount.entrySet().stream()
                .map(entry -> new RegistrationStatsResponse.CountItem(entry.getKey(), entry.getValue()))
                .toList();

        return new RegistrationStatsResponse(
                orders.size(),
                recommended,
                registered,
                completed,
                cancelled,
                feedbackCount,
                averageRating,
                accuracyRate,
                departmentDistribution,
                statusDistribution);
    }

    private long countByStatus(List<RegistrationOrder> orders, RegistrationStatus status) {
        return orders.stream().filter(order -> order.getStatus() == status).count();
    }

    private RegistrationOrder findOwnedOrder(Long id) {
        AppUser currentUser = authService.requireAuthenticatedUser();
        return registrationOrderRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new NotFoundException("未找到对应的挂号单"));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
