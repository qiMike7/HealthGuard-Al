package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
//操作 app_user 表
    Optional<AppUser> findByUsername(String username);

    boolean existsByUsername(String username);
}
