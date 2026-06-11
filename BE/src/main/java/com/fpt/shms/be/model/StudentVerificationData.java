package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "StudentVerificationData")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentVerificationData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "verification_data_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "university_id", referencedColumnName = "university_id")
    private University university;

    @Column(name = "student_code", nullable = false, unique = true, length = 50)
    private String mssv;

    @org.hibernate.annotations.Nationalized
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 50)
    private String corporateEmail;

    @org.hibernate.annotations.Nationalized
    @Column(name = "major", nullable = false, length = 100)
    private String major;

    @Builder.Default
    @Column(name = "is_current_student", nullable = false)
    private Boolean isCurrentStudent = true;

    public String getUniversityName() {
        return university != null ? university.getName() : null;
    }
}
