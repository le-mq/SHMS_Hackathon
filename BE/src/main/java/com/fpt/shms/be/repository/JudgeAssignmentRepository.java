package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.JudgeAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JudgeAssignmentRepository extends JpaRepository<JudgeAssignment, Long> {
    @Query("select ja from JudgeAssignment ja where ja.judge.id = :userId")
    List<JudgeAssignment> findByUserId(Long userId);

    @Modifying
    @Query("delete from JudgeAssignment ja where ja.judge.id = :userId")
    void deleteByUserId(Long userId);

    @Query("select ja from JudgeAssignment ja where ja.judge.id = :userId and ja.category.id = :categoryId")
    List<JudgeAssignment> findByUserIdAndCategoryId(@Param("userId") Long userId, @Param("categoryId") Long categoryId);

    @Modifying
    @Query("delete from JudgeAssignment ja where ja.judge.id = :userId and ja.category.id = :categoryId")
    void deleteByUserIdAndCategoryId(@Param("userId") Long userId, @Param("categoryId") Long categoryId);

    List<JudgeAssignment> findByCategoryId(Long categoryId);

}
