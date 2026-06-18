package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@SuppressWarnings({"SqlNoDataSourceInspection", "SqlResolve"})
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);


    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE UserRole SET expires_at = :expiresAt WHERE user_id = :userId AND role_id = (SELECT role_id FROM [Role] WHERE role_name = :roleName)", nativeQuery = true)
    void updateUserRoleExpiry(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("roleName") String roleName, @org.springframework.data.repository.query.Param("expiresAt") java.time.LocalDateTime expiresAt);
    @org.springframework.data.jpa.repository.Query(value = "SELECT expires_at FROM UserRole ur JOIN [Role] r ON ur.role_id = r.role_id WHERE ur.user_id = :userId AND r.role_name = :roleName", nativeQuery = true)
    java.time.LocalDateTime getRoleExpiry(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("roleName") String roleName);
}
