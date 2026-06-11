package com.fpt.shms.be.dto;

import lombok.Data;

@Data
public class StudentVerificationDataDto {
    private String mssv;
    private String fullName;
    private String corporateEmail;
    private String major;
    private String university;
    private Boolean isCurrentStudent;
}