package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.UniversityDto;
import com.fpt.shms.be.model.University;
import com.fpt.shms.be.repository.UniversityRepository;
import com.fpt.shms.be.model.ContestUniversity;
import com.fpt.shms.be.model.Contest;
import com.fpt.shms.be.repository.ContestUniversityRepository;
import com.fpt.shms.be.repository.ContestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.fpt.shms.be.dto.StudentVerificationDataDto;
import com.fpt.shms.be.model.StudentVerificationData;
import com.fpt.shms.be.repository.StudentVerificationDataRepository;

@Service
@RequiredArgsConstructor
public class PartnerAdminService {

    private final UniversityRepository universityRepository;
    private final ContestUniversityRepository contestUniversityRepository;
    private final ContestRepository contestRepository;
    private final StudentVerificationDataRepository studentVerificationDataRepository;
    private final com.fpt.shms.be.repository.StudentRepository studentRepository;

    public List<UniversityDto> getPartnersByContest(Long contestId) {
        List<ContestUniversity> cuList = contestUniversityRepository.findByContestId(contestId);
        List<UniversityDto> result = new ArrayList<>();

        for (ContestUniversity cu : cuList) {
            University u = cu.getUniversity();
            String uniName = u != null ? u.getName() : "";

            UniversityDto dto = new UniversityDto();
            dto.setName(uniName);
            if (u != null) {
                dto.setId(u.getId());
                dto.setStudentCodeRegex(u.getStudentCodeRegex());
                dto.setEmailRegex(u.getEmailRegex());
            } else {
                dto.setStudentCodeRegex("");
                dto.setEmailRegex("");
            }
            result.add(dto);
        }
        return result;
    }

