package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Round")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Round {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "round_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "round_name", nullable = false, length = 100)
    private String phaseName;

    @Column(name = "submission_open_at", nullable = false)
    private LocalDateTime submissionOpen;

    @Column(name = "submission_deadline_at", nullable = false)
    private LocalDateTime submissionDeadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private RoundState state;

    @Column(name = "round_order")
    private Integer roundOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", referencedColumnName = "contest_id")
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id")
    private Category category;

    @Column(name = "grading_open_at")
    private java.time.LocalDateTime gradingOpenAt;

    @Column(name = "grading_deadline_at")
    private java.time.LocalDateTime gradingDeadlineAt;

    @Column(name = "publish_result_at")
    private java.time.LocalDateTime publishResultAt;

    @Column(name = "submission_requirements", columnDefinition = "TEXT")
    private String submissionRequirements;

    @org.hibernate.annotations.Nationalized
    @Column(name = "round_format", length = 100)
    private String roundFormat;

    public enum RoundState {
        UPCOMING, ACTIVE, ACTIVED, CLOSED
    }

    public RoundState getState() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if (this.submissionDeadline != null && now.isAfter(this.submissionDeadline)) {
            return RoundState.CLOSED;
        }
        if (this.submissionOpen != null && now.isBefore(this.submissionOpen)) {
            return RoundState.UPCOMING;
        }
        if (this.submissionOpen != null && this.submissionDeadline != null) {
            return RoundState.ACTIVED;
        }
        return this.state != null ? this.state : RoundState.UPCOMING;
    }
}
