package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.RankingResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RankingResultRepository extends JpaRepository<RankingResult, Long> {
    List<RankingResult> findByRoundId(Long roundId);

    @Modifying
    @Query("delete from RankingResult rr where rr.round.id = :roundId")
    void deleteByRoundId(Long roundId);

    @Query("select rr from RankingResult rr where rr.round.id = :roundId and rr.qualificationStatus = 'QUALIFIED'")
    List<RankingResult> findQualifiedByRoundId(@Param("roundId") Long roundId);

    boolean existsByTeamIdAndRoundIdAndQualificationStatus(Long teamId, Long roundId, String qualificationStatus);

    @Query("SELECT r FROM RankingResult r WHERE r.datePublishedAt IS NOT NULL AND r.round.publishResultAt IS NOT NULL AND r.round.publishResultAt <= CURRENT_TIMESTAMP")
    List<RankingResult> findPublishedLeaderboards();
}
