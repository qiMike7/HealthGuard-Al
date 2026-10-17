package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.RegistrationOrder;
import com.example.selfhealthcare.domain.RegistrationStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

//操作 registration_order 表
public interface RegistrationOrderRepository extends JpaRepository<RegistrationOrder, Long> {

    Page<RegistrationOrder> findByUserId(Long userId, Pageable pageable);

    Page<RegistrationOrder> findByUserIdAndStatus(Long userId, RegistrationStatus status, Pageable pageable);

    Optional<RegistrationOrder> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndStatus(Long userId, RegistrationStatus status);

    List<RegistrationOrder> findByUserIdAndStatus(Long userId, RegistrationStatus status);

    //即将就诊的已预约挂号单（按就诊日期升序）
    List<RegistrationOrder> findByUserIdAndStatusAndAppointmentDateGreaterThanEqualOrderByAppointmentDateAsc(
            Long userId, RegistrationStatus status, LocalDate fromDate);

    List<RegistrationOrder> findByUserId(Long userId);

    //引用指定体检记录的挂号单（删除记录前需解除引用）
    List<RegistrationOrder> findByHealthRecordId(Long healthRecordId);

    //清除某条记录对应的旧 RECOMMENDED 草稿单（重新分诊时复用，避免累积空白单）
    void deleteByUserIdAndHealthRecordIdAndStatus(Long userId, Long healthRecordId, RegistrationStatus status);
}
