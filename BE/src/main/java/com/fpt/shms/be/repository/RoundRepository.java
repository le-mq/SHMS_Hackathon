package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoundRepository extends JpaRepository<Round, Long> {
    List<Round> findByContestId(Long contestId);

    List<Round> findByContestIdOrderBySubmissionOpenAsc(Long contestId);
    List<Round> findByCategoryIdOrderBySubmissionOpenAsc(Long categoryId);

}
