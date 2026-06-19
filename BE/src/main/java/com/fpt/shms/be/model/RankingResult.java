package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "RankingResult")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RankingResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ranking_result_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", referencedColumnName = "round_id", nullable = false)
    private Round round;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", referencedColumnName = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private Admin adminUser;

    @Column(name = "rank_no")
    private Integer rankNo;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.DECIMAL)
    @Column(name = "final_score")
    private Double finalScore;

    @org.hibernate.annotations.Nationalized
    @Column(name = "qualification_status", length = 50)
    private String qualificationStatus;

    @Column(name = "date_published_at")
    private LocalDateTime datePublishedAt;
}
