package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Student;
import com.fpt.shms.be.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    boolean existsByStudentCode(String studentCode);
    boolean existsByCorporateEmail(String corporateEmail);
    Optional<Student> findByUser(User user);
    Optional<Student> findByStudentCode(String studentCode);
    boolean existsByUniversity(com.fpt.shms.be.model.University university);

    @org.springframework.data.jpa.repository.Query("select s from Student s where s.studentCode = :keyword or s.corporateEmail = :keyword")
    java.util.List<Student> searchByCodeOrEmail(@org.springframework.data.repository.query.Param("keyword") String keyword);
}
