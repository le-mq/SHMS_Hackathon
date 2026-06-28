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
    private User user;

    @org.hibernate.annotations.Nationalized
    @Column(name = "member_role", nullable = false, length = 50)
    private String role; // "LEADER", "MEMBER"

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "APPROVED"; // "PENDING", "APPROVED", "REJECTED"

    @Column(name = "invitation_token", length = 255)
    private String invitationToken;

    @Column(name = "inviter_user_id")
    private Long inviterUserId;

    @Builder.Default
    @Column(name = "joined_at")
    private java.time.LocalDateTime joinedAt = java.time.LocalDateTime.now();

    @Transient
    public Student getStudent() {
        if (this.user == null) return null;
        Student s = new Student();
        s.setId(this.user.getId());
        s.setUser(this.user);
        return s;
    }

    public void setStudent(Student student) {
        if (student == null) {
            this.user = null;
        } else {
            this.user = student.getUser();
        }
    }

    public String getStatus() {
        return this.status != null ? this.status.toUpperCase() : null;
    }
}
