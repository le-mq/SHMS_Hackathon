package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Category")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "category_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", referencedColumnName = "contest_id")
    private Contest contest;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "guideline_url")
    private String guidelineUrl;

    @Column(name = "status", length = 50)
    private String status;

    @Builder.Default
    @Transient
    private List<Round> rounds = new ArrayList<>();
}
