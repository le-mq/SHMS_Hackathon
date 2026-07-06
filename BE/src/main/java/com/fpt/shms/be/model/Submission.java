package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Submission")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", referencedColumnName = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", referencedColumnName = "round_id", nullable = true)
    private Round round;

    @Column(name = "submission_data", columnDefinition = "NVARCHAR(MAX)")
    private String submissionData;

    @Column(name = "version")
    private Integer version;

    @Column(name = "history_log", columnDefinition = "TEXT")
    private String historyLog;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "status", length = 50)
    private String status; // "DRAFT", "OFFICIAL", "SUBMITTED", "EVALUATED"

    @Column(name = "mentor_feedback", columnDefinition = "NVARCHAR(MAX)")
    private String mentorFeedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mentor_id", referencedColumnName = "user_id")
    private User mentor;
}
