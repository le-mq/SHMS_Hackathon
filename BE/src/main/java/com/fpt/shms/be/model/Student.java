package com.fpt.shms.be.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "Student")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @Column(name = "user_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "university_id", referencedColumnName = "university_id")
    private University university;

    @Column(name = "student_code", nullable = false, unique = true, length = 50)
    private String mssv;

    @org.hibernate.annotations.Nationalized
    @Column(name = "major", nullable = false, length = 100)
    private String major;

    @Column(name = "student_email", nullable = false, unique = true, length = 50)
    private String corporateEmail;

    @Column(name = "status", length = 50)
    private String status;

    public String getStudentId() {
        return this.mssv != null ? this.mssv : String.valueOf(this.id);
    }

    public String getFullName() {
        return user != null ? user.getFullName() : null;
    }

    public void setFullName(String fullName) {
        ensureUser().setFullName(fullName);
    }

    public String getTelephoneNumber() {
        return user != null ? user.getPhone() : null;
    }

    public void setTelephoneNumber(String telephoneNumber) {
        ensureUser().setPhone(telephoneNumber);
    }

    public String getAvatarBase64() {
        return user != null ? user.getAvatarUrl() : null;
    }

    public void setAvatarBase64(String avatarBase64) {
        ensureUser().setAvatarUrl(avatarBase64);
    }

    private User ensureUser() {
        if (user == null) {
            user = new User();
        }
        return user;
    }
}
