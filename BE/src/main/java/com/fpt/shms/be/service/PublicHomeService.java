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

    public PublicHomeResponse getHomeData() {

        // Seasonal hackathons: ACTIVE + UPCOMING
        List<Contest> activeContests = contestRepository.findByStatusIn(List.of(Contest.ContestStatus.ACTIVE, Contest.ContestStatus.UPCOMING));

        List<ContestDTO> contests = activeContests.stream()
                .map(c -> {
                    List<com.fpt.shms.be.model.Category> categoriesModel = categoryRepository.findByContestId(c.getId());
                    List<com.fpt.shms.be.model.Round> contestRounds = roundRepository.findByContestId(c.getId());
                    List<ContestDTO.RoundDTO> dtoRounds = contestRounds.stream()
                            .map(r -> new ContestDTO.RoundDTO(r.getPhaseName(), r.getSubmissionOpen(), r.getSubmissionDeadline()))
                            .toList();
                    List<ContestDTO.CategoryDTO> categories = categoriesModel.stream().map(cat -> {
                        return new ContestDTO.CategoryDTO(cat.getId(), cat.getName(), dtoRounds);
                    }).toList();
                    return ContestDTO.from(c, categories, dtoRounds);
                })
                .toList();

        List<String> scopes = activeContests.stream()
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
        return announcementRepository
                .findByIsActiveTrueOrderByPublishedAtDesc()
                .stream()
                .map(AnnouncementDTO::from)
                .toList();
    }
}
