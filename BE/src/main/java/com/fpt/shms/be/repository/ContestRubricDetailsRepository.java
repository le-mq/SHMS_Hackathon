package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.ContestRubricDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestRubricDetailsRepository extends JpaRepository<ContestRubricDetails, Long> {
    List<ContestRubricDetails> findByContestRubricId(Long contestRubricId);
    void deleteByContestRubricId(Long contestRubricId);
}
