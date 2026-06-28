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
     * Season label: SPRING, SUMMER, FALL
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


    /**
     * Overall contest status: ACTIVED | UPCOMING | CLOSED
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

    @Column(name = "min_team_members")
    private Integer minTeamMembers;

    @Column(name = "max_team_members")
    private Integer maxTeamMembers;

    @Column(name = "location")
    private String location;

    @Column(name = "published_at")
    private java.time.LocalDateTime publishedAt;

    @Column(name = "contest_start_at")
    private java.time.LocalDateTime contestStartAt;

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

    @Column(name = "contest_end_at")
    private java.time.LocalDateTime contestEndAt;

    public enum Season {
        SPRING, SUMMER, FALL, WINTER
    }

    public enum ContestStatus {
        ACTIVE, ACTIVED, UPCOMING, CLOSED
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

    public ContestStatus getStatus() {
        java.time.LocalDateTime nowTime = java.time.LocalDateTime.now();
        java.time.LocalDate nowDay = java.time.LocalDate.now();

        if (this.contestEndAt != null && nowTime.isAfter(this.contestEndAt)) {
            return ContestStatus.CLOSED;
        }

        if (this.registrationStart != null && nowDay.isBefore(this.registrationStart)) {
            return ContestStatus.UPCOMING;
        }

        return ContestStatus.ACTIVE;
    }
}
