package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.RubricTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RubricTemplateRepository extends JpaRepository<RubricTemplate, Long> {
}
