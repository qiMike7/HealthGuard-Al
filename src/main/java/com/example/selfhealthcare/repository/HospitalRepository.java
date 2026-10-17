package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.Hospital;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

//操作 hospital 表
public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    Optional<Hospital> findByName(String name);
}
