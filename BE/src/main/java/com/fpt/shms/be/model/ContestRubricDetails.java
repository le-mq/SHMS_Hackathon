package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ContestRubricDetails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestRubricDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contest_rubric_detail_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_rubric_id", referencedColumnName = "contest_rubric_id", nullable = false)
    private ContestRubric contestRubric;

    @org.hibernate.annotations.Nationalized
    @Column(name = "criteria_name", nullable = false, length = 100)
    private String criteriaName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "max_score", nullable = false)
    private Double maxScore;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "weight", nullable = false)
    private Double percentageWeight;
}
