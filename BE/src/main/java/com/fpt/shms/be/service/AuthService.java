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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
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
        log.info("Received registration request - username: '{}', email: '{}', mssv: '{}', fullName: '{}', university: '{}', major: '{}'",
                request.getUsername(), request.getCorporateEmail(), request.getMssv(), request.getFullName(), request.getTargetUniversity(), request.getMajor());

        // Check if username exists
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed: Username '{}' is already taken", request.getUsername());
            throw new IllegalArgumentException("Username is already taken");
        }

        // Check if MSSV or Email already registered
        if (studentRepository.existsByMssv(request.getMssv())) {
            log.warn("Registration failed: MSSV '{}' is already registered", request.getMssv());
            throw new IllegalArgumentException("MSSV is already registered");
        }
        if (studentRepository.existsByCorporateEmail(request.getCorporateEmail())) {
            log.warn("Registration failed: Email '{}' is already registered", request.getCorporateEmail());
            throw new IllegalArgumentException("Email is already registered");
        }

        // Load university from DB
        log.info("Loading university: '{}'", request.getTargetUniversity());
        University university = universityRepository.findByName(request.getTargetUniversity())
                .orElseThrow(() -> {
                    log.error("Registration failed: University '{}' not found in database", request.getTargetUniversity());
                    return new IllegalArgumentException("University not found");
                });

        // Dynamic email validation
        String emailRegex = university.getEmailRegex();
        log.info("Loaded emailRegex for '{}': '{}'", university.getName(), emailRegex);
        if (emailRegex != null && !emailRegex.isBlank()) {
            boolean emailMatches = java.util.regex.Pattern.matches(emailRegex, request.getCorporateEmail());
            log.info("Email matching outcome: {}", emailMatches);
            if (!emailMatches) {
                log.warn("Registration failed: Corporate Email '{}' does not match university pattern '{}'", request.getCorporateEmail(), emailRegex);
                throw new IllegalArgumentException("Invalid university email format");
            }
        }

        // Dynamic student code (MSSV) validation
        String studentCodeRegex = university.getStudentCodeRegex();
        log.info("Loaded studentCodeRegex for '{}': '{}'", university.getName(), studentCodeRegex);
        if (studentCodeRegex != null && !studentCodeRegex.isBlank()) {
            boolean mssvMatches = java.util.regex.Pattern.matches(studentCodeRegex, request.getMssv());
            log.info("Student code matching outcome: {}", mssvMatches);
            if (!mssvMatches) {
                log.warn("Registration failed: MSSV '{}' does not match university pattern '{}'", request.getMssv(), studentCodeRegex);
                throw new IllegalArgumentException("Invalid student code format");
            }
        }

        // BR-ACC-04: Cross-check with StudentVerificationData using university_id, student_code, and email
        log.info("Looking up student verification data - university_id: {}, mssv: '{}', email: '{}'",
                university.getId(), request.getMssv(), request.getCorporateEmail());
        StudentVerificationData verificationData = verificationDataRepository
                .findByUniversityIdAndMssvAndCorporateEmail(university.getId(), request.getMssv(), request.getCorporateEmail())
                .orElseThrow(() -> {
                    log.warn("Registration failed: Student verification record not found for university_id={}, mssv='{}', email='{}'",
                            university.getId(), request.getMssv(), request.getCorporateEmail());
                    return new IllegalArgumentException("Student not found in university verification data");
                });

        log.info("Verification record found: mssv='{}', fullName='{}', major='{}'",
                verificationData.getMssv(), verificationData.getFullName(), verificationData.getMajor());

        if (!verificationData.getFullName().equalsIgnoreCase(request.getFullName())) {
            log.warn("Registration failed: Full Name '{}' does not match verification data '{}'", request.getFullName(), verificationData.getFullName());
            throw new IllegalArgumentException("Full Name does not match Verification Data");
        }
        if (!verificationData.getMajor().equalsIgnoreCase(request.getMajor())) {
            log.warn("Registration failed: Major '{}' does not match verification data '{}'", request.getMajor(), verificationData.getMajor());
            throw new IllegalArgumentException("Major does not match Verification Data");
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
