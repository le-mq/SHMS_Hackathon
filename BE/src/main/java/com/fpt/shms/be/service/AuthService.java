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
    // private final PasswordEncoder passwordEncoder;

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

        java.util.List<String> userRoles = user.getRoles().stream()
                .map(Role::getName)
                .collect(java.util.stream.Collectors.toList());

        if (userRoles.contains("JUDGE") || userRoles.contains("MENTOR")) {
            String roleToCheck = userRoles.contains("JUDGE") ? "JUDGE" : "MENTOR";
            java.time.LocalDateTime roleExpiry = userRepository.getRoleExpiry(user.getId(), roleToCheck);
            if (roleExpiry != null && java.time.LocalDateTime.now().isAfter(roleExpiry)) {
                throw new IllegalArgumentException("Your account has expired!");
            }
        }

        if (userRoles.isEmpty()) {
            throw new IllegalArgumentException("User has no roles assigned");
        }

        String activeRole;
        if (userRoles.contains("ADMIN")) {
            activeRole = "ADMIN";
        } else if (userRoles.contains("JUDGE")) {
            activeRole = "JUDGE";
        } else if (userRoles.contains("MENTOR")) {
            activeRole = "MENTOR";
        } else if (userRoles.contains("LEADER")) {
            activeRole = "LEADER";
        } else if (userRoles.contains("STUDENT")) {
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

        result.put("fullName", user.getFullName());
        studentProfile.ifPresent(s -> {
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
        log.info("Received registration request - username: '{}', email: '{}', studentCode: '{}', fullName: '{}', university: '{}', major: '{}'",
                request.getUsername(), request.getCorporateEmail(), request.getStudentCode(), request.getFullName(), request.getTargetUniversity(), request.getMajor());

        // Load university from DB
        log.info("Loading university: '{}'", request.getTargetUniversity());
        University university = universityRepository.findByName(request.getTargetUniversity())
                .orElseThrow(() -> {
                    log.error("Registration failed: University '{}' not found in database", request.getTargetUniversity());
                    return new IllegalArgumentException("University not found");
                });

        // 1. Check if a complete match in Student Verification Data is already registered in Student table
        java.util.Optional<StudentVerificationData> verificationOpt = verificationDataRepository
                .findByUniversityIdAndStudentCodeAndCorporateEmail(university.getId(), request.getStudentCode(), request.getCorporateEmail());
        if (verificationOpt.isPresent()) {
            StudentVerificationData verificationData = verificationOpt.get();
            if (verificationData.getFullName().equalsIgnoreCase(request.getFullName()) &&
                    verificationData.getMajor().equalsIgnoreCase(request.getMajor())) {
                if (studentRepository.existsByStudentCode(request.getStudentCode()) ||
                        studentRepository.existsByCorporateEmail(request.getCorporateEmail())) {
                    log.warn("Registration failed: Complete student verification match already registered");
                    throw new IllegalArgumentException("This student already has an account");
                }
            }
        }

        // 2. Check for individual/multiple duplicate fields and combine errors
        java.util.List<String> duplicateErrors = new java.util.ArrayList<>();
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed: Username '{}' is already taken", request.getUsername());
            duplicateErrors.add("Username is already taken");
        }
        if (studentRepository.existsByStudentCode(request.getStudentCode())) {
            log.warn("Registration failed: Student code '{}' is already registered", request.getStudentCode());
            duplicateErrors.add("Student code is already registered");
        }
        if (studentRepository.existsByCorporateEmail(request.getCorporateEmail())) {
            log.warn("Registration failed: Email '{}' is already registered", request.getCorporateEmail());
            duplicateErrors.add("Email is already registered");
        }
        if (!duplicateErrors.isEmpty()) {
            throw new IllegalArgumentException(String.join("|", duplicateErrors));
        }

        String emailRegexTemplate = university.getEmailRegex();
        log.info("Loaded emailRegex template for '{}': '{}'", university.getName(), emailRegexTemplate);
        if (emailRegexTemplate != null && !emailRegexTemplate.isBlank()) {
            String parsedRegex = convertTemplateToRegex(emailRegexTemplate);
            if ("FPT".equalsIgnoreCase(university.getUniversityCode())) {
                String studentCode = request.getStudentCode();
                if (studentCode != null && studentCode.length() >= 4) {
                    try {
                        String batchStr = studentCode.substring(2, 4);
                        int batchNum = Integer.parseInt(batchStr);
                        if (batchNum < 18) {
                            parsedRegex = "^[a-zA-Z0-9._%+-]+@fpt\\.edu\\.vn$";
                        }
                    } catch (NumberFormatException e) {
                        log.warn("Failed to parse batch number from student code '{}'", studentCode);
                    }
                }
            }
            boolean emailMatches = java.util.regex.Pattern.matches(parsedRegex, request.getCorporateEmail());
            log.info("Email matching outcome (regex: '{}'): {}", parsedRegex, emailMatches);
            if (!emailMatches) {
                log.warn("Registration failed: Corporate Email '{}' does not match university pattern '{}'", request.getCorporateEmail(), emailRegexTemplate);
                throw new IllegalArgumentException("Invalid university email format");
            }
        }

        String studentCodeRegexTemplate = university.getStudentCodeRegex();
        log.info("Loaded studentCodeRegex template for '{}': '{}'", university.getName(), studentCodeRegexTemplate);
        if (studentCodeRegexTemplate != null && !studentCodeRegexTemplate.isBlank()) {
            String parsedRegex = convertTemplateToRegex(studentCodeRegexTemplate);
            boolean codeMatches = java.util.regex.Pattern.matches(parsedRegex, request.getStudentCode());
            log.info("Student code matching outcome (regex: '{}'): {}", parsedRegex, codeMatches);
            if (!codeMatches) {
                log.warn("Registration failed: Student code '{}' does not match university pattern '{}'", request.getStudentCode(), studentCodeRegexTemplate);
                throw new IllegalArgumentException("Invalid student code format");
            }
        }


        log.info("Looking up student verification data - university_id: {}, studentCode: '{}', email: '{}'",
                university.getId(), request.getStudentCode(), request.getCorporateEmail());
        StudentVerificationData verificationData = verificationDataRepository
                .findByUniversityIdAndStudentCodeAndCorporateEmail(university.getId(), request.getStudentCode(), request.getCorporateEmail())
                .orElseThrow(() -> {
                    log.warn("Registration failed: Student verification record not found for university_id={}, studentCode='{}', email='{}'",
                            university.getId(), request.getStudentCode(), request.getCorporateEmail());
                    return new IllegalArgumentException("Student not found in university verification data");
                });

        log.info("Verification record found: studentCode='{}', fullName='{}', major='{}'",
                verificationData.getStudentCode(), verificationData.getFullName(), verificationData.getMajor());

        if (Boolean.FALSE.equals(verificationData.getIsCurrentStudent())) {
            log.warn("Registration failed: Student '{}' is marked as not current student", request.getStudentCode());
            throw new IllegalArgumentException("Registration failed. You are not verified as a current student.");
        }

        if (!verificationData.getFullName().equalsIgnoreCase(request.getFullName())) {
            log.warn("Registration failed: Full Name '{}' does not match verification data '{}'", request.getFullName(), verificationData.getFullName());
            throw new IllegalArgumentException("Full Name does not match Verification Data");
        }
        if (!verificationData.getMajor().equalsIgnoreCase(request.getMajor())) {
            log.warn("Registration failed: Major '{}' does not match verification data '{}'", request.getMajor(), verificationData.getMajor());
            throw new IllegalArgumentException("Major does not match Verification Data");
        }

        Role studentRole = roleRepository.findByName("STUDENT")
                .orElseThrow(() -> new IllegalArgumentException("STUDENT role missing in DB"));

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getCorporateEmail())
                .fullName(request.getFullName())
                .password(request.getPassword())
                .roles(new java.util.HashSet<>(java.util.Collections.singletonList(studentRole)))
                .status(User.UserStatus.PENDING)
                .isEmailVerified(false)
                .build();

        Student student = Student.builder()
                .studentCode(request.getStudentCode())
                .university(university)
                .major(request.getMajor())
                .corporateEmail(request.getCorporateEmail())
                .status("ACTIVE")
                .user(user)
                .build();

        studentRepository.save(student); // Saves both because of CascadeType.ALL on User

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
    public java.util.Map<String, Object> verifyEmail(VerifyEmailRequest request) {
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

        user.setIsEmailVerified(true);
        user.setStatus(User.UserStatus.ACTIVE);
        userRepository.save(user);

        tokenRepository.deleteByUser(user);

        // Generate auto-login payload
        java.util.List<String> userRoles = user.getRoles().stream()
                .map(Role::getName)
                .collect(java.util.stream.Collectors.toList());

        String activeRole;
        if (userRoles.contains("ADMIN")) {
            activeRole = "ADMIN";
        } else if (userRoles.contains("JUDGE")) {
            activeRole = "JUDGE";
        } else if (userRoles.contains("MENTOR")) {
            activeRole = "MENTOR";
        } else if (userRoles.contains("LEADER")) {
            activeRole = "LEADER";
        } else if (userRoles.contains("STUDENT")) {
            activeRole = "STUDENT";
        } else {
            activeRole = userRoles.isEmpty() ? "STUDENT" : userRoles.get(0);
        }

        String jwtToken = jwtUtils.generateToken(user.getUsername(), activeRole);
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", jwtToken);
        result.put("role", activeRole);
        result.put("allRoles", userRoles);
        result.put("username", user.getUsername());
        result.put("fullName", user.getFullName());
        result.put("isEmailVerified", String.valueOf(user.getIsEmailVerified()));
        result.put("message", "Email verified successfully. Account activated.");

        return result;
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

    private static String convertTemplateToRegex(String template) {
        if (template == null || template.trim().isEmpty()) {
            return "";
        }
        String trimmed = template.trim();
        if (trimmed.startsWith("^") && trimmed.endsWith("$")) {
            return trimmed;
        }

        String[] parts = trimmed.split(",");
        java.util.List<String> escapedParts = new java.util.ArrayList<>();
        for (String part : parts) {
            String p = part.trim();
            StringBuilder escaped = new StringBuilder();
            for (int i = 0; i < p.length(); i++) {
                char c = p.charAt(i);
                if (c == '#') {
                    escaped.append("[0-9]");
                } else if (c == '*') {
                    escaped.append("[a-zA-Z0-9._%+-]+");
                } else if (c == '\\' || c == '.' || c == '(' || c == ')' || c == '[' || c == ']' || c == '{' || c == '}' || c == '+' || c == '$' || c == '^' || c == '|' || c == '?') {
                    escaped.append('\\').append(c);
                } else {
                    escaped.append(c);
                }
            }
            escapedParts.add(escaped.toString());
        }

        if (escapedParts.size() == 1) {
            return "^" + escapedParts.get(0) + "$";
        } else {
            return "^(" + String.join("|", escapedParts) + ")$";
        }
    }
}