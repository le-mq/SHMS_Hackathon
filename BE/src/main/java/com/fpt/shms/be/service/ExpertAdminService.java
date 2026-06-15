package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.CreateExpertRequest;
import com.fpt.shms.be.model.Judge;
import com.fpt.shms.be.model.Mentor;
import com.fpt.shms.be.model.Role;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.repository.JudgeRepository;
import com.fpt.shms.be.repository.MentorRepository;
import com.fpt.shms.be.repository.RoleRepository;
import com.fpt.shms.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import com.fpt.shms.be.dto.ExpertDto;

@Service
@RequiredArgsConstructor
public class ExpertAdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JudgeRepository judgeRepository;
    private final MentorRepository mentorRepository;
    private final com.fpt.shms.be.repository.JudgeAssignmentRepository judgeAssignmentRepository;
    private final com.fpt.shms.be.repository.MentorAssignmentRepository mentorAssignmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void createExpert(CreateExpertRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        Set<String> distinctRoles = new HashSet<>();
        for (String selectedRole : request.getRoleSelection()) {
            switch (selectedRole.toUpperCase()) {
                case "JUDGE":
                case "GUEST JUDGE":
                    distinctRoles.add("JUDGE");
                    break;
                case "MENTOR":
                    distinctRoles.add("MENTOR");
                    break;
                default:
                    throw new IllegalArgumentException("Invalid role selection: " + selectedRole);
            }
        }

        if (distinctRoles.isEmpty()) {
            throw new IllegalArgumentException("No valid roles selected");
        }

        // Create User
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getProfessionalEmail())
                .fullName(request.getFullName())
                // TODO: Uncomment the line below and remove the plain text one to enable BCrypt hashing later
                // .password(passwordEncoder.encode(request.getPassword()))
                .password(request.getPassword()) // PLAIN TEXT FOR TESTING
                .status(User.UserStatus.ACTIVE)
                .roles(new HashSet<>())
                .build();
        user = userRepository.save(user);

        for (String roleName : distinctRoles) {
            Role role = roleRepository.findByName(roleName)
                    .orElseGet(() -> roleRepository.save(Role.builder().name(roleName).build()));

            user.getRoles().add(role);

            // Create Profile
            if (roleName.equals("JUDGE")) {
                Judge judge = Judge.builder()
                        .user(user)
                        .fullName(request.getFullName())
                        .professionalEmail(request.getProfessionalEmail())
                        .accessExpiry(request.getAccessExpiry())
                        .status("ACTIVE")
                        .build();
                judgeRepository.save(judge);
            } else if (roleName.equals("MENTOR")) {
                Mentor mentor = Mentor.builder()
                        .user(user)
                        .fullName(request.getFullName())
                        .professionalEmail(request.getProfessionalEmail())
                        .accessExpiry(request.getAccessExpiry())
                        .status("ACTIVE")
                        .build();
                mentorRepository.save(mentor);
            }
        }

        userRepository.save(user);
    }

    public List<ExpertDto> getAllExperts() {
        // Fetch all users with JUDGE or MENTOR roles
        List<User> experts = userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream()
                        .anyMatch(r -> r.getName().equals("JUDGE") || r.getName().equals("MENTOR")))
                .collect(Collectors.toList());

        List<ExpertDto> result = new ArrayList<>();
        for (User u : experts) {
            List<String> roles = u.getRoles().stream().map(Role::getName).collect(Collectors.toList());
            String fullName = "";
            String email = "";
            LocalDateTime expiry = null;

            if (roles.contains("JUDGE")) {
                Optional<Judge> judgeOpt = judgeRepository.findByUser(u);
                if (judgeOpt.isPresent()) {
                    fullName = judgeOpt.get().getFullName();
                    email = judgeOpt.get().getProfessionalEmail();
                    expiry = judgeOpt.get().getAccessExpiry();
                }
            }
            if (roles.contains("MENTOR") && fullName.isEmpty()) {
                Optional<Mentor> mentorOpt = mentorRepository.findByUser(u);
                if (mentorOpt.isPresent()) {
                    fullName = mentorOpt.get().getFullName();
                    email = mentorOpt.get().getProfessionalEmail();
                    expiry = mentorOpt.get().getAccessExpiry();
                }
            }

            result.add(ExpertDto.builder()
                    .userId(u.getId())
                    .username(u.getUsername())
                    .fullName(fullName)
                    .professionalEmail(email)
                    .roles(roles)
                    .accessExpiry(expiry)
                    .build());
        }
        return result;
    }

}
