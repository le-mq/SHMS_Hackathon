package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.TeamMentor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMentorRepository extends JpaRepository<TeamMentor, Long> {
    List<TeamMentor> findByTeamId(Long teamId);
    List<TeamMentor> findByMentorId(Long mentorId);
    void deleteByMentorId(Long mentorId);
    List<TeamMentor> findByCategoryId(Long categoryId);
}