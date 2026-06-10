package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "AuditLog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_log_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private User user;

    // BR-AUD-01: mandatory justification text for sensitive administrative actions
    @Column(name = "reason", columnDefinition = "TEXT")
    private String justificationReason;

    @org.hibernate.annotations.Nationalized
    @Column(name = "action", length = 100)
    private String actionType; // DISQUALIFICATION, SCORE_REVOCATION, SYSTEM_CONFIG, ACCESS_GRANT, etc.

    @Column(name = "entity_type", length = 50)
    private String targetEntity; // e.g. TEAM-2026-012, USER_EXP_DEV

    @Transient
    private String performedBy; // username / userId of the admin who triggered the action

    @Column(name = "performed_at")
    private LocalDateTime timestamp;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String additionalMetadata; // JSON blob for structured context

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;
}
