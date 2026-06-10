package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ContestUniversity")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestUniversity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contest_university_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", referencedColumnName = "contest_id", nullable = false)
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "university_id", referencedColumnName = "university_id", nullable = false)
    private University university;

    @Transient
    public String getCorporateDomain() {
        return university != null ? university.getName() : null;
    }
}
