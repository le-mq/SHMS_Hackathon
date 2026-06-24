package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.CreateAnnouncementRequest;
import com.fpt.shms.be.dto.CreateContestRequest;
import com.fpt.shms.be.model.*;
import com.fpt.shms.be.dto.CreateTrackRoundRequest;
import com.fpt.shms.be.repository.*;
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
    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final AnnouncementRepository announcementRepository;
    private final UniversityRepository universityRepository;
    private final TeamMentorRepository teamMentorRepository;
    private final AuditLogService auditLogService;

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
        List<Round> contestRounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(contestId);

        List<Map<String, Object>> tracks = categories.stream().map(c -> {
            List<Map<String, Object>> roundsList = contestRounds.stream()
                    .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(c.getId()))
                    .map(r -> {
                        Map<String, Object> roundMap = new HashMap<>();
                        roundMap.put("id", r.getId());
                        roundMap.put("phaseName", r.getPhaseName());
                        roundMap.put("submissionOpen", r.getSubmissionOpen() != null ? r.getSubmissionOpen().toString() : "");
                        roundMap.put("submissionDeadline", r.getSubmissionDeadline() != null ? r.getSubmissionDeadline().toString() : "");
                        roundMap.put("gradingOpenAt", r.getGradingOpenAt() != null ? r.getGradingOpenAt().toString() : "");
                        roundMap.put("gradingDeadlineAt", r.getGradingDeadlineAt() != null ? r.getGradingDeadlineAt().toString() : "");
                        roundMap.put("publishResultAt", r.getPublishResultAt() != null ? r.getPublishResultAt().toString() : "");
                        roundMap.put("state", r.getState() != null ? r.getState().name() : "UPCOMING");
                        return roundMap;
            }).toList();

            List<Team> catTeams = teamMentorRepository.findByCategoryId(c.getId())
                    .stream()
                    .map(com.fpt.shms.be.model.TeamMentor::getTeam)
                    .distinct()
                    .toList();
            List<Map<String, Object>> teamMaps = catTeams.stream()
                    .filter(t -> "APPROVED".equals(t.getStatus()))
                    .map(t -> {
                        Map<String, Object> tm = new HashMap<>();
                        tm.put("id", t.getId());
                        tm.put("name", t.getName());
                        return tm;
                    }).toList();

            Map<String, Object> trackMap = new HashMap<>();
            trackMap.put("id", c.getId());
            trackMap.put("categoryName", c.getName());
            trackMap.put("trackDescription", c.getDescription() != null ? c.getDescription() : "");
            trackMap.put("guidelineUrl", c.getGuidelineUrl() != null ? c.getGuidelineUrl() : "");
            trackMap.put("rounds", roundsList);
            trackMap.put("teams", teamMaps);
            return trackMap;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("id", contest.getId());
        response.put("name", contest.getName());
        response.put("theme",contest.getDescription() !=null ? contest.getDescription():"");
        response.put("term", contest.getSeason() != null ? contest.getSeason().name() : "");
        response.put("year", contest.getYear() != null ? contest.getYear() : "");
        response.put("registrationStart", contest.getRegistrationStart() != null ? contest.getRegistrationStart().toString() : "");
        response.put("registrationEnd", contest.getRegistrationEnd() != null ? contest.getRegistrationEnd().toString() : "");
        response.put("contestEndAt", contest.getContestEndAt() != null ? contest.getContestEndAt().toString() : "");
        response.put("status", contest.getStatus() != null ? contest.getStatus().name() : "UPCOMING");
        response.put("regionScope", contest.getRegionScope() != null ? contest.getRegionScope() : "");
        response.put("maximumAllowedTeams", contest.getMaximumAllowedTeams() != null ? contest.getMaximumAllowedTeams() : 100);
        response.put("complianceRules", contest.getComplianceRules() != null ? contest.getComplianceRules() : "");
        response.put("tieredPrizeStructures", contest.getTieredPrizeStructures() != null ? contest.getTieredPrizeStructures() : "");

        response.put("universities", domains);
        response.put("tracks", tracks);

        return response;
    }

    @Transactional
    public Contest createContest(CreateContestRequest request) {

        String semesterCode = request.getTerm().substring(0, Math.min(2, request.getTerm().length())).toUpperCase()
                + String.valueOf(request.getYear()).substring(2);

        Semester semester = semesterRepository.findByNameAndYear(request.getTerm(), request.getYear())
                .orElseGet(() -> semesterRepository.save(Semester.builder()
                        .name(request.getTerm())
                        .year(request.getYear())
                        .code(semesterCode)
                        .status(Semester.SemesterStatus.UPCOMING)
                        .build()));

        Contest contest;
        if (request.getId() != null) {
            contest = contestRepository.findById(request.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Contest not found"));
            if (!contest.getSemester().getId().equals(semester.getId())) {
                if (contestRepository.findBySemesterId(semester.getId()).isPresent()) {
                    throw new IllegalArgumentException("A contest already exists for the selected season (" + request.getTerm() + " " + request.getYear() + ").");
                }
            }
            contest.setSemester(semester);
        } else {
            if (contestRepository.findBySemesterId(semester.getId()).isPresent()) {
                throw new IllegalArgumentException("A contest already exists for this season (" + request.getTerm() + " " + request.getYear() + "). Cannot create a new one.");
            }
            contest = Contest.builder()
                    .semester(semester)
                    .status(Contest.ContestStatus.UPCOMING)
                    .build();
        }

        contest.setName(request.getName());
        contest.setDescription(request.getTheme());
        contest.setSeason(parseSeason(request.getTerm()));
        contest.setYear(request.getYear());
        contest.setRegionScope(request.getRegionScope());
        contest.setMaximumAllowedTeams(request.getMaximumAllowedTeams());
        contest.setComplianceRules(request.getComplianceRules());
        contest.setTieredPrizeStructures(request.getTieredPrizeStructures());
        contest.setRegistrationStart(request.getRegistrationStart());
        contest.setRegistrationEnd(request.getRegistrationEnd());
        contest.setContestEndAt(request.getContestEndAt());
        contest.setSemester(semester);

        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            try {
                Contest.ContestStatus newStatus = Contest.ContestStatus.valueOf(request.getStatus().toUpperCase());
                if (newStatus == Contest.ContestStatus.CLOSED && contest.getStatus() != Contest.ContestStatus.CLOSED) {

                    List<Category> categories = categoryRepository.findByContestId(contest.getId());
                    for (Category cat : categories) {
                        cat.setStatus("CLOSED");
                        categoryRepository.save(cat);
                    }

                    List<Round> rounds = roundRepository.findByContestId(contest.getId());
                    for (Round round : rounds) {
                        round.setState(Round.RoundState.CLOSED);
                        roundRepository.save(round);
                    }
                    Role teamLeaderRole = roleRepository.findByName("LEADER").orElse(null);
                    Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

                    List<Team> teams = teamRepository.findByContestId(contest.getId());
                    for (Team team : teams) {
                        team.setStatus("CLOSED");

                        if (teamLeaderRole != null && studentRole != null) {
                            List<TeamMembership> memberships = teamMembershipRepository.findByTeamId(team.getId());
                            for (TeamMembership tm : memberships) {
                                if ("LEADER".equalsIgnoreCase(tm.getRole())) {
                                    User u = tm.getStudent().getUser();
                                    if (u != null && u.getRoles().contains(teamLeaderRole)) {
                                        u.getRoles().remove(teamLeaderRole);
                                        if (!u.getRoles().contains(studentRole)) {
                                            u.getRoles().add(studentRole);   
                                        }
                                        userRepository.save(u);
                                    }
                                }
                            }
                        }
                    }
                    teamRepository.saveAll(teams);
                }
            } catch (IllegalArgumentException e) {
            }
        }

        contest = contestRepository.save(contest);
        
        String action = (request.getId() != null) ? "UPDATE_CONTEST" : "CREATE_CONTEST";
        auditLogService.log(action, "Contest", contest.getId(), null, contest.getStatus().name(), contest.getName());

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
        category.setStatus(request.getStatus() != null ? request.getStatus().replace("INACTIVE", "INACTIVED").replace("ACTIVE", "ACTIVED") : "ACTIVED");
        category = categoryRepository.save(category);

        LocalDateTime now = LocalDateTime.now();

        List<Round> existingRounds = roundRepository.findByCategoryIdOrderBySubmissionOpenAsc(category.getId());

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
            round.setGradingOpenAt(roundDto.getGradingOpenAt());
            round.setGradingDeadlineAt(roundDto.getGradingDeadlineAt());
            round.setPublishResultAt(roundDto.getPublishResultAt());
            round.setState(state);
            round.setContest(contest);
            round.setCategory(category);
            roundRepository.save(round);
        }

        List<String> requestedPhaseNames = request.getRounds().stream()
                .map(CreateTrackRoundRequest.RoundDto::getPhaseName)
                .toList();
        List<Long> requestedIds = request.getRounds().stream()
                .map(CreateTrackRoundRequest.RoundDto::getId)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (contest.getStatus() == Contest.ContestStatus.UPCOMING) {
            existingRounds.removeIf(r -> {
                boolean inRequest = (r.getId() != null && requestedIds.contains(r.getId())) ||
                        (r.getId() == null && requestedPhaseNames.contains(r.getPhaseName()));
                if (!inRequest) {
                    roundRepository.delete(r);
                    return true;
                }
                return false;
            });
        }

        Category savedCategory = categoryRepository.save(category);
        auditLogService.log("UPDATE_CATEGORY", "Category", savedCategory.getId(), null, savedCategory.getStatus(), "Update Track and Rounds");
        return savedCategory;
    }

    @org.springframework.transaction.annotation.Transactional
    public Announcement createAnnouncement(CreateAnnouncementRequest request) {
        Contest contest = contestRepository.findById(request.getContestId())
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

        Announcement announcement = Announcement.builder()
                .contest(contest)
                .title(request.getTitle())
                .content(request.getContent())
                .type(request.getType())
                .publishedAt(java.time.LocalDateTime.now())
                .isActive(true)
                .status("ACTIVE")
                .build();

        Announcement savedAnnouncement = announcementRepository.save(announcement);
        auditLogService.log("CREATE_ANNOUNCEMENT", "Announcement", savedAnnouncement.getId(), null, savedAnnouncement.getStatus(), request.getTitle());
        return savedAnnouncement;
    }

    private Contest.Season parseSeason(String term) {
        try {
            return Contest.Season.valueOf(term.toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }
}