package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Coordinator;
import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CoordinatorRepository extends JpaRepository<Coordinator, Long> {
    java.util.Optional<Coordinator> findByUser(User user);
}
