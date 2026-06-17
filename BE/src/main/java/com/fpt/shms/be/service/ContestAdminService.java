package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.CreateContestRequest;
import com.fpt.shms.be.model.Contest;
import com.fpt.shms.be.model.ContestUniversity;
import com.fpt.shms.be.model.Semester;
import com.fpt.shms.be.model.Category;
import com.fpt.shms.be.model.Round;
import com.fpt.shms.be.dto.CreateTrackRoundRequest;
import com.fpt.shms.be.repository.ContestRepository;
import com.fpt.shms.be.repository.ContestUniversityRepository;
import com.fpt.shms.be.repository.SemesterRepository;
import com.fpt.shms.be.repository.CategoryRepository;
import com.fpt.shms.be.repository.RoundRepository;
import com.fpt.shms.be.repository.UserRepository;
import com.fpt.shms.be.repository.RoleRepository;
import com.fpt.shms.be.repository.UniversityRepository;
import com.fpt.shms.be.model.User;
import com.fpt.shms.be.model.Role;
import com.fpt.shms.be.model.University;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class ContestAdminService {

    private final ContestRepository contestRepository;
    private final SemesterRepository semesterRepository;
    private final ContestUniversityRepository contestUniversityRepository;
    private final CategoryRepository categoryRepository;
    private final RoundRepository roundRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UniversityRepository universityRepository;

    public List<Contest> getAllContests() {
        return contestRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getContestDetails(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

        List<ContestUniversity> universities = contestUniversityRepository.findByContestId(contestId);
        List<String> domains = universities.stream().map(ContestUniversity::getCorporateDomain).toList();

        List<Category> categories = categoryRepository.findByContestId(contestId);
        List<Round> contestRounds = roundRepository.findByContestId(contestId);

        List<Map<String, Object>> tracks = categories.stream().map(c -> {
            List<Map<String, Object>> roundsList = contestRounds.stream().map(r -> {
                Map<String, Object> roundMap = new HashMap<>();
                roundMap.put("id", r.getId());
                roundMap.put("phaseName", r.getPhaseName());
                roundMap.put("submissionOpen", r.getSubmissionOpen() != null ? r.getSubmissionOpen().toString() : "");
                roundMap.put("submissionDeadline", r.getSubmissionDeadline() != null ? r.getSubmissionDeadline().toString() : "");
                roundMap.put("submissionFormat", r.getSubmissionFormat() != null ? r.getSubmissionFormat() : "PDF");
                roundMap.put("state", r.getState() != null ? r.getState().name() : "UPCOMING");
                return roundMap;
            }).toList();

            Map<String, Object> trackMap = new HashMap<>();
            trackMap.put("id", c.getId());
            trackMap.put("categoryName", c.getName());
            trackMap.put("trackDescription", c.getDescription() != null ? c.getDescription() : "");
            trackMap.put("guidelineUrl", c.getGuidelineUrl() != null ? c.getGuidelineUrl() : "");
            trackMap.put("rounds", roundsList);
//
            return trackMap;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("id", contest.getId());
        response.put("name", contest.getName());
        response.put("term", contest.getSeason() != null ? contest.getSeason().name() : "");
        response.put("year", contest.getYear() != null ? contest.getYear() : "");
        response.put("registrationStart", contest.getRegistrationStart() != null ? contest.getRegistrationStart().toString() : "");
        response.put("registrationEnd", contest.getRegistrationEnd() != null ? contest.getRegistrationEnd().toString() : "");
        response.put("status", contest.getStatus() != null ? contest.getStatus().name() : "UPCOMING");
        response.put("regionScope", contest.getRegionScope() != null ? contest.getRegionScope() : "");
        response.put("maximumAllowedTeams", contest.getMaximumAllowedTeams() != null ? contest.getMaximumAllowedTeams() : 100);
        response.put("complianceRules", contest.getComplianceRules() != null ? contest.getComplianceRules() : "");
        response.put("tieredPrizeStructures", contest.getTieredPrizeStructures() != null ? contest.getTieredPrizeStructures() : "");
        response.put("heroBrandingBanner", contest.getHeroBrandingBanner() != null ? contest.getHeroBrandingBanner() : "");
        response.put("universities", domains);
        response.put("tracks", tracks);

        return response;
    }

    @Transactional
    public Contest createContest(CreateContestRequest request) {
        // Tạo mã ngắn: 2 ký tự đầu tiên của thuật ngữ + 2 chữ số cuối của năm (ví dụ: SU26)
        String semesterCode = request.getTerm().substring(0, Math.min(2, request.getTerm().length())).toUpperCase()
                + String.valueOf(request.getYear()).substring(2);

        Semester semester = semesterRepository.findByNameAndYear(request.getTerm(), request.getYear())
                .orElseGet(() -> semesterRepository.save(Semester.builder()
                        .name(request.getTerm())
                        .year(request.getYear())
                        .code(semesterCode)
                        .status(Semester.SemesterStatus.UPCOMING)
                        .build()));

        Contest contest = contestRepository.findBySemesterId(semester.getId())
                .orElseGet(() -> Contest.builder()
                        .semester(semester)
                        .status(Contest.ContestStatus.UPCOMING)
                        .build());

        contest.setName(request.getName());
        contest.setSeason(parseSeason(request.getTerm()));
        contest.setYear(request.getYear());
        contest.setRegionScope(request.getRegionScope());
        contest.setMaximumAllowedTeams(request.getMaximumAllowedTeams());
        contest.setAllowedCorporateDomains(request.getAllowedCorporateDomains());
        contest.setTrackThemes(request.getTrackThemes());
        contest.setComplianceRules(request.getComplianceRules());
        contest.setTieredPrizeStructures(request.getTieredPrizeStructures());
        contest.setHeroBrandingBanner(request.getHeroBrandingBanner());
        contest.setRegistrationStart(request.getRegistrationStart());
        contest.setRegistrationEnd(request.getRegistrationEnd());
        contest.setSemester(semester);

        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            try {
                Contest.ContestStatus newStatus = Contest.ContestStatus.valueOf(request.getStatus().toUpperCase());
                if (newStatus == Contest.ContestStatus.CLOSED && contest.getStatus() != Contest.ContestStatus.CLOSED) {

                    Role teamLeaderRole = roleRepository.findByName("TEAM_LEADER").orElse(null);
                    Role teamMemberRole = roleRepository.findByName("TEAM_MEMBER").orElse(null);

                    if (teamLeaderRole != null && teamMemberRole != null) {
                        List<User> leaders = userRepository.findAll().stream()
                                .filter(u -> u.getRoles().contains(teamLeaderRole))
                                .toList();
                        for (User u : leaders) {
                            u.getRoles().remove(teamLeaderRole);
                            u.getRoles().add(teamMemberRole);
                            userRepository.save(u);
                        }
                    }
                }
                contest.setStatus(newStatus);
            } catch (IllegalArgumentException e) {

            }
        }

        contest = contestRepository.save(contest);


        contestUniversityRepository.deleteByContest(contest);

        if (request.getAllowedCorporateDomains() != null && !request.getAllowedCorporateDomains().isEmpty()) {
            String[] domains = request.getAllowedCorporateDomains().split(",");
            for (String domain : domains) {
                String partner = domain.trim();
                if (partner.isEmpty()) {
                    continue;
                }
                University university = universityRepository.findByName(partner)
                        .orElseThrow(() -> new IllegalArgumentException("University not found: " + partner));
                contestUniversityRepository.save(ContestUniversity.builder()
                        .contest(contest)
                        .university(university)
                        .build());
            }
        }

        return contest;
    }

    @Transactional
    public Category createTrackAndRounds(CreateTrackRoundRequest request) {
        Contest contest = contestRepository.findById(request.getContestId())
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

        Category category = categoryRepository.findByNameAndContest(request.getCategoryName(), contest)
                .orElseGet(() -> Category.builder()
                        .name(request.getCategoryName())
                        .contest(contest)
                        .rounds(new ArrayList<>())
                        .build());

        category.setDescription(request.getTrackDescription());
        category.setGuidelineUrl(request.getGuidelineUrl());

        LocalDateTime now = LocalDateTime.now();

        List<Round> existingRounds = roundRepository.findByContestId(contest.getId());
        for (CreateTrackRoundRequest.RoundDto roundDto : request.getRounds()) {
            if (roundDto.getSubmissionDeadline().isBefore(roundDto.getSubmissionOpen())) {
                throw new IllegalArgumentException("Deadline cannot be before open time for " + roundDto.getPhaseName());
            }


            Round.RoundState state = Round.RoundState.UPCOMING;
            if (roundDto.getState() != null) {
                try {
                    state = Round.RoundState.valueOf(roundDto.getState().toUpperCase());
                } catch (IllegalArgumentException e) {
                    if (now.isAfter(roundDto.getSubmissionOpen()) && now.isBefore(roundDto.getSubmissionDeadline())) {
                        state = Round.RoundState.ACTIVE;
                    } else if (now.isAfter(roundDto.getSubmissionDeadline())) {
                        state = Round.RoundState.CLOSED;
                    }
                }
            }

            Round round = null;
            if (roundDto.getId() != null) {
                round = existingRounds.stream()
                        .filter(r -> roundDto.getId().equals(r.getId()))
                        .findFirst()
                        .orElse(null);
            }


            if (round == null) {
                round = existingRounds.stream()
                        .filter(r -> r.getPhaseName().equals(roundDto.getPhaseName()))
                        .findFirst()
                        .orElse(null);
            }

            if (round == null) {
                round = Round.builder()
                        .phaseName(roundDto.getPhaseName())
                        .contest(contest)
                        .build();
            } else {
                round.setPhaseName(roundDto.getPhaseName());
            }

            round.setSubmissionOpen(roundDto.getSubmissionOpen());
            round.setSubmissionDeadline(roundDto.getSubmissionDeadline());
            round.setSubmissionFormat(roundDto.getSubmissionFormat() != null ? roundDto.getSubmissionFormat() : "PDF");
            round.setState(state);
            round.setContest(contest);
            roundRepository.save(round);
        }

        return categoryRepository.save(category);
    }


    private Contest.Season parseSeason(String term) {
        try {
            return Contest.Season.valueOf(term.toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }
}
