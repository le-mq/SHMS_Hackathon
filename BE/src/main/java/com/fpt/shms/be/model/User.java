package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "[User]")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "username", unique = true, length = 50)
    private String username;

    @Column(name = "email", unique = true, length = 50)
    private String email;

    @Column(name = "password", length = 100)
    private String password;

    @org.hibernate.annotations.Nationalized
    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "phone", length = 15)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    /**
     * Account Status: PENDING, ACTIVE, INACTIVE
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private UserStatus status;

    @Builder.Default
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "UserRole",
            joinColumns = @JoinColumn(name = "user_id", referencedColumnName = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id", referencedColumnName = "role_id")
    )
    private java.util.Set<Role> roles = new java.util.HashSet<>();

    @Builder.Default
    @Column(name = "email_verified")
    private Boolean isEmailVerified = false;

    @Builder.Default
    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();

    public enum UserStatus {
        PENDING, ACTIVE, INACTIVE
    }
}
