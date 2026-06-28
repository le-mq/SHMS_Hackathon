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

    @Query("select tm from TeamMembership tm where tm.user.id = :userId and tm.team.id = :teamId")
    Optional<TeamMembership> findByUserIdAndTeamId(Long userId, Long teamId);

    @Query("select tm from TeamMembership tm where tm.user.id = :userId")
    List<TeamMembership> findByUserId(Long userId);

    long countByTeamId(Long teamId);

    Optional<TeamMembership> findByInvitationToken(String invitationToken);

    @Query("select tm from TeamMembership tm where tm.user.id = :userId and tm.team.contest.id = :contestId and tm.status in :statuses")
    List<TeamMembership> findByUserIdAndContestIdAndStatusIn(@org.springframework.data.repository.query.Param("userId") Long userId,
                                                              @org.springframework.data.repository.query.Param("contestId") Long contestId,
                                                              @org.springframework.data.repository.query.Param("statuses") List<String> statuses);

    @Query("select count(tm) from TeamMembership tm where tm.team.id = :teamId and tm.status in :statuses")
    long countByTeamIdAndStatusIn(@org.springframework.data.repository.query.Param("teamId") Long teamId,
                                  @org.springframework.data.repository.query.Param("statuses") List<String> statuses);

    @Query("select tm from TeamMembership tm where tm.user.id = :userId and tm.status = 'PENDING' and tm.invitationToken is not null")
    List<TeamMembership> findPendingInvitationsByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}
