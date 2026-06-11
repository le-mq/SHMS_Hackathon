package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "RubricTemplateCriteria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricTemplateCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_criteria_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubric_template_id", referencedColumnName = "rubric_template_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonBackReference
    private RubricTemplate rubricTemplate;

    @org.hibernate.annotations.Nationalized
    @Column(name = "criteria_name", nullable = false, length = 100)
    private String criteriaName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "max_score", nullable = false)
    private Double maxScore;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "default_weight", nullable = false)
    private Double percentageWeight;
}
