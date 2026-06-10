package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Judge")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Judge {

    @Id
    @Column(name = "user_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Transient
    private String fullName;

    @Transient
    private String professionalEmail;

    @Transient
    private LocalDateTime accessExpiry;

    @org.hibernate.annotations.Nationalized
    @Column(name = "expertise", length = 100)
    private String expertise;

    @Column(name = "status", length = 50)
    private String status;

    public String getFullName() {
        if (fullName != null) {
            return fullName;
        }
        return user != null ? user.getFullName() : null;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
        if (user != null) {
            user.setFullName(fullName);
        }
    }

    public String getProfessionalEmail() {
        if (professionalEmail != null) {
            return professionalEmail;
        }
        return user != null ? user.getEmail() : null;
    }

    public void setProfessionalEmail(String professionalEmail) {
        this.professionalEmail = professionalEmail;
        if (user != null) {
            user.setEmail(professionalEmail);
        }
    }

    public String getUsername() {
        return user != null ? user.getUsername() : null;
    }
}
