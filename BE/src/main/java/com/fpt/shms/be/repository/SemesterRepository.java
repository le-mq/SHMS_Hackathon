package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {
    Optional<Semester> findByNameAndYear(String name, Integer year);
}
