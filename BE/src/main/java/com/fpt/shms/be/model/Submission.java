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

    @Column(name = "github_url")
    private String projectRepositoryUrl;

    @Column(name = "demo_url")
    private String demoVideoUrl;

    @Column(name = "document_url")
    private String documentationUrl;

    @Column(name = "slide_url")
    private String presentationSlideUrl;

    @Column(name = "version")
    private Integer version;

    @Column(name = "history_log", columnDefinition = "TEXT")
    private String historyLog;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    @Column(name = "status", length = 50)
    private String status; // "DRAFT", "SUBMITTED", "LATE", "ARCHIVED"
}
