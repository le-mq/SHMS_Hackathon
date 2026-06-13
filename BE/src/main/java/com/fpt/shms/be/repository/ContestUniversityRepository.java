package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.ContestUniversity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.fpt.shms.be.model.Contest;

import java.util.List;

@Repository
public interface ContestUniversityRepository extends JpaRepository<ContestUniversity, Long> {
    void deleteByContest(Contest contest);
    List<ContestUniversity> findByContestId(Long contestId);
    boolean existsByUniversity(com.fpt.shms.be.model.University university);
}
