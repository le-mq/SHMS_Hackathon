package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "TeamMembership")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "team_membership_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", referencedColumnName = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private Student student;

    @org.hibernate.annotations.Nationalized
    @Column(name = "member_role", nullable = false, length = 50)
    private String role; // "LEADER", "MEMBER"

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "APPROVED"; // "PENDING", "APPROVED"

    @Builder.Default
    @Column(name = "joined_at")
    private java.time.LocalDateTime joinedAt = java.time.LocalDateTime.now();

    @Transient
    public User getUser() {
        return student != null ? student.getUser() : null;
    }

    public void setUser(User user) {
        if (user == null) {
            this.student = null;
        } else {
            Student s = new Student();
            s.setId(user.getId());
            s.setUser(user);
            this.student = s;
        }
    }
}
