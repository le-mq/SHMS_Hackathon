package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "Semester")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Semester {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "semester_id")
    private Long id;

    /** Human-readable label, e.g. "SPRING" or "FALL" */
    @org.hibernate.annotations.Nationalized
    @Column(name = "term", length = 50)
    private String name;

    /** Academic year, e.g. 2026 */
    @Column(name = "year")
    private Integer year;

    /** Short code used by Flyway schema: e.g. SP26, SU26 */
    @Column(name = "semester_code", nullable = false, unique = true, length = 50)
    private String code;   // e.g. "SP26", "SU26"

    @Transient
    private LocalDate startDate;
    @Transient
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Transient
    private SemesterStatus status;

    public enum SemesterStatus {
        UPCOMING, ACTIVE, CLOSED
    }
}
