package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ScoreDetail")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "score_detail_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "score_id", referencedColumnName = "score_id", nullable = false)
    private Score score;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_rubric_detail_id", referencedColumnName = "contest_rubric_detail_id", nullable = false)
    private ContestRubricDetails contestRubricDetail;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "raw_score")
    private Double rawScore;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "weighted_score")
    private Double weightedScore;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;
}
