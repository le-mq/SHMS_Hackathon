package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ProfileResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.model.Student;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.StudentRepository;
import com.fpt.shms.be.repository.UserRepository;
import com.fpt.shms.be.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final VerificationTokenRepository tokenRepository;

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

        // Update Student fields
        if (request.getTelephoneNumber() != null) {
            student.setTelephoneNumber(request.getTelephoneNumber());
        }
        if (request.getAvatarBase64() != null) {
            student.setAvatarBase64(request.getAvatarBase64());
        }
        studentRepository.save(student);

        // Update User Password if requested
        if (request.getCurrentPassword() != null && request.getNewPassword() != null) {
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
        
        // Delete verification token if it exists to avoid foreign key constraint violations
        tokenRepository.findByUser(user).ifPresent(tokenRepository::delete);
        
        studentRepository.delete(student);
        // Deleting student also deletes User because of CascadeType.ALL on Student.user mapping.
    }
}
