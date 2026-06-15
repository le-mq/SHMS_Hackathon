package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "MentorAssignment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MentorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mentor_assignment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private Mentor mentor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "category_id", nullable = false)
    private Category category;

    @Column(name = "status", length = 50)
    private String status;

    @Transient
    public User getUser() {
        return mentor != null ? mentor.getUser() : null;
    }

    public void setUser(User user) {
        if (user == null) {
            this.mentor = null;
            return;
        }
        Mentor m = new Mentor();
        m.setId(user.getId());
        m.setUser(user);
        this.mentor = m;
    }
}
