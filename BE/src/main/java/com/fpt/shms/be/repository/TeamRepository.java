package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    Optional<Team> findByInvitationCode(String invitationCode);
    long countByContestIdAndStatus(Long contestId, String status);

    @Query("select distinct t from Team t join t.registrations r where r.category.id in :categoryIds")
    List<Team> findByCategoryIdIn(List<Long> categoryIds);

    @Query("select distinct t from Team t join t.registrations r where r.category.id = :categoryId")
    List<Team> findByCategoryId(Long categoryId);

    List<Team> findByMentorId(Long mentorId);
    List<Team> findByContestId(Long contestId);
}