    @Transactional
    public void savePartnersForContest(Long contestId, List<UniversityDto> partnerDtos) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new IllegalArgumentException("Contest not found"));
        contestUniversityRepository.deleteByContest(contest);

        for (UniversityDto dto : partnerDtos) {
            if (dto.getName() == null || dto.getName().isEmpty())
                continue;
            University u = universityRepository.findByName(dto.getName())
                    .orElseGet(() -> University.builder().name(dto.getName()).build());
            u.setStudentCodeRegex(dto.getStudentCodeRegex());
            u.setEmailRegex(dto.getEmailRegex());
            u.setStatus(u.getStatus() != null ? u.getStatus() : "ACTIVE");
            u = universityRepository.save(u);

            contestUniversityRepository.save(ContestUniversity.builder()
                    .contest(contest)
                    .university(u)
                    .build());
        }
    }

    @Transactional
    public void saveStudentVerificationData(List<StudentVerificationDataDto> dtos) {
        if (dtos.isEmpty()) return;
        String inferredUni = dtos.get(0).getUniversity();
        if (inferredUni != null && !inferredUni.isBlank()) {
            saveStudentVerificationData(inferredUni, dtos);
        }
    }

    @Transactional
    public void saveStudentVerificationData(String universityName, List<StudentVerificationDataDto> dtos) {
        if (universityName == null || universityName.isBlank()) {
            return;
        }

        University university = universityRepository.findByName(universityName)
                .orElseThrow(() -> new IllegalArgumentException("University not found"));


        List<StudentVerificationData> existingList = studentVerificationDataRepository.findByUniversity(universityName);

        List<String> incomingMssvs = dtos.stream()
                .map(StudentVerificationDataDto::getMssv)
                .filter(mssv -> mssv != null && !mssv.isEmpty())
                .collect(Collectors.toList());

        for (StudentVerificationData sv : existingList) {
            if (!incomingMssvs.contains(sv.getMssv())) {
                studentVerificationDataRepository.delete(sv);
            }
        }
//
        for (StudentVerificationDataDto dto : dtos) {
            if (dto.getMssv() == null || dto.getMssv().isEmpty()) continue;

            StudentVerificationData sv = studentVerificationDataRepository.findByMssv(dto.getMssv())
                    .orElseGet(() -> StudentVerificationData.builder().mssv(dto.getMssv()).build());

            sv.setFullName(dto.getFullName());
            sv.setCorporateEmail(dto.getCorporateEmail());
            sv.setUniversity(university);
            sv.setMajor(dto.getMajor() != null && !dto.getMajor().isEmpty() ? dto.getMajor() : "Not Specified");
            sv.setIsCurrentStudent(dto.getIsCurrentStudent() != null ? dto.getIsCurrentStudent() : true);

            studentVerificationDataRepository.save(sv);
        }
    }

    public List<StudentVerificationDataDto> getStudentVerificationData(String university) {
        List<StudentVerificationData> data = studentVerificationDataRepository.findByUniversity(university);
        return data.stream().map(sv -> {
            StudentVerificationDataDto dto = new StudentVerificationDataDto();
            dto.setMssv(sv.getMssv());
            dto.setFullName(sv.getFullName());
            dto.setCorporateEmail(sv.getCorporateEmail());
            dto.setMajor(sv.getMajor());
            dto.setUniversity(sv.getUniversityName());
            dto.setIsCurrentStudent(sv.getIsCurrentStudent());
            return dto;
        }).collect(Collectors.toList());
    }

    public List<UniversityDto> getAllUniversities() {
        return universityRepository.findAll().stream()
                .filter(u -> !"INACTIVE".equalsIgnoreCase(u.getStatus()))
                .map(u -> {
                    UniversityDto dto = new UniversityDto();
                    dto.setId(u.getId());
                    dto.setName(u.getName());
                    dto.setUniversityCode(u.getUniversityCode());
                    dto.setStudentCodeRegex(u.getStudentCodeRegex());
                    dto.setEmailRegex(u.getEmailRegex());
                    return dto;
                }).collect(Collectors.toList());
    }

    @Transactional
    public void saveAllUniversities(List<UniversityDto> dtos) {
        List<Long> keptIds = new ArrayList<>();

        for (UniversityDto dto : dtos) {
            if (dto.getName() == null || dto.getName().isEmpty()) continue;
            if (dto.getUniversityCode() == null || dto.getUniversityCode().isEmpty()) {
                throw new IllegalArgumentException("University code is required for " + dto.getName());
            }

            University u;
            if (dto.getId() != null) {
                u = universityRepository.findById(dto.getId())
                        .orElseGet(() -> universityRepository.findByName(dto.getName())
                                .orElseGet(() -> University.builder().name(dto.getName()).build()));
            } else {
                u = universityRepository.findByName(dto.getName())
                        .orElseGet(() -> University.builder().name(dto.getName()).build());
            }

            u.setName(dto.getName());
            u.setUniversityCode(dto.getUniversityCode());
            u.setStudentCodeRegex(dto.getStudentCodeRegex());
            u.setEmailRegex(dto.getEmailRegex());
            u.setStatus(u.getStatus() != null ? u.getStatus() : "ACTIVE");
            u = universityRepository.save(u);
            keptIds.add(u.getId());
        }

        // Handle deleted universities
        List<University> allUnis = universityRepository.findAll();
        for (University u : allUnis) {
            if (!keptIds.contains(u.getId())) {
                boolean hasStudents = studentRepository.existsByUniversity(u);
                boolean hasContests = contestUniversityRepository.existsByUniversity(u);

                if (hasStudents || hasContests) {
                    // Cannot safely delete because actual users or contests rely on this university
                    u.setStatus("INACTIVE");
                    universityRepository.save(u);
                } else {
                    try {
                        // Clean up dependent StudentVerificationData first
                        List<StudentVerificationData> childStudents = studentVerificationDataRepository.findByUniversity(u.getName());
                        if (childStudents != null && !childStudents.isEmpty()) {
                            studentVerificationDataRepository.deleteAll(childStudents);
                        }

                        // Proceed to delete the university
                        universityRepository.delete(u);
                    } catch (Exception e) {
                        // Fallback just in case of any other unknown constraint
                        u.setStatus("INACTIVE");
                        universityRepository.save(u);
                    }
                }
            }
        }
    }
}
