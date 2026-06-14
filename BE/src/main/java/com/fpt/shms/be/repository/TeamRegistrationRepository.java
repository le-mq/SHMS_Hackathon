package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.TeamRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRegistrationRepository extends JpaRepository<TeamRegistration, Long> {
    List<TeamRegistration> findByTeamId(Long teamId);
    List<TeamRegistration> findByCategoryId(Long categoryId);
}
