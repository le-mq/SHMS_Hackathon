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

    @org.hibernate.annotations.Nationalized
    @Column(name = "round_format", nullable = false, length = 50)
    private String submissionFormat; // e.g., "PDF, ZIP"

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private RoundState state;

    @Column(name = "round_order")
    private Integer roundOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", referencedColumnName = "contest_id")
    private Contest contest;

    @Transient
    private Category category;

    public enum RoundState {
        UPCOMING, ACTIVE, CLOSED
    }
}
