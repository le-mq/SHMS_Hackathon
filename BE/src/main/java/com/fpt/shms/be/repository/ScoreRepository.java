package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long> {
    List<Score> findByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);
    boolean existsByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);
    List<Score> findByJudgeId(Long judgeId);
    List<Score> findBySubmissionId(Long submissionId);
    boolean existsBySubmissionId(Long submissionId);
}
