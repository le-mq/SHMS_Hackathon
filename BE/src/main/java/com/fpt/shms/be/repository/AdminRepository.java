package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Admin;
import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    Optional<Admin> findByUser(User user);
}
