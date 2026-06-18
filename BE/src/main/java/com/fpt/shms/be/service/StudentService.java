package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ProfileResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.model.Student;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.StudentRepository;
import com.fpt.shms.be.repository.UserRepository;
import com.fpt.shms.be.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileResponse getProfile(String username, String role) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Student student = studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        return ProfileResponse.builder()
                .fullName(student.getFullName())
                .mssv(student.getMssv())
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
            // if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            //     throw new IllegalArgumentException("Current password is incorrect");
            // }
            // if (request.getNewPassword().length() < 8) {
            //     throw new IllegalArgumentException("New password must be at least 8 characters");
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

        Student student = studentRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        tokenRepository.findByUser(user).ifPresent(tokenRepository::delete);
        studentRepository.delete(student);
        userRepository.delete(user);
    }
}
