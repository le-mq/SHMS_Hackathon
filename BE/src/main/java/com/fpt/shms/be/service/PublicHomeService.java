package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.AnnouncementDTO;
import com.fpt.shms.be.dto.ContestDTO;
import com.fpt.shms.be.dto.PublicHomeResponse;
import com.fpt.shms.be.dto.TrackDTO;
import com.fpt.shms.be.model.Contest;
import com.fpt.shms.be.repository.AnnouncementRepository;
import com.fpt.shms.be.repository.CategoryRepository;
import com.fpt.shms.be.repository.ContestRepository;
import com.fpt.shms.be.repository.RoundRepository;
import com.fpt.shms.be.repository.RankingResultRepository;
import com.fpt.shms.be.model.RankingResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicHomeService {


    private final ContestRepository contestRepository;
    private final CategoryRepository categoryRepository;
    private final com.fpt.shms.be.repository.UniversityRepository universityRepository;
    private final RoundRepository roundRepository;
    private final AnnouncementRepository announcementRepository;
    private final RankingResultRepository rankingResultRepository;
    private final com.fpt.shms.be.repository.TeamMembershipRepository teamMembershipRepository;

    public PublicHomeResponse getHomeData() {

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<Contest> allPublishedContests = contestRepository.findAll().stream()
                .filter(c -> c.getPublishedAt() == null || !now.isBefore(c.getPublishedAt()))
                .toList();

        List<ContestDTO> contests = allPublishedContests.stream()
                .map(c -> {
                    List<com.fpt.shms.be.model.Category> categoriesModel = categoryRepository.findByContestId(c.getId());
                    List<com.fpt.shms.be.model.Round> contestRounds = roundRepository.findByContestId(c.getId());
                    List<ContestDTO.CategoryDTO> categories = categoriesModel.stream().map(cat -> {
                        List<ContestDTO.RoundDTO> catRounds = contestRounds.stream()
                                .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(cat.getId()))
                                .map(r -> new ContestDTO.RoundDTO(
                                        r.getPhaseName(),
                                        r.getSubmissionOpen(),
                                        r.getSubmissionDeadline(),
                                        r.getGradingDeadlineAt(),
                                        r.getPublishResultAt(),
                                        r.getSubmissionRequirements(),
                                        r.getRoundFormat()
                                ))
                                .toList();
                        return new ContestDTO.CategoryDTO(cat.getId(), cat.getName(), cat.getDescription(), cat.getGuidelineUrl(), catRounds);
                    }).toList();
                    List<ContestDTO.RoundDTO> dtoRounds = contestRounds.stream()
                            .map(r -> new ContestDTO.RoundDTO(
                                    r.getPhaseName(),
                                    r.getSubmissionOpen(),
                                    r.getSubmissionDeadline(),
                                    r.getGradingDeadlineAt(),
                                    r.getPublishResultAt(),
                                    r.getSubmissionRequirements(),
                                    r.getRoundFormat()
                            ))
                            .toList();
                    return ContestDTO.from(c, categories, dtoRounds);
                })
                .toList();

        List<String> scopes = allPublishedContests.stream()
                .map(Contest::getRegionScope)
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();

        List<TrackDTO> tracks = categoryRepository.findAll()
                .stream()
                .map(TrackDTO::from)
                .toList();

        List<String> universities = universityRepository.findAll().stream()
                .filter(u -> !"INACTIVE".equalsIgnoreCase(u.getStatus()))
                .map(com.fpt.shms.be.model.University::getName)
                .toList();

        return new PublicHomeResponse(contests, tracks, universities, scopes);
    }

    public List<String> getUniversities() {
        return universityRepository.findAll().stream()
                .filter(u -> !"INACTIVE".equalsIgnoreCase(u.getStatus()))
                .map(com.fpt.shms.be.model.University::getName)
                .toList();
    }

    public List<com.fpt.shms.be.dto.UniversityDto> getUniversitiesDetailed() {
        return universityRepository.findAll().stream()
                .filter(u -> !"INACTIVE".equalsIgnoreCase(u.getStatus()))
                .map(u -> {
                    com.fpt.shms.be.dto.UniversityDto dto = new com.fpt.shms.be.dto.UniversityDto();
                    dto.setId(u.getId());
                    dto.setName(u.getName());
                    dto.setStudentCodeRegex(u.getStudentCodeRegex());
                    dto.setEmailRegex(u.getEmailRegex());
                    return dto;
                })
                .toList();
    }

    public List<AnnouncementDTO> getAnnouncements() {

        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        java.util.List<String> userRoles = new java.util.ArrayList<>();

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            userRoles = auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .toList();
        }

        final java.util.List<String> currentRoles = userRoles;

        return announcementRepository
                .findByIsActiveTrueOrderByPublishedAtDesc()
                .stream()
                .filter(a -> {

                    if (a.getTargetRoles() == null || a.getTargetRoles().isBlank()) return true;

                    if (currentRoles.isEmpty()) return false;

                    java.util.List<String> targetRolesList = java.util.Arrays.asList(a.getTargetRoles().split(","));
                    return currentRoles.stream().anyMatch(role ->
                            targetRolesList.stream().anyMatch(t -> {
                                String targetRole = t.trim();
                                if (targetRole.equalsIgnoreCase(role)) return true;
                                if (targetRole.equalsIgnoreCase("STUDENT") && role.equalsIgnoreCase("LEADER")) return true;
                                return false;
                            })
                    );
                })
                .map(AnnouncementDTO::from)
                .toList();
    }

    public List<Map<String, Object>> getLeaderboards() {
        List<RankingResult> results = rankingResultRepository.findPublishedLeaderboards();
        return results.stream().map(r -> {
            boolean isCancelled = !"APPROVED".equalsIgnoreCase(r.getTeam().getStatus()) && !"CLOSED".equalsIgnoreCase(r.getTeam().getStatus());
            Map<String, Object> map = new HashMap<>();
            map.put("contestId", r.getRound().getContest() != null ? r.getRound().getContest().getId() : null);
            map.put("contestName", r.getRound().getContest() != null ? r.getRound().getContest().getName() : "");
            map.put("roundName", r.getRound().getPhaseName());
            map.put("publishedAt", r.getDatePublishedAt().toString());
            map.put("teamId", r.getTeam().getId());
            map.put("teamName", r.getTeam().getName());
            map.put("rank", r.getRankNo());
            map.put("categoryName", r.getCategory() != null ? r.getCategory().getName() : "");
            map.put("status", isCancelled ? "DISQUALIFIED" : r.getQualificationStatus());
            map.put("finalScore", isCancelled ? 0.0 : r.getFinalScore());
            map.put("prizeStructures", r.getRound().getContest() != null ? r.getRound().getContest().getTieredPrizeStructures() : null);
            
            List<com.fpt.shms.be.model.TeamMembership> members = teamMembershipRepository.findByTeamId(r.getTeam().getId());
            List<Map<String, Object>> roster = members.stream()
                    .filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus()) || "PENDING".equalsIgnoreCase(m.getStatus()))
                    .map(m -> {
                        Map<String, Object> memMap = new HashMap<>();
                        memMap.put("fullName", m.getStudent() != null ? m.getStudent().getFullName() : (m.getUser() != null ? m.getUser().getUsername() : "Unknown"));
                        memMap.put("studentCode", m.getStudent() != null ? m.getStudent().getStudentCode() : "");
                        memMap.put("email", m.getUser() != null ? m.getUser().getEmail() : "");
                        memMap.put("role", m.getRole());
                        memMap.put("universityName", m.getStudent() != null && m.getStudent().getUniversity() != null ? m.getStudent().getUniversity().getName() : "N/A");
                        return memMap;
                    }).toList();
            map.put("roster", roster);
            return map;
        }).toList();
    }
}
