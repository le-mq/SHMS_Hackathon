package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "Role")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "role_name", nullable = false, unique = true, length = 50)
    private String name; // e.g., "ADMIN", "JUDGE"

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
