package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "JudgeAssignment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JudgeAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "judge_assignment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private Judge judge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id", nullable = false)
    private Category category;

    @Column(name = "status", length = 50)
    private String status;

    @Transient
    public User getUser() {
        return judge != null ? judge.getUser() : null;
    }

    public void setUser(User user) {
        if (user == null) {
            this.judge = null;
            return;
        }
        Judge j = new Judge();
        j.setId(user.getId());
        j.setUser(user);
        this.judge = j;
    }
}
