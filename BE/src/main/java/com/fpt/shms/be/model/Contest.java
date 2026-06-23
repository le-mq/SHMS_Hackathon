package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "Contest")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contest_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "contest_name", nullable = false, length = 100)
    private String name;

    /**
     * Season label: SPRING, SUMMER, FALL, WINTER
     */
    @Enumerated(EnumType.STRING)
    @Transient
    private Season season;

    @Transient
    private Integer year;

    @Column(name = "registration_start")
    private LocalDate registrationStart;

    @Column(name = "registration_end")
    private LocalDate registrationEnd;

    @Column(name = "closed_at")
    private java.time.LocalDateTime closedAt;

    /**
     * Overall contest status: ACTIVE | UPCOMING | CLOSED
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ContestStatus status;

    @org.hibernate.annotations.Nationalized
    @Column(name = "theme", length = 100)
    private String description;

    @org.hibernate.annotations.Nationalized
    @Column(name = "region", length = 50)
    private String regionScope;

    @Column(name = "max_teams")
    private Integer maximumAllowedTeams;

    @Column(name = "compliance_rules")
    private String complianceRules;

    @Column(name = "tiered_prize_structures")
    private String tieredPrizeStructures;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", referencedColumnName = "semester_id")
    private Semester semester;

    @Builder.Default
    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();

    public enum Season {
        SPRING, SUMMER, FALL, WINTER
    }

    public enum ContestStatus {
        ACTIVE, UPCOMING, CLOSED
    }

    public Season getSeason() {
        if (season != null) {
            return season;
        }
        if (semester != null && semester.getName() != null) {
            try {
                return Season.valueOf(semester.getName().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
        return null;
    }

    public Integer getYear() {
        if (year != null) {
            return year;
        }
        return semester != null ? semester.getYear() : null;
    }
}
