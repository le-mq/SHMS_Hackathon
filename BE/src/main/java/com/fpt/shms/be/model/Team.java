package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "Team")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "team_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "team_name", nullable = false, length = 100)
    private String name;

    @Column(name = "team_code", nullable = false, unique = true, length = 50)
    private String invitationCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", referencedColumnName = "contest_id")
    private Contest contest;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "FORMING"; // "FORMING", "PENDING", "APPROVED", "CANCELLED", "REJECTED"

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void generateInvitationCode() {
        if (this.invitationCode == null) {
            this.invitationCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}