package com.fpt.shms.be.service;

//import com.fpt.shms.be.dto.AnnouncementDTO;
//import com.fpt.shms.be.dto.ContestDTO;
import com.fpt.shms.be.dto.PublicHomeResponse;
//import com.fpt.shms.be.dto.TrackDTO;
//import com.fpt.shms.be.model.Contest;
//import com.fpt.shms.be.repository.AnnouncementRepository;
//import com.fpt.shms.be.repository.CategoryRepository;
//import com.fpt.shms.be.repository.ContestRepository;
//import com.fpt.shms.be.repository.RankingResultRepository;
//import com.fpt.shms.be.repository.RoundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Business logic for the public home page data aggregation.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicHomeService {


    private final com.fpt.shms.be.repository.UniversityRepository universityRepository;

    /**
     * Assembles the complete payload for GET /api/v1/public/home.
     */
    public PublicHomeResponse getHomeData() {

        List<String> universities = universityRepository.findAll().stream()
                .filter(u -> !"INACTIVE".equalsIgnoreCase(u.getStatus()))
                .map(com.fpt.shms.be.model.University::getName)
                .toList();


        return new PublicHomeResponse(universities);
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
}
