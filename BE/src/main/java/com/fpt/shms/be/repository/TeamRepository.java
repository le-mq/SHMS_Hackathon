package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    long countByContestIdAndStatus(Long contestId, String status);

    List<Team> findByContestIdIn(List<Long> contestIds);

    List<Team> findByContestId(Long contestId);
}
