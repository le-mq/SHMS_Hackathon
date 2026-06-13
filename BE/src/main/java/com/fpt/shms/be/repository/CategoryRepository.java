package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.fpt.shms.be.model.Contest;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByContestId(Long contestId);
    java.util.Optional<Category> findByNameAndContest(String name, Contest contest);
    void deleteByContest(Contest contest);
}
