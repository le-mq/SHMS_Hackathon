package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.ProfileResponse;
import com.fpt.shms.be.dto.UpdateProfileRequest;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public ProfileResponse getUserProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return ProfileResponse.builder()
                .fullName(user.getFullName())
                .corporateEmail(user.getEmail())
                .telephoneNumber(user.getPhone() != null ? user.getPhone() : "")
                .avatarBase64(user.getAvatarUrl() != null && user.getAvatarUrl().startsWith("data:image") ? user.getAvatarUrl() : "")
                .isEmailVerified(user.getIsEmailVerified())
                .build();
    }

    @Transactional
    public void updateUserProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getTelephoneNumber() != null) {
            user.setPhone(request.getTelephoneNumber());
        }
        if (request.getAvatarBase64() != null) {
            user.setAvatarUrl(request.getAvatarBase64());
        }

        if (request.getCurrentPassword() != null && request.getNewPassword() != null) {
            // Use PasswordEncoder when passwords are encrypted
            if (!request.getCurrentPassword().equals(user.getPassword())) {
                throw new IllegalArgumentException("Current password does not match");
            }
            user.setPassword(request.getNewPassword());
        }

        userRepository.save(user);
    }
}
