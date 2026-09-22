package com.example.selfhealthcare.repository;

import com.example.selfhealthcare.domain.UserProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
//操作 user_profile 表
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    Optional<UserProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
