package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.RegisterRequest;
import com.fpt.shms.be.model.Role;
import com.fpt.shms.be.model.StudentVerificationData;
import com.fpt.shms.be.model.University;
import com.fpt.shms.be.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private StudentVerificationDataRepository verificationDataRepository;

    @Mock
    private VerificationTokenRepository tokenRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UniversityRepository universityRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest request;
    private University university;

    @BeforeEach
    void setUp() {
        request = new RegisterRequest();
        request.setUsername("testuser");
        request.setPassword("Password@123");
        request.setFullName("Nguyen Van A");
        request.setTargetUniversity("FPT University HCMC");
        request.setMssv("SE123456");
        request.setCorporateEmail("anvse123456@fpt.edu.vn");
        request.setMajor("Software Engineering");

        university = University.builder()
                .id(1L)
                .name("FPT University HCMC")
                .studentCodeRegex("^[A-Z]{2}\\d{6}$")
                .emailRegex("^[a-zA-Z0-9._%+-]+@fpt\\.edu\\.vn$")
                .status("ACTIVE")
                .build();
    }

    @Test
    void register_usernameExists_throwsException() {
        when(userRepository.existsByUsername(request.getUsername())).thenReturn(true);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("Username is already taken", exception.getMessage());
    }

    @Test
    void register_mssvExists_throwsException() {
        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(true);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("MSSV is already registered", exception.getMessage());
    }

    @Test
    void register_emailExists_throwsException() {
        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(true);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("Email is already registered", exception.getMessage());
    }

    @Test
    void register_universityNotFound_throwsException() {
        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(false);
        when(universityRepository.findByName(request.getTargetUniversity())).thenReturn(Optional.empty());

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("University not found", exception.getMessage());
    }

    @Test
    void register_invalidEmailFormat_throwsException() {
        request.setCorporateEmail("invalid-email@other.com");

        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(false);
        when(universityRepository.findByName(request.getTargetUniversity())).thenReturn(Optional.of(university));

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("Invalid university email format", exception.getMessage());
    }

    @Test
    void register_invalidStudentCodeFormat_throwsException() {
        request.setMssv("invalid_code");

        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(false);
        when(universityRepository.findByName(request.getTargetUniversity())).thenReturn(Optional.of(university));

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("Invalid student code format", exception.getMessage());
    }

    @Test
    void register_studentNotFoundInVerificationData_throwsException() {
        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(false);
        when(universityRepository.findByName(request.getTargetUniversity())).thenReturn(Optional.of(university));
        when(verificationDataRepository.findByUniversityIdAndMssvAndCorporateEmail(
                university.getId(), request.getMssv(), request.getCorporateEmail())).thenReturn(Optional.empty());

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("Student not found in university verification data", exception.getMessage());
    }

    @Test
    void register_fullNameMismatch_throwsException() {
        StudentVerificationData svd = StudentVerificationData.builder()
                .mssv("SE123456")
                .fullName("Different Name")
                .corporateEmail("anvse123456@fpt.edu.vn")
                .major("Software Engineering")
                .university(university)
                .build();

        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(false);
        when(universityRepository.findByName(request.getTargetUniversity())).thenReturn(Optional.of(university));
        when(verificationDataRepository.findByUniversityIdAndMssvAndCorporateEmail(
                university.getId(), request.getMssv(), request.getCorporateEmail())).thenReturn(Optional.of(svd));

        Exception exception = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertEquals("Full Name does not match Verification Data", exception.getMessage());
    }

    @Test
    void register_success() {
        StudentVerificationData svd = StudentVerificationData.builder()
                .mssv("SE123456")
                .fullName("Nguyen Van A")
                .corporateEmail("anvse123456@fpt.edu.vn")
                .major("Software Engineering")
                .university(university)
                .build();

        when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
        when(studentRepository.existsByMssv(request.getMssv())).thenReturn(false);
        when(studentRepository.existsByCorporateEmail(request.getCorporateEmail())).thenReturn(false);
        when(universityRepository.findByName(request.getTargetUniversity())).thenReturn(Optional.of(university));
        when(verificationDataRepository.findByUniversityIdAndMssvAndCorporateEmail(
                university.getId(), request.getMssv(), request.getCorporateEmail())).thenReturn(Optional.of(svd));
        when(roleRepository.findByName("TEAM_MEMBER")).thenReturn(Optional.of(Role.builder().name("TEAM_MEMBER").build()));

        String result = authService.register(request);

        assertEquals("Registration successful. OTP sent to email. Please verify your account.", result);
        verify(studentRepository, times(1)).save(any());
        verify(tokenRepository, times(1)).save(any());
        verify(emailService, times(1)).sendVerificationEmail(eq(request.getCorporateEmail()), any());
    }
}
