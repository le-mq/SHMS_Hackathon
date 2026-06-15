package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Mentor;
import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MentorRepository extends JpaRepository<Mentor, Long> {
    java.util.Optional<Mentor> findByUser(User user);
}
