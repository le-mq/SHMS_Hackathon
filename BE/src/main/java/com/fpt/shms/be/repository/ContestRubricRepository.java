package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.ContestRubric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestRubricRepository extends JpaRepository<ContestRubric, Long> {
    List<ContestRubric> findByCategoryId(Long categoryId);
    Optional<ContestRubric> findFirstByCategoryId(Long categoryId);
    List<ContestRubric> findByRubricTemplateId(Long templateId);

}
