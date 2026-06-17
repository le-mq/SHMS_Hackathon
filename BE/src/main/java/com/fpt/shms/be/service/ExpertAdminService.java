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


        User user = User.builder()
                .username(request.getUsername())
                .email(request.getProfessionalEmail())
                .fullName(request.getFullName())
                .password(request.getPassword())
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

    @Transactional
    public void extendExpiry(Long userId, LocalDateTime newExpiry) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isJudge = user.getRoles().stream().anyMatch(r -> r.getName().equals("JUDGE"));
        boolean isMentor = user.getRoles().stream().anyMatch(r -> r.getName().equals("MENTOR"));

        if (isJudge) {
            Optional<Judge> jOpt = judgeRepository.findByUser(user);
            if (jOpt.isPresent()) {
                jOpt.get().setAccessExpiry(newExpiry);
                judgeRepository.save(jOpt.get());
            } else {
                Judge j = Judge.builder().user(user).fullName(user.getFullName()).professionalEmail(user.getEmail()).accessExpiry(newExpiry).status("ACTIVE").build();
                judgeRepository.save(j);
            }
        }

        if (isMentor) {
            Optional<Mentor> mOpt = mentorRepository.findByUser(user);
            if (mOpt.isPresent()) {
                mOpt.get().setAccessExpiry(newExpiry);
                mentorRepository.save(mOpt.get());
            } else {
                Mentor m = Mentor.builder().user(user).fullName(user.getFullName()).professionalEmail(user.getEmail()).accessExpiry(newExpiry).status("ACTIVE").build();
                mentorRepository.save(m);
            }
        }
    }

    @Transactional
    public void updateExpertRoles(Long userId, java.util.List<String> newRoleNames) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.getRoles().clear();
        for (String roleName : newRoleNames) {
            String tempRole = "JUDGE";
            if (roleName.equalsIgnoreCase("Mentor")) tempRole = "MENTOR";
            final String dbRole = tempRole;
            Role role = roleRepository.findByName(dbRole)
                    .orElseGet(() -> roleRepository.save(Role.builder().name(dbRole).build()));
            user.getRoles().add(role);
        }
        userRepository.save(user);

        // Quản lý hồ sơ tương ứng của Judge/Mentor.
        boolean hasJudge = newRoleNames.stream().anyMatch(r -> r.equalsIgnoreCase("Judge") || r.equalsIgnoreCase("Guest Judge"));
        boolean hasMentor = newRoleNames.stream().anyMatch(r -> r.equalsIgnoreCase("Mentor"));

        Optional<Judge> jOpt = judgeRepository.findByUser(user);
        if (hasJudge && jOpt.isEmpty()) {
            judgeRepository.save(Judge.builder().user(user).fullName(user.getFullName()).professionalEmail(user.getEmail()).accessExpiry(LocalDateTime.now().plusMonths(1)).status("ACTIVE").build());
        } else if (!hasJudge && jOpt.isPresent()) {
            judgeRepository.delete(jOpt.get());
        }

        Optional<Mentor> mOpt = mentorRepository.findByUser(user);
        if (hasMentor && mOpt.isEmpty()) {
            mentorRepository.save(Mentor.builder().user(user).fullName(user.getFullName()).professionalEmail(user.getEmail()).accessExpiry(LocalDateTime.now().plusMonths(1)).status("ACTIVE").build());
        } else if (!hasMentor && mOpt.isPresent()) {
            mentorRepository.delete(mOpt.get());
        }
    }

    @Transactional
    public void deleteExpert(Long userId) {
        judgeAssignmentRepository.findAll().stream()
                .filter(ja -> ja.getUser().getId().equals(userId))
                .forEach(judgeAssignmentRepository::delete);

        mentorAssignmentRepository.findAll().stream()
                .filter(ma -> ma.getUser().getId().equals(userId))
                .forEach(mentorAssignmentRepository::delete);

        judgeRepository.findAll().stream()
                .filter(j -> j.getUser().getId().equals(userId))
                .forEach(judgeRepository::delete);

        mentorRepository.findAll().stream()
                .filter(m -> m.getUser().getId().equals(userId))
                .forEach(mentorRepository::delete);

        userRepository.findById(userId).ifPresent(user -> {
            user.getRoles().clear();
            userRepository.save(user);
            userRepository.delete(user);
        });
    }


}
