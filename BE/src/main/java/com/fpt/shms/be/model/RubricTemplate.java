package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "RubricTemplate")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rubric_template_id")
    private Long id;

    @Column(name = "template_name", nullable = false, length = 100)
    private String name;

    @Transient
    private Boolean publicVisibility;

    @Transient
    private Boolean weightedScoring;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id")
    private Category category;

    @Column(name = "status", length = 50)
    private String status;

    @Builder.Default
    @OneToMany(mappedBy = "rubricTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private List<RubricTemplateCriteria> criteria = new ArrayList<>();

    @Transient
    public Long getCategoryId(){
        if (this.category != null) {
            return this.category.getId();
        }
        return null;
    }
}
