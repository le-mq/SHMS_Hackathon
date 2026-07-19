package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Announcement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "announcement_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Lob
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "announcement_type", length = 50)
    private AnnouncementType type;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @OneToMany(mappedBy = "announcement", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<AnnouncementTarget> targets = new java.util.ArrayList<>();

    @Builder.Default
    @Transient
    private Boolean isActive = true;

    @Column(name = "status", length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", referencedColumnName = "contest_id")
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private Admin adminUser;

    public enum AnnouncementType {
        GENERAL_UPDATE, DEADLINE_REMINDER, RULE_CHANGE, RESULT_ANNOUNCEMENT, SYSTEM_MAINTENANCE, GENERAL, REGULATION
    }

    public Boolean getIsActive() {
        return !"INACTIVE".equalsIgnoreCase(status);
    }

    public void setIsActive(Boolean active) {
        this.isActive = active;
        this.status = Boolean.FALSE.equals(active) ? "INACTIVE" : "ACTIVE";
    }
}
