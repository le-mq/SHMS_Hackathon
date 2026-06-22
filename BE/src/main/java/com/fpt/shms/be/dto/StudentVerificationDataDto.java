package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class StudentVerificationDataDto {
    private String studentCode;
    private String fullName;
    private String corporateEmail;
    private String major;
    private String university;
    private Boolean isCurrentStudent;
}