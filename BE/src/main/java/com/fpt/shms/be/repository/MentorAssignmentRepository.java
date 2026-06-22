package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.MentorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MentorAssignmentRepository extends JpaRepository<MentorAssignment, Long> {
    @Query("select ma from MentorAssignment ma where ma.mentor.id = :userId")
    List<MentorAssignment> findByUserId(Long userId);

    @Modifying
    @Query("delete from MentorAssignment ma where ma.mentor.id = :userId")
    void deleteByUserId(Long userId);

    @Modifying
    @Query("delete from MentorAssignment ma where ma.mentor.id = :userId and ma.category.id = :categoryId")
    void deleteByUserIdAndCategoryId(@Param("userId") Long userId, @Param("categoryId") Long categoryId);

}
