package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.RegistrationSlot;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

//操作 registration_slot 表
public interface RegistrationSlotRepository extends JpaRepository<RegistrationSlot, Long> {

    List<RegistrationSlot> findByDoctorIdInAndDateBetweenAndRemainingSlotsGreaterThanOrderByDateAscPeriodAsc(
            Collection<Long> doctorIds, LocalDate start, LocalDate end, int minRemaining);

    List<RegistrationSlot> findByDoctorIdOrderByDateAscPeriodAsc(Long doctorId);
}
