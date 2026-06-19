package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Contest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestRepository extends JpaRepository<Contest, Long> {

    List<Contest> findByStatusIn(List<Contest.ContestStatus> statuses);

    @Query("SELECT c.status, COUNT(c) FROM Contest c GROUP BY c.status")
    List<Object[]> countByStatus();

    Optional<Contest> findBySemesterId(Long semesterId);

    @org.springframework.data.jpa.repository.Query("SELECT cu.contest FROM ContestUniversity cu WHERE cu.university.id = :universityId")
    java.util.List<Contest> findContestsByUniversityId(@org.springframework.data.repository.query.Param("universityId") Long universityId);
}

