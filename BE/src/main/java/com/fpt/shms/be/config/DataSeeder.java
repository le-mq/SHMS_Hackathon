package com.fpt.shms.be.config;

import com.fpt.shms.be.model.*;
import com.fpt.shms.be.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

    @Bean
    @Profile("!prod")
    CommandLineRunner seedDatabase(
            ContestRepository contestRepo,
            AnnouncementRepository announcementRepo,
            CategoryRepository categoryRepo,
            RoundRepository roundRepo,
            SemesterRepository semesterRepo,
            UniversityRepository universityRepo,
            StudentVerificationDataRepository verificationRepo,
            UserRepository userRepo,
            RoleRepository roleRepo,
            CoordinatorRepository coordinatorRepo,
            JudgeRepository judgeRepo,
            MentorRepository mentorRepo,
            StudentRepository studentRepo
    ) {
        return args -> {
            Role coordRole = roleRepo.findByName("COORDINATOR")
                    .orElseGet(() -> roleRepo.save(Role.builder().name("COORDINATOR").build()));
            Role judgeRole = roleRepo.findByName("JUDGE")
                    .orElseGet(() -> roleRepo.save(Role.builder().name("JUDGE").build()));
            Role mentorRole = roleRepo.findByName("MENTOR")
                    .orElseGet(() -> roleRepo.save(Role.builder().name("MENTOR").build()));
            Role teamMemberRole = roleRepo.findByName("TEAM_MEMBER")
                    .orElseGet(() -> roleRepo.save(Role.builder().name("TEAM_MEMBER").build()));
            Role adminRole = roleRepo.findByName("ADMIN")
                    .orElseGet(() -> roleRepo.save(Role.builder().name("ADMIN").build()));

            User coordinator = userRepo.findByUsername("coordinator@shms.edu.vn")
                    .orElseGet(() -> userRepo.save(User.builder()
                            .username("coordinator@shms.edu.vn")
                            .email("coordinator@shms.edu.vn")
                            .fullName("Demo Coordinator")
                            .password("Coord@123")
                            .status(User.UserStatus.ACTIVE)
                            .roles(new HashSet<>(Set.of(coordRole)))
                            .isEmailVerified(true)
                            .build()));
            coordinatorRepo.findByUser(coordinator).orElseGet(() -> coordinatorRepo.save(Coordinator.builder().user(coordinator).status("ACTIVE").build()));

            User judgeUser = userRepo.findByUsername("judge@shms.edu.vn")
                    .orElseGet(() -> userRepo.save(User.builder()
                            .username("judge@shms.edu.vn")
                            .email("judge@shms.edu.vn")
                            .fullName("Demo Judge")
                            .password("Judge@123")
                            .status(User.UserStatus.ACTIVE)
                            .roles(new HashSet<>(Set.of(judgeRole)))
                            .isEmailVerified(true)
                            .build()));
            judgeRepo.findByUser(judgeUser).orElseGet(() -> judgeRepo.save(Judge.builder().user(judgeUser).expertise("Software").status("ACTIVE").build()));

            User mentorUser = userRepo.findByUsername("mentor@shms.edu.vn")
                    .orElseGet(() -> userRepo.save(User.builder()
                            .username("mentor@shms.edu.vn")
                            .email("mentor@shms.edu.vn")
                            .fullName("Demo Mentor")
                            .password("Mentor@123")
                            .status(User.UserStatus.ACTIVE)
                            .roles(new HashSet<>(Set.of(mentorRole)))
                            .isEmailVerified(true)
                            .build()));
            mentorRepo.findByUser(mentorUser).orElseGet(() -> mentorRepo.save(Mentor.builder().user(mentorUser).status("ACTIVE").build()));

            User admin = userRepo.findByUsername("admin@shms.edu.vn")
                    .orElseGet(() -> userRepo.save(User.builder()
                            .username("admin@shms.edu.vn")
                            .email("admin@shms.edu.vn")
                            .fullName("Demo Admin")
                            .password("Admin@123")
                            .status(User.UserStatus.ACTIVE)
                            .roles(new HashSet<>(Set.of(adminRole)))
                            .isEmailVerified(true)
                            .build()));

            University fpt = universityRepo.findByName("FPT University HCMC")
                    .orElseGet(() -> universityRepo.save(University.builder()
                            .name("FPT University HCMC")
                            .universityCode("FPT-HCMC")
                            .studentCodeRegex("^[A-Z]{2}\\d{6}$")
                            .emailRegex("^[a-zA-Z0-9._%+-]+@fpt\\.edu\\.vn$")
                            .status("ACTIVE")
                            .build()));

            User studentUser = userRepo.findByUsername("student@fpt.edu.vn")
                    .orElseGet(() -> userRepo.save(User.builder()
                            .username("student@fpt.edu.vn")
                            .email("anvse123456@fpt.edu.vn")
                            .fullName("Nguyen Van A")
                            .password("Student@123")
                            .status(User.UserStatus.ACTIVE)
                            .roles(new HashSet<>(Set.of(teamMemberRole)))
                            .isEmailVerified(true)
                            .build()));
            studentRepo.findByUser(studentUser).orElseGet(() -> studentRepo.save(Student.builder()
                    .user(studentUser)
                    .university(fpt)
                    .mssv("SE123456")
                    .major("Software Engineering")
                    .corporateEmail("anvse123456@fpt.edu.vn")
                    .status("ACTIVE")
                    .build()));

            if (contestRepo.count() > 0) {
                log.info("DataSeeder: sample data already exists.");
                return;
            }

            Semester springSemester = semesterRepo.save(Semester.builder().name("SPRING").year(2026).code("SP26").build());
            Semester summerSemester = semesterRepo.save(Semester.builder().name("SUMMER").year(2026).code("SU26").build());
            Semester fallSemester = semesterRepo.save(Semester.builder().name("FALL").year(2026).code("FA26").build());

            Contest spring = contestRepo.save(Contest.builder()
                    .name("Innovation Sprint")
                    .semester(springSemester)
                    .status(Contest.ContestStatus.ACTIVE)
                    .description("Build innovative solutions to real-world problems.")
                    .regionScope("Vietnam")
                    .maximumAllowedTeams(100)
                    .build());

            Contest summer = contestRepo.save(Contest.builder()
                    .name("The Grand Challenge")
                    .semester(summerSemester)
                    .status(Contest.ContestStatus.UPCOMING)
                    .description("The flagship summer hackathon.")
                    .regionScope("Vietnam")
                    .maximumAllowedTeams(100)
                    .build());

            contestRepo.save(Contest.builder()
                    .name("Enterprise Architect")
                    .semester(fallSemester)
                    .status(Contest.ContestStatus.UPCOMING)
                    .description("Build scalable enterprise-grade systems.")
                    .regionScope("Vietnam")
                    .maximumAllowedTeams(100)
                    .build());

            categoryRepo.saveAll(List.of(
                    Category.builder().name("AI & Machine Learning").description("Technology").contest(spring).status("OPEN").build(),
                    Category.builder().name("FinTech Solutions").description("Banking & Finance").contest(spring).status("OPEN").build(),
                    Category.builder().name("Blockchain for Governance").description("Cryptography").contest(summer).status("SOON").build(),
                    Category.builder().name("Sustainable Green-Tech").description("Environment").contest(spring).status("OPEN").build(),
                    Category.builder().name("Mobile App Innovation").description("General Software").contest(spring).status("OPEN").build()
            ));

            roundRepo.saveAll(List.of(
                    Round.builder().contest(spring).phaseName("Preliminary Round").submissionOpen(LocalDateTime.now().minusDays(1)).submissionDeadline(LocalDateTime.now().plusDays(14)).submissionFormat("PDF").state(Round.RoundState.ACTIVE).roundOrder(1).build(),
                    Round.builder().contest(spring).phaseName("Final Round").submissionOpen(LocalDateTime.now().plusDays(15)).submissionDeadline(LocalDateTime.now().plusDays(30)).submissionFormat("ZIP").state(Round.RoundState.UPCOMING).roundOrder(2).build()
            ));

            if (verificationRepo.count() == 0) {
                verificationRepo.save(StudentVerificationData.builder()
                        .mssv("SE123456")
                        .fullName("Nguyen Van A")
                        .corporateEmail("anvse123456@fpt.edu.vn")
                        .major("Software Engineering")
                        .university(fpt)
                        .build());
            }

            log.info("DataSeeder: sample data inserted successfully.");
        };
    }
}
