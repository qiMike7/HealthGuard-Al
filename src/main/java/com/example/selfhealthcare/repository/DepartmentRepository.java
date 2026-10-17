package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.Department;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

//操作 department 表
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByName(String name);

    List<Department> findAllByOrderByNameAsc();
}
