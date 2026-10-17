package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.Doctor;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

//操作 doctor 表
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    List<Doctor> findByDepartmentName(String departmentName);
}
