package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.RubricTemplateCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RubricTemplateCriteriaRepository extends JpaRepository<RubricTemplateCriteria, Long> {
}
