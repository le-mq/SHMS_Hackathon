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
    private final SubmissionRepository submissionRepository;
    private final RankingResultRepository rankingResultRepository;
    private final AdminRepository adminRepository;

    @Transactional
    public List<Contest> getAllContests() {
        List<Contest> contests = contestRepository.findAll();
        boolean anyChanged = false;
        for (Contest c : contests) {
            if (c.checkAndSyncStatus()) {
                contestRepository.save(c);
                anyChanged = true;
            }
        }
        if (anyChanged) {
            contestRepository.flush();
        }
        return contests;
    }

    private List<Team> getParticipatingTeamsForRound(Round round) {
        if (round.getCategory() == null) {
            return new ArrayList<>();
        }
        Long categoryId = round.getCategory().getId();
        List<Round> categoryRounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(round.getContest().getId())
                .stream()
                .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(categoryId))
                .sorted(java.util.Comparator.comparing(Round::getSubmissionOpen))
                .toList();

        int idx = -1;
        for (int i = 0; i < categoryRounds.size(); i++) {
            if (categoryRounds.get(i).getId().equals(round.getId())) {
                idx = i;
                break;
            }
        }

        if (idx <= 0) {
            return teamRepository.findByContestId(round.getContest().getId()).stream()
                    .filter(t -> t != null && "APPROVED".equals(t.getStatus()))
                    .toList();
        } else {
            Round previousRound = categoryRounds.get(idx - 1);
            return rankingResultRepository.findQualifiedByRoundId(previousRound.getId()).stream()
                    .filter(rr -> rr.getDatePublishedAt() != null)
                    .map(RankingResult::getTeam)
                    .filter(t -> t != null && "APPROVED".equals(t.getStatus()))
                    .toList();
        }
    }

    @Transactional
    public List<Round> getAndSyncRoundsForContest(Long contestId) {
        List<Round> rounds = roundRepository.findByContestIdOrderBySubmissionOpenAsc(contestId);
        boolean anyChanged = false;
        for (Round r : rounds) {
            if (r.checkAndSyncState()) {
                roundRepository.save(r);
                anyChanged = true;
            }
        }
        if (anyChanged) {
            roundRepository.flush();
        }
        return rounds;
    }

    @Transactional
    public Map<String, Object> getContestDetails(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));
        if (contest.checkAndSyncStatus()) {
            contestRepository.save(contest);
        }

        List<ContestUniversity> universities = contestUniversityRepository.findByContestId(contestId);
        List<String> domains = universities.stream().map(ContestUniversity::getCorporateDomain).toList();

        List<Category> categories = categoryRepository.findByContestId(contestId);
        List<Round> contestRounds = getAndSyncRoundsForContest(contestId);

        List<Map<String, Object>> tracks = categories.stream().map(c -> {
            List<Map<String, Object>> roundsList = contestRounds.stream()
                    .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(c.getId()))
                    .map(r -> {
                        Map<String, Object> roundMap = new HashMap<>();
                        roundMap.put("id", r.getId());
                        roundMap.put("phaseName", r.getPhaseName());
                        roundMap.put("submissionOpen",
                                r.getSubmissionOpen() != null ? r.getSubmissionOpen().toString() : "");
                        roundMap.put("submissionDeadline",
                                r.getSubmissionDeadline() != null ? r.getSubmissionDeadline().toString() : "");
                        roundMap.put("gradingDeadlineAt",
                                r.getGradingDeadlineAt() != null ? r.getGradingDeadlineAt().toString() : "");
                        roundMap.put("reviewCalibrationAt",
                                r.getReviewCalibrationAt() != null ? r.getReviewCalibrationAt().toString() : "");
                        roundMap.put("publishResultAt",
                                r.getPublishResultAt() != null ? r.getPublishResultAt().toString() : "");
                        roundMap.put("isScorePublished",
                                submissionRepository.existsByRoundIdAndHistoryLogIsPublished(r.getId()));
                        roundMap.put("state", r.getState() != null ? r.getState().name() : "UPCOMING");
                        roundMap.put("submissionRequirements",
                                r.getSubmissionRequirements() != null ? r.getSubmissionRequirements() : "");
                        roundMap.put("roundFormat", r.getRoundFormat() != null ? r.getRoundFormat() : "");

                        List<Team> dynamicParticipatingTeams = getParticipatingTeamsForRound(r);
                        roundMap.put("totalTeams", dynamicParticipatingTeams.size());

                        List<Submission> roundSubs = submissionRepository.findByRoundId(r.getId());
                        Map<Long, String> teamLatestStatus = new HashMap<>();
                        for (Submission sub : roundSubs) {
                            if (sub.getTeam() != null) {
                                teamLatestStatus.put(sub.getTeam().getId(), sub.getStatus());
                            }
                        }

                        long submittedCount = dynamicParticipatingTeams.stream()
                                .filter(team -> "SUBMITTED".equalsIgnoreCase(teamLatestStatus.get(team.getId())))
                                .count();

                        roundMap.put("submittedTeams", (int) submittedCount);

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
            trackMap.put("status", c.getStatus() != null ? c.getStatus() : "ACTIVED");
            trackMap.put("rounds", roundsList);
            trackMap.put("teams", teamMaps);
            return trackMap;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("id", contest.getId());
        response.put("name", contest.getName());
        response.put("theme", contest.getTheme() != null ? contest.getTheme() : "");
        response.put("description", contest.getDescription() != null ? contest.getDescription() : "");
        response.put("term", contest.getSeason() != null ? contest.getSeason().name() : "");
        response.put("year", contest.getYear() != null ? contest.getYear() : "");
        response.put("registrationStart",
                contest.getRegistrationStart() != null ? contest.getRegistrationStart().toString() : "");
        response.put("registrationEnd",
                contest.getRegistrationEnd() != null ? contest.getRegistrationEnd().toString() : "");
        response.put("contestEndAt", contest.getContestEndAt() != null ? contest.getContestEndAt().toString() : "");
        response.put("status", contest.getStatus() != null ? contest.getStatus().name() : "UPCOMING");
        response.put("maximumAllowedTeams",
                contest.getMaximumAllowedTeams() != null ? contest.getMaximumAllowedTeams() : 100);
        response.put("minTeamMembers", contest.getMinTeamMembers() != null ? contest.getMinTeamMembers() : 3);
        response.put("maxTeamMembers", contest.getMaxTeamMembers() != null ? contest.getMaxTeamMembers() : 5);
        response.put("complianceRules", contest.getComplianceRules() != null ? contest.getComplianceRules() : "");
        response.put("tieredPrizeStructures",
                contest.getTieredPrizeStructures() != null ? contest.getTieredPrizeStructures() : "");
        response.put("location", contest.getLocation() != null ? contest.getLocation() : "");
        response.put("publishedAt", contest.getPublishedAt() != null ? contest.getPublishedAt().toString() : "");
        response.put("contestStartAt",
                contest.getContestStartAt() != null ? contest.getContestStartAt().toString() : "");
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
        String oldStatus = null;
        boolean isNewContest = (request.getId() == null);
        String oldName = null, oldTheme = null, oldDescription = null;
        Integer oldYear = null;
        if (!isNewContest) {
            contest = contestRepository.findById(request.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Contest not found"));
            oldStatus = contest.getStatus() != null ? contest.getStatus().name() : null;
            oldName = contest.getName();
            oldTheme = contest.getTheme();
            oldDescription = contest.getDescription();
            oldYear = contest.getYear();
            if (!contest.getSemester().getId().equals(semester.getId())) {
                if (contestRepository.findBySemesterId(semester.getId()).isPresent()) {
                    throw new IllegalArgumentException("A contest already exists for the selected season ("
                            + request.getTerm() + " " + request.getYear() + ").");
                }
            }
            contest.setSemester(semester);
        } else {
            if (contestRepository.findBySemesterId(semester.getId()).isPresent()) {
                throw new IllegalArgumentException("A contest already exists for this season (" + request.getTerm()
                        + " " + request.getYear() + "). Cannot create a new one.");
            }
            contest = Contest.builder()
                    .semester(semester)
                    .status(Contest.ContestStatus.UPCOMING)
                    .build();
        }

        contest.setName(request.getName());
        contest.setTheme(request.getTheme());
        contest.setDescription(request.getDescription());
        contest.setSeason(parseSeason(request.getTerm()));
        contest.setYear(request.getYear());
        contest.setMaximumAllowedTeams(request.getMaximumAllowedTeams());
        contest.setMinTeamMembers(request.getMinTeamMembers() != null ? request.getMinTeamMembers() : 3);
        contest.setMaxTeamMembers(request.getMaxTeamMembers() != null ? request.getMaxTeamMembers() : 5);
        contest.setComplianceRules(request.getComplianceRules());
        contest.setTieredPrizeStructures(request.getTieredPrizeStructures());
        contest.setRegistrationStart(request.getRegistrationStart());
        contest.setRegistrationEnd(request.getRegistrationEnd());
        contest.setContestEndAt(request.getContestEndAt());
        contest.setLocation(request.getLocation());
        contest.setPublishedAt(request.getPublishedAt());
        contest.setContestStartAt(request.getContestStartAt());
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
                contest.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
            }
        }
        contest.checkAndSyncStatus();
        contest = contestRepository.save(contest);

        boolean contestModified = isNewContest ||
                !java.util.Objects.equals(oldName, contest.getName()) ||
                !java.util.Objects.equals(oldTheme, contest.getTheme()) ||
                !java.util.Objects.equals(oldDescription, contest.getDescription()) ||
                !java.util.Objects.equals(oldYear, contest.getYear()) ||
                !java.util.Objects.equals(oldStatus, contest.getStatus() != null ? contest.getStatus().name() : null);

        if (contestModified) {
            String action = isNewContest ? "CREATE_CONTEST" : "UPDATE_CONTEST";
            String oldVal = isNewContest ? "NONE" : oldStatus;
            auditLogService.log(action, "Contest", contest.getName(), oldVal, contest.getStatus().name(),
                    isNewContest ? "Created Contest" : "Updated Contest");
        }

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

        Category category = null;
        if (request.getRounds() != null) {
            for (CreateTrackRoundRequest.RoundDto rDto : request.getRounds()) {
                if (rDto.getId() != null) {
                    Round existingRound = roundRepository.findById(rDto.getId()).orElse(null);
                    if (existingRound != null && existingRound.getCategory() != null &&
                            existingRound.getCategory().getContest().getId().equals(contest.getId())) {
                        category = existingRound.getCategory();
                        break;
                    }
                }
            }
        }
        if (category == null) {
            category = categoryRepository.findByNameAndContest(request.getCategoryName(), contest).orElse(null);
        }
        boolean isNewCategory = (category == null || category.getId() == null);
        if (category == null) {
            category = Category.builder()
                    .name(request.getCategoryName())
                    .contest(contest)
                    .rounds(new ArrayList<>())
                    .build();
        }

        String oldName = category.getName();
        String oldCatStatus = category.getId() != null ? category.getStatus() : null;
        String oldDesc = category.getDescription();
        String oldUrl = category.getGuidelineUrl();
        category.setName(request.getCategoryName());
        category.setDescription(request.getTrackDescription());
        category.setGuidelineUrl(request.getGuidelineUrl());
        String statusStr = "ACTIVED";
        if (request.getStatus() != null) {
            statusStr = request.getStatus();
            if ("ACTIVE".equalsIgnoreCase(statusStr)) {
                statusStr = "ACTIVED";
            } else if ("INACTIVE".equalsIgnoreCase(statusStr)) {
                statusStr = "INACTIVED";
            }
        }
        boolean categoryModified = isNewCategory ||
                !java.util.Objects.equals(oldName, request.getCategoryName()) ||
                !java.util.Objects.equals(oldDesc, request.getTrackDescription()) ||
                !java.util.Objects.equals(oldUrl, request.getGuidelineUrl()) ||
                !java.util.Objects.equals(oldCatStatus, statusStr);
        category.setStatus(statusStr);
        category = categoryRepository.save(category);

        LocalDateTime now = LocalDateTime.now();

        List<Round> existingRounds = roundRepository.findByCategoryIdOrderBySubmissionOpenAsc(category.getId());

        java.util.Set<Long> requestedRoundIds = (request.getRounds() == null) ? java.util.Collections.emptySet()
                : request.getRounds().stream()
                .map(CreateTrackRoundRequest.RoundDto::getId)
                .filter(id -> id != null && id > 0)
                .collect(java.util.stream.Collectors.toSet());

        for (Round existing : existingRounds) {
            if (!requestedRoundIds.contains(existing.getId())) {
                if (existing.getState() == Round.RoundState.UPCOMING) {
                    roundRepository.delete(existing);
                } else {
                    throw new IllegalArgumentException(
                            "Cannot delete round " + existing.getPhaseName() + " because its state is not UPCOMING.");
                }
            }
        }

        if (request.getRounds() != null) {
            for (CreateTrackRoundRequest.RoundDto roundDto : request.getRounds()) {
                if (roundDto.getSubmissionDeadline().isBefore(roundDto.getSubmissionOpen())) {
                    throw new IllegalArgumentException(
                            "Deadline cannot be before open time for " + roundDto.getPhaseName());
                }

                if (contest.getContestStartAt() != null
                        && roundDto.getSubmissionOpen().isBefore(contest.getContestStartAt())) {
                    throw new IllegalArgumentException(
                            "Round '" + roundDto.getPhaseName() + "' cannot start before the contest start time ("
                                    + contest.getContestStartAt().toLocalDate() + ")");
                }

                if (contest.getContestEndAt() != null) {
                    if (roundDto.getSubmissionDeadline() != null
                            && roundDto.getSubmissionDeadline().isAfter(contest.getContestEndAt())) {
                        throw new IllegalArgumentException("Round '" + roundDto.getPhaseName()
                                + "' submission deadline cannot be after the contest end time.");
                    }
                    if (roundDto.getGradingDeadlineAt() != null
                            && roundDto.getGradingDeadlineAt().isAfter(contest.getContestEndAt())) {
                        throw new IllegalArgumentException("Round '" + roundDto.getPhaseName()
                                + "' grading deadline cannot be after the contest end time.");
                    }
                    if (roundDto.getReviewCalibrationAt() != null
                            && roundDto.getReviewCalibrationAt().isAfter(contest.getContestEndAt())) {
                        throw new IllegalArgumentException("Round '" + roundDto.getPhaseName()
                                + "' review calibration time cannot be after the contest end time.");
                    }
                    if (roundDto.getPublishResultAt() != null
                            && roundDto.getPublishResultAt().isAfter(contest.getContestEndAt())) {
                        throw new IllegalArgumentException("Round '" + roundDto.getPhaseName()
                                + "' publish result time cannot be after the contest end time.");
                    }
                    if (roundDto.getReviewCalibrationAt() != null && roundDto.getPublishResultAt() != null
                            && !roundDto.getReviewCalibrationAt().isBefore(roundDto.getPublishResultAt())) {
                        throw new IllegalArgumentException("Round '" + roundDto.getPhaseName()
                                + "' review calibration time must be strictly before the publish result time.");
                    }
                }

                Round.RoundState state = Round.RoundState.UPCOMING;
                if (roundDto.getState() != null) {
                    try {
                        state = Round.RoundState.valueOf(roundDto.getState().toUpperCase());
                    } catch (IllegalArgumentException e) {
                        if (now.isAfter(roundDto.getSubmissionOpen())
                                && now.isBefore(roundDto.getSubmissionDeadline())) {
                            state = Round.RoundState.ACTIVED;
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

                java.time.LocalDateTime oldDeadline = round.getSubmissionDeadline();
                round.setSubmissionOpen(roundDto.getSubmissionOpen());
                round.setSubmissionDeadline(roundDto.getSubmissionDeadline());
                round.setGradingDeadlineAt(roundDto.getGradingDeadlineAt());
                round.setReviewCalibrationAt(roundDto.getReviewCalibrationAt());
                round.setPublishResultAt(roundDto.getPublishResultAt());
                round.setState(state);
                round.setContest(contest);
                round.setCategory(category);
                round.setSubmissionRequirements(roundDto.getSubmissionRequirements());
                round.setRoundFormat(roundDto.getRoundFormat());
                roundRepository.save(round);
                if (oldDeadline != null && roundDto.getSubmissionDeadline() != null
                        && !oldDeadline.equals(roundDto.getSubmissionDeadline())) {
                    auditLogService.logUpdateSubmissionDeadline(round.getPhaseName(), oldDeadline.toString(),
                            roundDto.getSubmissionDeadline().toString(), "Admin updated round submission deadline");
                }
            }
        }

        Category savedCategory = categoryRepository.save(category);
        if (categoryModified) {
            if (isNewCategory) {
                auditLogService.log("CREATE_CATEGORY", "Category", savedCategory.getName(), "NONE",
                        savedCategory.getStatus(), "Created new Category");
            } else if (!java.util.Objects.equals(oldName, savedCategory.getName())) {
                auditLogService.log("UPDATE_CATEGORY", "Category", savedCategory.getName(), oldName,
                        savedCategory.getName(), "Renamed Category");
            } else {
                auditLogService.log("UPDATE_CATEGORY", "Category", savedCategory.getName(), oldCatStatus,
                        savedCategory.getStatus(), "Update Category and Rounds");
            }
        }
        return savedCategory;
    }

    @Transactional
    public Announcement createAnnouncement(CreateAnnouncementRequest request) {
        Contest contest = contestRepository.findById(request.getContestId())
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Admin admin = adminRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        Announcement announcement = Announcement.builder()
                .contest(contest)
                .title(request.getTitle())
                .content(request.getContent())
                .type(request.getType())
                .publishedAt(java.time.LocalDateTime.now())
                .isActive(true)
                .status("ACTIVE")
                .adminUser(admin)
                .targets(new ArrayList<>())
                .build();

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (String roleName : request.getRoles()) {
                roleRepository.findByName(roleName.toUpperCase()).ifPresent(role -> {
                    announcement.getTargets().add(AnnouncementTarget.builder()
                            .announcement(announcement)
                            .role(role)
                            .build());
                });
            }
        }

        return announcementRepository.save(announcement);
    }

    @Transactional
    public Announcement updateAnnouncement(Long announcementId, CreateAnnouncementRequest request) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found"));

        Contest contest = contestRepository.findById(request.getContestId())
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));

        announcement.setContest(contest);
        announcement.setTitle(request.getTitle());
        announcement.setContent(request.getContent());
        announcement.setType(request.getType());

        announcement.getTargets().clear();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (String roleName : request.getRoles()) {
                roleRepository.findByName(roleName.toUpperCase()).ifPresent(role -> {
                    announcement.getTargets().add(AnnouncementTarget.builder()
                            .announcement(announcement)
                            .role(role)
                            .build());
                });
            }
        }

        return announcementRepository.save(announcement);
    }

    @Transactional
    public void deleteAnnouncement(Long announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found"));
        announcementRepository.delete(announcement);
    }

    @Transactional(readOnly = true)
    public List<com.fpt.shms.be.dto.AnnouncementDTO> getAllAnnouncements() {
        return announcementRepository.findAllOrderByPublishedAtDesc().stream()
                .map(com.fpt.shms.be.dto.AnnouncementDTO::from)
                .toList();
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        List<Round> rounds = roundRepository.findByCategoryIdOrderBySubmissionOpenAsc(categoryId);
        for (Round r : rounds) {
            if (r.getState() != Round.RoundState.UPCOMING) {
                throw new IllegalArgumentException("Cannot delete category '" + category.getName()
                        + "' because its round '" + r.getPhaseName() + "' is currently " + r.getState());
            }
        }
        roundRepository.deleteAll(rounds);

        categoryRepository.delete(category);
        auditLogService.log("DELETE_CATEGORY", "Category", category.getName(), category.getStatus(), "DELETED",
                "Deleted Category");
    }

    private Contest.Season parseSeason(String term) {
        try {
            return Contest.Season.valueOf(term.toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }
}