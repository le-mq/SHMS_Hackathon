package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Score")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "score_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", referencedColumnName = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = true)
    private User judge;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "total_score")
    private Double totalScore;

    @Column(name = "general_feedback", columnDefinition = "NVARCHAR(MAX)")
    private String generalFeedback;

    @Column(name = "status", length = 50)
    private String status; // "FINALIZED", "MENTOR_FEEDBACK", "MISSED_DEADLINE"

    @Builder.Default
    @OneToMany(mappedBy = "score", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScoreDetail> details = new ArrayList<>();

    @Transient
    public Double getPointsAwarded() {
        if (totalScore != null) {
            return totalScore;
        }
        return details.stream()
                .map(ScoreDetail::getRawScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
    }

    @Transient
    public RubricTemplateCriteria getCriteria() {
        return null;
    }

    @Transient
    public String getFeedback() {
        return generalFeedback;
    }
}
