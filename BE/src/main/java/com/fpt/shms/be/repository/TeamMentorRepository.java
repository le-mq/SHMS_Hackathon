package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.TeamMentor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMentorRepository extends JpaRepository<TeamMentor, Long> {
    List<TeamMentor> findByTeamId(Long teamId);
    List<TeamMentor> findByMentorId(Long mentorId);
    void deleteByMentorId(Long mentorId);
    List<TeamMentor> findByCategoryId(Long categoryId);

    List<TeamMentor> findByMentorIdAndCategoryId(Long mentorId, Long categoryId);

    @Modifying
    @Query("delete from TeamMentor tm where tm.mentor.id = :mentorId and tm.category.id = :categoryId")
    void deleteByMentorIdAndCategoryId(@Param("mentorId") Long mentorId, @Param("categoryId") Long categoryId);
}