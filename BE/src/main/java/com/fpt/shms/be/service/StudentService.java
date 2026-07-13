package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ProfileResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.model.Student;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.StudentRepository;
import com.fpt.shms.be.repository.TeamMembershipRepository;
import com.fpt.shms.be.repository.UserRepository;
import com.fpt.shms.be.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
// import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final VerificationTokenRepository tokenRepository;
    private final TeamMembershipRepository teamMembershipRepository;

    public ProfileResponse getProfile(String username, String role) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Student student = studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        return ProfileResponse.builder()
                .fullName(student.getFullName())
                .studentCode(student.getStudentCode())
                .major(student.getMajor())
                .corporateEmail(student.getCorporateEmail())
                .telephoneNumber(student.getTelephoneNumber())
                .avatarBase64(student.getAvatarBase64())
                .role(role)
                .isEmailVerified(user.getIsEmailVerified())
                .build();
    }

    @Transactional
    public void updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Student student = studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (request.getTelephoneNumber() != null) {
            student.setTelephoneNumber(request.getTelephoneNumber());
        }
        if (request.getAvatarBase64() != null) {
            student.setAvatarBase64(request.getAvatarBase64());
        }
        // Update User Password if requested
        if (request.getCurrentPassword() != null && request.getNewPassword() != null) {
            // if (!passwordEncoder.matches(request.getCurrentPassword(),
            // user.getPassword())) {
            // throw new IllegalArgumentException("Current password is incorrect");
            // }
            // if (request.getNewPassword().length() < 8) {
            // throw new IllegalArgumentException("New password must be at least 8
            // characters");
            // }
            // user.setPassword(passwordEncoder.encode(request.getNewPassword()));

            // Plain-text check for development (no encryption)
            if (!user.getPassword().equals(request.getCurrentPassword())) {
                throw new IllegalArgumentException("Current password is incorrect");
            }
            if (request.getNewPassword().length() < 8) {
                throw new IllegalArgumentException("New password must be at least 8 characters");
            }
            user.setPassword(request.getNewPassword());

            userRepository.save(user);
        }
    }

    @Transactional
    public void deleteProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        java.util.List<com.fpt.shms.be.model.TeamMembership> memberships = teamMembershipRepository.findByUserId(user.getId());
        for (com.fpt.shms.be.model.TeamMembership m : memberships) {
            if ("APPROVED".equals(m.getStatus()) || "PENDING".equals(m.getStatus())) {
                com.fpt.shms.be.model.Team team = m.getTeam();
                if (team != null && team.getContest() != null) {
                    if (com.fpt.shms.be.model.Contest.ContestStatus.ACTIVED.equals(team.getContest().getStatus())) {
                        throw new IllegalArgumentException("You are participating in an active contest and cannot delete your account.");
                    }
                }
            }
        }

        user.setStatus(com.fpt.shms.be.model.User.UserStatus.INACTIVE);
        userRepository.save(user);
    }
}
