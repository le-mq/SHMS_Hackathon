package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByTeamId(Long teamId);

    Optional<Submission> findByTeamIdAndRoundId(Long teamId, Long roundId);

    List<Submission> findByTeamIdIn(List<Long> teamIds);

    List<Submission> findByRoundId(Long roundId);

    boolean existsByRoundIdAndHistoryLogIsNotNull(Long roundId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(s) > 0 FROM Submission s WHERE s.round.id = :roundId AND s.historyLog LIKE '{%'")
    boolean existsByRoundIdAndHistoryLogIsPublished(
            @org.springframework.data.repository.query.Param("roundId") Long roundId);

    java.util.Optional<Submission> findByTeamIdAndRoundIdAndStatus(Long teamId, Long roundId, String status);
}
