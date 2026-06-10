package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.LoginRequest;
import com.fpt.shms.be.dto.RegisterRequest;
import com.fpt.shms.be.dto.VerifyEmailRequest;
import com.fpt.shms.be.model.Student;
import com.fpt.shms.be.model.StudentVerificationData;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.model.Role;
import com.fpt.shms.be.model.University;
import com.fpt.shms.be.model.VerificationToken;
import com.fpt.shms.be.repository.StudentRepository;
import com.fpt.shms.be.repository.StudentVerificationDataRepository;
import com.fpt.shms.be.repository.UserRepository;
import com.fpt.shms.be.repository.RoleRepository;
import com.fpt.shms.be.repository.UniversityRepository;
import com.fpt.shms.be.repository.VerificationTokenRepository;
import com.fpt.shms.be.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final StudentVerificationDataRepository verificationDataRepository;
    private final VerificationTokenRepository tokenRepository;
    private final RoleRepository roleRepository;
    private final UniversityRepository universityRepository;
    private final EmailService emailService;
    private final JwtUtils jwtUtils;

    @Transactional
    public java.util.Map<String, Object> login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        // In a real app, use PasswordEncoder
        if (!user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        java.util.Optional<Student> studentProfile = studentRepository.findByUser(user);
        boolean requiresEmailVerification = studentProfile.isPresent();

        if (user.getStatus() == User.UserStatus.PENDING
                || (requiresEmailVerification && !Boolean.TRUE.equals(user.getIsEmailVerified()))) {
            throw new IllegalArgumentException("ACCOUNT_PENDING");
        }

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Account is not active. Current status: " + user.getStatus());
        }

        // Dynamic Role Context Matching without request parameter
        java.util.List<String> userRoles = user.getRoles().stream()
                .map(Role::getName)
                .collect(java.util.stream.Collectors.toList());

        if (userRoles.isEmpty()) {
            throw new IllegalArgumentException("User has no roles assigned");
        }

        String activeRole;
        if (userRoles.contains("COORDINATOR")) {
            activeRole = "COORDINATOR";
        } else if (userRoles.contains("JUDGE")) {
            activeRole = "JUDGE";
        } else if (userRoles.contains("MENTOR")) {
            activeRole = "MENTOR";
        } else if (userRoles.contains("TEAM_LEADER") || userRoles.contains("TEAM_MEMBER")) {
            activeRole = "STUDENT";
        } else {
            activeRole = userRoles.get(0);
        }

        String token = jwtUtils.generateToken(user.getUsername(), activeRole);
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        result.put("role", activeRole);
        result.put("allRoles", userRoles);
        result.put("username", user.getUsername());
        
        studentProfile.ifPresent(s -> {
            result.put("fullName", s.getFullName());
            result.put("isEmailVerified", String.valueOf(user.getIsEmailVerified()));
        });
        
        return result;
    }

    @Transactional
    public java.util.Map<String, Object> switchRole(String currentToken, String targetRole) {
        String username = jwtUtils.extractUsername(currentToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        java.util.List<String> userRoles = user.getRoles().stream()
                .map(Role::getName)
                .collect(java.util.stream.Collectors.toList());

        boolean hasRole = false;
        String mappedRole = targetRole.toUpperCase();
        
        if (userRoles.contains(mappedRole)) {
            hasRole = true;
        } else if (mappedRole.equals("STUDENT") && (userRoles.contains("TEAM_MEMBER") || userRoles.contains("TEAM_LEADER"))) {
            hasRole = true;
        }
        
        if (!hasRole) {
            throw new IllegalArgumentException("User does not have the requested role: " + targetRole);
        }

        String token = jwtUtils.generateToken(user.getUsername(), mappedRole);
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        result.put("role", mappedRole);
        result.put("allRoles", userRoles);
        result.put("username", user.getUsername());
        
        studentRepository.findByUser(user).ifPresent(s -> {
            result.put("fullName", s.getFullName());
            result.put("isEmailVerified", String.valueOf(user.getIsEmailVerified()));
        });
        
        return result;
    }

    @Transactional
    public String register(RegisterRequest request) {
        // Check if username exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username is already taken");
        }

        // Check if MSSV or Email already registered
        if (studentRepository.existsByMssv(request.getMssv())) {
            throw new IllegalArgumentException("MSSV is already registered");
        }
        if (studentRepository.existsByCorporateEmail(request.getCorporateEmail())) {
            throw new IllegalArgumentException("Email is already registered");
        }

        // BR-ACC-04: Cross-check with StudentVerificationData
        StudentVerificationData verificationData = verificationDataRepository.findByMssv(request.getMssv())
                .orElseThrow(() -> new IllegalArgumentException("MSSV not found in University Verification Data"));

        if (!verificationData.getFullName().equalsIgnoreCase(request.getFullName())) {
            throw new IllegalArgumentException("Full Name does not match Verification Data");
        }
        if (!verificationData.getCorporateEmail().equalsIgnoreCase(request.getCorporateEmail())) {
            throw new IllegalArgumentException("Corporate Email does not match Verification Data");
        }
        if (!verificationData.getMajor().equalsIgnoreCase(request.getMajor())) {
            throw new IllegalArgumentException("Major does not match Verification Data");
        }
        
        String verifiedUniversity = verificationData.getUniversityName();
        if (verifiedUniversity == null || !verifiedUniversity.equalsIgnoreCase(request.getTargetUniversity())) {
            throw new IllegalArgumentException("University does not match Verification Data");
        }

        Role teamMemberRole = roleRepository.findByName("TEAM_MEMBER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("TEAM_MEMBER").build()));

        // Create User as PENDING until the email OTP is verified.
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getCorporateEmail())
                .fullName(request.getFullName())
                .password(request.getPassword()) // Note: Should be encoded with BCrypt in a real app
                .roles(new java.util.HashSet<>(java.util.Collections.singletonList(teamMemberRole)))
                .status(User.UserStatus.PENDING)
                .isEmailVerified(false)
                .build();

        University university = universityRepository.findByName(request.getTargetUniversity())
                .orElseGet(() -> universityRepository.save(University.builder()
                        .name(request.getTargetUniversity())
                        .emailDomain(extractDomain(request.getCorporateEmail()))
                        .status("ACTIVE")
                        .build()));

        // Create Student linked to User
        Student student = Student.builder()
                .mssv(request.getMssv())
                .university(university)
                .major(request.getMajor())
                .corporateEmail(request.getCorporateEmail())
                .status("ACTIVE")
                .user(user)
                .build();

        studentRepository.save(student); // Saves both because of CascadeType.ALL on User

        // Generate OTP and send email
        String otp = String.format("%06d", new Random().nextInt(999999));
        VerificationToken token = VerificationToken.builder()
                .token(otp)
                .expiryDate(LocalDateTime.now().plusMinutes(3)) // 3 minutes expiration
                .user(user)
                .build();
        tokenRepository.save(token);

        emailService.sendVerificationEmail(request.getCorporateEmail(), otp);

        return "Registration successful. OTP sent to email. Please verify your account.";
    }

    @Transactional
    public String verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new IllegalArgumentException("Email is already verified");
        }

        VerificationToken token = tokenRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("OTP token not found"));

        if (token.isExpired()) {
            throw new IllegalArgumentException("OTP has expired");
        }

        if (!token.getToken().equals(request.getOtp())) {
            throw new IllegalArgumentException("Invalid OTP token");
        }

        // Mark Email as Verified and activate the account
        user.setIsEmailVerified(true);
        user.setStatus(User.UserStatus.ACTIVE);
        userRepository.save(user);

        // Remove token
        tokenRepository.deleteByUser(user);

        return "Email verified successfully. Account activated.";
    }

    @Transactional
    public String resendOtp(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new IllegalArgumentException("Email is already verified");
        }

        String otp = String.format("%06d", new Random().nextInt(999999));
        VerificationToken token = tokenRepository.findByUser(user).orElse(new VerificationToken());
        token.setToken(otp);
        token.setExpiryDate(LocalDateTime.now().plusMinutes(3));
        token.setUser(user);
        tokenRepository.save(token);

        String email = studentRepository.findByUser(user)
                .map(Student::getCorporateEmail)
                .orElse(user.getUsername());
        emailService.sendVerificationEmail(email, otp);

        return "A new OTP has been sent to your email.";
    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf('@') + 1);
    }
}
