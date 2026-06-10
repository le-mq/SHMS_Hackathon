package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.ScoreDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreDetailRepository extends JpaRepository<ScoreDetail, Long> {
    List<ScoreDetail> findByScoreId(Long scoreId);
}
