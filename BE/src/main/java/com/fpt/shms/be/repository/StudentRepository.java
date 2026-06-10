package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Student;
import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    boolean existsByMssv(String mssv);
    boolean existsByCorporateEmail(String corporateEmail);
    Optional<Student> findByUser(User user);
    Optional<Student> findByMssv(String mssv);
    boolean existsByUniversity(com.fpt.shms.be.model.University university);
}
