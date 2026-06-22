package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.StudentVerificationData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentVerificationDataRepository extends JpaRepository<StudentVerificationData, Long> {
    Optional<StudentVerificationData> findByStudentCode(String studentCode);

    @Query("select sv from StudentVerificationData sv where sv.university.name = :university")
    java.util.List<StudentVerificationData> findByUniversity(String university);

    java.util.Optional<StudentVerificationData> findByUniversityIdAndStudentCodeAndCorporateEmail(Long universityId, String studentCode, String corporateEmail);
}
