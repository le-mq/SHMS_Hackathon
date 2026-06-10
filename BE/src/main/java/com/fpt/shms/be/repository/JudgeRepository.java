package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Judge;
import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JudgeRepository extends JpaRepository<Judge, Long> {
    java.util.Optional<Judge> findByUser(User user);
}
