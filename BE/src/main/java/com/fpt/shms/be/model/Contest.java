package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

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
    private String theme;

    @org.hibernate.annotations.Nationalized
    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "max_teams")
    private Integer maximumAllowedTeams;

    @Column(name = "min_team_members")
    private Integer minTeamMembers;

    @Column(name = "max_team_members")
    private Integer maxTeamMembers;

    @Column(name = "compliance_rules", columnDefinition = "TEXT")
    private String complianceRules;

    @Column(name = "tiered_prize_structures", columnDefinition = "TEXT")
    private String tieredPrizeStructures;

    @org.hibernate.annotations.Nationalized
    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "contest_start_at")
    private LocalDateTime contestStartAt;


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
        ACTIVED, UPCOMING, CLOSED, CANCELED, CANCELLED
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
        return this.status;
    }

    public boolean checkAndSyncStatus() {
        if (this.status == ContestStatus.CANCELED || this.status == ContestStatus.CANCELLED) {
            return false;
        }
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        ContestStatus computed = this.status != null ? this.status : ContestStatus.UPCOMING;
        if (this.contestEndAt != null && now.isAfter(this.contestEndAt)) {
            computed = ContestStatus.CLOSED;
        } else if (this.contestStartAt != null) {
            if (now.isBefore(this.contestStartAt)) {
                if (this.status != ContestStatus.CLOSED) {
                    computed = ContestStatus.UPCOMING;
                }
            } else if (this.contestEndAt == null || !now.isAfter(this.contestEndAt)) {
                if (this.status != ContestStatus.CLOSED) {
                    computed = ContestStatus.ACTIVED;
                }
            }
        } else if (this.registrationStart != null) {
            if (now.toLocalDate().isBefore(this.registrationStart)) {
                if (this.status != ContestStatus.CLOSED) {
                    computed = ContestStatus.UPCOMING;
                }
            } else if (this.contestEndAt == null || !now.isAfter(this.contestEndAt)) {
                if (this.status != ContestStatus.CLOSED) {
                    computed = ContestStatus.ACTIVED;
                }
            }
        }
        if (computed != null && this.status != computed) {
            this.status = computed;
            return true;
        }
        return false;
    }
}
