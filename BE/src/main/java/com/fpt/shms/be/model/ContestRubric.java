package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ContestRubric")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestRubric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contest_rubric_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id", nullable = false)
    private Category category;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubric_template_id", referencedColumnName = "rubric_template_id", nullable = false)
    private RubricTemplate rubricTemplate;

    @org.hibernate.annotations.Nationalized
    @Column(name = "rubric_name", length = 100)
    private String rubricName;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "total_weight")
    private Double totalWeight;

    @Column(name = "status", length = 50)
    private String status;
}
