package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.TeamMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMembershipRepository extends JpaRepository<TeamMembership, Long> {
    List<TeamMembership> findByTeamId(Long teamId);

    @Query("select tm from TeamMembership tm where tm.student.id = :userId and tm.team.id = :teamId")
    Optional<TeamMembership> findByUserIdAndTeamId(Long userId, Long teamId);

    @Query("select tm from TeamMembership tm where tm.student.id = :userId")
    List<TeamMembership> findByUserId(Long userId);

    long countByTeamId(Long teamId);
}
