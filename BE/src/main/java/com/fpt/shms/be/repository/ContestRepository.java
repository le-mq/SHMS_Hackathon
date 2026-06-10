package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Contest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestRepository extends JpaRepository<Contest, Long> {

    /**
     * Find all contests that are ACTIVE or UPCOMING (displayed on public home).
     */
    List<Contest> findByStatusIn(List<Contest.ContestStatus> statuses);

    /**
     * Count contests grouped by status for statistics chart.
     */
    @Query("SELECT c.status, COUNT(c) FROM Contest c GROUP BY c.status")
    List<Object[]> countByStatus();

    Optional<Contest> findBySemesterId(Long semesterId);
}
