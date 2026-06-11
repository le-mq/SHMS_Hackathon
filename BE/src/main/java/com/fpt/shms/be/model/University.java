package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "University")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class University {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "university_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "university_name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "university_code", unique = true, length = 50)
    private String universityCode;

    @Column(name = "email_domain", length = 100)
    private String emailDomain;

    @Column(name = "mssv_regex", length = 100)
    private String studentIdRegex;

    @Column(name = "status", length = 50)
    private String status;
}
