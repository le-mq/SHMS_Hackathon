package com.fpt.shms.be.service;

import com.fpt.shms.be.dto.UniversityDto;
import com.fpt.shms.be.model.University;
import com.fpt.shms.be.repository.UniversityRepository;
//import com.fpt.shms.be.model.ContestUniversity;
//import com.fpt.shms.be.model.Contest;
//import com.fpt.shms.be.repository.ContestUniversityRepository;
//import com.fpt.shms.be.repository.ContestRepository;
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
    private final StudentVerificationDataRepository studentVerificationDataRepository;
    private final com.fpt.shms.be.repository.StudentRepository studentRepository;

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
}
