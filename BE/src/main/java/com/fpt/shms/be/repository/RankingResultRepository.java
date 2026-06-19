package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.RankingResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RankingResultRepository extends JpaRepository<RankingResult, Long> {
    List<RankingResult> findByRoundId(Long roundId);

    @Modifying
    @Query("delete from RankingResult rr where rr.round.id = :roundId")
    void deleteByRoundId(Long roundId);
}
