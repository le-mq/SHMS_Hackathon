CREATE TABLE [User] (
                        user_id BIGINT IDENTITY(1,1) NOT NULL,
    username VARCHAR(50) NULL,
    email VARCHAR(50) NULL,
    password VARCHAR(100) NULL,
    full_name NVARCHAR(100) NULL,
    phone VARCHAR(15) NULL,
    avatar_url VARCHAR(255) NULL,
    email_verified BIT NULL,
    status VARCHAR(50) NULL,
    created_at DATETIME NULL,
    CONSTRAINT pk_user PRIMARY KEY (user_id),
    CONSTRAINT uq_user_username UNIQUE (username),
    CONSTRAINT uq_user_email UNIQUE (email)
    );
GO

CREATE TABLE VerificationToken (
                                   token_id BIGINT IDENTITY(1,1) NOT NULL,
                                   user_id BIGINT NULL,
                                   token VARCHAR(255) NULL,
                                   token_type VARCHAR(50) NULL,
                                   expires_at DATETIME NULL,
                                   used_at DATETIME NULL,
                                   CONSTRAINT pk_verification_token PRIMARY KEY (token_id),
                                   CONSTRAINT fk_verification_token_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE [Role] (
                        role_id BIGINT IDENTITY(1,1) NOT NULL,
    role_name NVARCHAR(50) NULL,
    description TEXT NULL,
    CONSTRAINT pk_role PRIMARY KEY (role_id),
    CONSTRAINT uq_role_name UNIQUE (role_name)
    );
GO

CREATE TABLE UserRole (
                          user_role_id BIGINT IDENTITY(1,1) NOT NULL,
                          user_id BIGINT NULL,
                          role_id BIGINT NULL,
                          expires_at DATETIME NULL,
                          is_active BIT NULL,
                          CONSTRAINT pk_user_role PRIMARY KEY (user_role_id),
                          CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES [User](user_id),
                          CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES [Role](role_id)
);
GO

CREATE TABLE AuditLog (
                          audit_log_id BIGINT IDENTITY(1,1) NOT NULL,
                          user_id BIGINT NULL,
                          action NVARCHAR(100) NULL,
                          entity_type VARCHAR(50) NULL,
                          entity_id BIGINT NULL,
                          reason TEXT NULL,
                          old_value TEXT NULL,
                          new_value TEXT NULL,
                          performed_at DATETIME NULL,
                          CONSTRAINT pk_audit_log PRIMARY KEY (audit_log_id),
                          CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE University (
                            university_id BIGINT IDENTITY(1,1) NOT NULL,
                            university_name NVARCHAR(100) NULL,
                            university_code VARCHAR(50) NULL,
                            mssv_regex VARCHAR(100) NULL,
                            email_domain VARCHAR(100) NULL,
                            status VARCHAR(50) NULL,
                            CONSTRAINT pk_university PRIMARY KEY (university_id),
                            CONSTRAINT uq_university_name UNIQUE (university_name),
                            CONSTRAINT uq_university_code UNIQUE (university_code)
);
GO

CREATE TABLE StudentVerificationData (
                                         verification_data_id BIGINT IDENTITY(1,1) NOT NULL,
                                         university_id BIGINT NULL,
                                         student_code VARCHAR(50) NULL,
                                         email VARCHAR(50) NULL,
                                         full_name NVARCHAR(100) NULL,
                                         major NVARCHAR(100) NULL,
                                         is_current_student BIT NULL,
                                         CONSTRAINT pk_student_verification_data PRIMARY KEY (verification_data_id),
                                         CONSTRAINT uq_svd_student_code UNIQUE (student_code),
                                         CONSTRAINT uq_svd_email UNIQUE (email),
                                         CONSTRAINT fk_svd_university FOREIGN KEY (university_id) REFERENCES University(university_id)
);
GO

CREATE TABLE Semester (
                          semester_id BIGINT IDENTITY(1,1) NOT NULL,
                          term NVARCHAR(50) NULL,
    [year] INT NULL,
                          semester_code VARCHAR(50) NULL,
                          CONSTRAINT pk_semester PRIMARY KEY (semester_id)
);
GO

CREATE TABLE Student (
                         user_id BIGINT NOT NULL,
                         university_id BIGINT NULL,
                         student_code VARCHAR(50) NULL,
                         major NVARCHAR(100) NULL,
                         student_email VARCHAR(50) NULL,
                         status VARCHAR(50) NULL,
                         CONSTRAINT pk_student PRIMARY KEY (user_id),
                         CONSTRAINT uq_student_code UNIQUE (student_code),
                         CONSTRAINT uq_student_email UNIQUE (student_email),
                         CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES [User](user_id),
                         CONSTRAINT fk_student_university FOREIGN KEY (university_id) REFERENCES University(university_id)
);
GO

CREATE TABLE Contest (
                         contest_id BIGINT IDENTITY(1,1) NOT NULL,
                         semester_id BIGINT NULL,
                         contest_name NVARCHAR(100) NULL,
                         theme NVARCHAR(100) NULL,
                         region NVARCHAR(50) NULL,
                         max_teams INT NULL,
                         status VARCHAR(50) NULL,
                         created_at DATETIME NULL,
                         CONSTRAINT pk_contest PRIMARY KEY (contest_id),
                         CONSTRAINT fk_contest_semester FOREIGN KEY (semester_id) REFERENCES Semester(semester_id)
);
GO

CREATE TABLE ContestUniversity (
                                   contest_university_id BIGINT IDENTITY(1,1) NOT NULL,
                                   contest_id BIGINT NULL,
                                   university_id BIGINT NULL,
                                   CONSTRAINT pk_contest_university PRIMARY KEY (contest_university_id),
                                   CONSTRAINT fk_cu_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id),
                                   CONSTRAINT fk_cu_university FOREIGN KEY (university_id) REFERENCES University(university_id)
);
GO

CREATE TABLE Coordinator (
                             user_id BIGINT NOT NULL,
                             status VARCHAR(50) NULL,
                             CONSTRAINT pk_coordinator PRIMARY KEY (user_id),
                             CONSTRAINT fk_coordinator_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE Announcement (
                              announcement_id BIGINT IDENTITY(1,1) NOT NULL,
                              contest_id BIGINT NULL,
                              user_id BIGINT NULL,
                              title NVARCHAR(100) NULL,
                              content TEXT NULL,
                              announcement_type VARCHAR(50) NULL,
                              status VARCHAR(50) NULL,
                              published_at DATETIME NULL,
                              CONSTRAINT pk_announcement PRIMARY KEY (announcement_id),
                              CONSTRAINT fk_announcement_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id),
                              CONSTRAINT fk_announcement_coordinator FOREIGN KEY (user_id) REFERENCES Coordinator(user_id)
);
GO

CREATE TABLE AnnouncementTarget (
                                    announcement_target_id BIGINT IDENTITY(1,1) NOT NULL,
                                    announcement_id BIGINT NULL,
                                    role_id BIGINT NULL,
                                    CONSTRAINT pk_announcement_target PRIMARY KEY (announcement_target_id),
                                    CONSTRAINT fk_at_announcement FOREIGN KEY (announcement_id) REFERENCES Announcement(announcement_id),
                                    CONSTRAINT fk_at_role FOREIGN KEY (role_id) REFERENCES [Role](role_id)
);
GO

CREATE TABLE Category (
                          category_id BIGINT IDENTITY(1,1) NOT NULL,
                          contest_id BIGINT NULL,
                          category_name NVARCHAR(100) NULL,
                          description TEXT NULL,
                          guideline_url VARCHAR(255) NULL,
                          status VARCHAR(50) NULL,
                          CONSTRAINT pk_category PRIMARY KEY (category_id),
                          CONSTRAINT fk_category_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id)
);
GO

CREATE TABLE Mentor (
                        user_id BIGINT NOT NULL,
                        status VARCHAR(50) NULL,
                        CONSTRAINT pk_mentor PRIMARY KEY (user_id),
                        CONSTRAINT fk_mentor_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE Judge (
                       user_id BIGINT NOT NULL,
                       expertise NVARCHAR(100) NULL,
                       status VARCHAR(50) NULL,
                       CONSTRAINT pk_judge PRIMARY KEY (user_id),
                       CONSTRAINT fk_judge_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE Team (
                      team_id BIGINT IDENTITY(1,1) NOT NULL,
                      contest_id BIGINT NULL,
                      user_id BIGINT NULL,
                      team_code VARCHAR(50) NULL,
                      team_name NVARCHAR(100) NULL,
                      status VARCHAR(50) NULL,
                      created_at DATETIME NULL,
                      CONSTRAINT pk_team PRIMARY KEY (team_id),
                      CONSTRAINT uq_team_code UNIQUE (team_code),
                      CONSTRAINT fk_team_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id),
                      CONSTRAINT fk_team_mentor FOREIGN KEY (user_id) REFERENCES Mentor(user_id)
);
GO

CREATE TABLE TeamMembership (
                                team_membership_id BIGINT IDENTITY(1,1) NOT NULL,
                                team_id BIGINT NULL,
                                user_id BIGINT NULL,
                                member_role NVARCHAR(50) NULL,
                                status VARCHAR(50) NULL,
                                joined_at DATETIME NULL,
                                CONSTRAINT pk_team_membership PRIMARY KEY (team_membership_id),
                                CONSTRAINT uq_team_membership_user UNIQUE (user_id),
                                CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                                CONSTRAINT fk_tm_student FOREIGN KEY (user_id) REFERENCES Student(user_id)
);
GO

CREATE TABLE TeamRegistration (
                                  team_registration_id BIGINT IDENTITY(1,1) NOT NULL,
                                  team_id BIGINT NULL,
                                  category_id BIGINT NULL,
                                  status VARCHAR(50) NULL,
                                  submitted_at DATETIME NULL,
                                  CONSTRAINT pk_team_registration PRIMARY KEY (team_registration_id),
                                  CONSTRAINT fk_tr_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                                  CONSTRAINT fk_tr_category FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
GO

CREATE TABLE [Round] (
                         round_id BIGINT IDENTITY(1,1) NOT NULL,
    contest_id BIGINT NULL,
    round_name NVARCHAR(100) NULL,
    round_order INT NULL,
    round_format NVARCHAR(50) NULL,
    submission_open_at DATETIME NULL,
    submission_deadline_at DATETIME NULL,
    status VARCHAR(50) NULL,
    CONSTRAINT pk_round PRIMARY KEY (round_id),
    CONSTRAINT fk_round_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id)
    );
GO

CREATE TABLE Submission (
                            submission_id BIGINT IDENTITY(1,1) NOT NULL,
                            team_id BIGINT NULL,
                            round_id BIGINT NULL,
                            github_url VARCHAR(255) NULL,
                            demo_url VARCHAR(255) NULL,
                            document_url VARCHAR(255) NULL,
                            slide_url VARCHAR(255) NULL,
                            submitted_at DATETIME NULL,
                            status VARCHAR(50) NULL,
                            CONSTRAINT pk_submission PRIMARY KEY (submission_id),
                            CONSTRAINT fk_submission_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                            CONSTRAINT fk_submission_round FOREIGN KEY (round_id) REFERENCES [Round](round_id)
);
GO

CREATE TABLE MentorAssignment (
                                  mentor_assignment_id BIGINT IDENTITY(1,1) NOT NULL,
                                  category_id BIGINT NULL,
                                  user_id BIGINT NULL,
                                  status VARCHAR(50) NULL,
                                  CONSTRAINT pk_mentor_assignment PRIMARY KEY (mentor_assignment_id),
                                  CONSTRAINT fk_ma_category FOREIGN KEY (category_id) REFERENCES Category(category_id),
                                  CONSTRAINT fk_ma_mentor FOREIGN KEY (user_id) REFERENCES Mentor(user_id)
);
GO

CREATE TABLE JudgeAssignment (
                                 judge_assignment_id BIGINT IDENTITY(1,1) NOT NULL,
                                 category_id BIGINT NULL,
                                 user_id BIGINT NULL,
                                 status VARCHAR(50) NULL,
                                 CONSTRAINT pk_judge_assignment PRIMARY KEY (judge_assignment_id),
                                 CONSTRAINT fk_ja_category FOREIGN KEY (category_id) REFERENCES Category(category_id),
                                 CONSTRAINT fk_ja_judge FOREIGN KEY (user_id) REFERENCES Judge(user_id)
);
GO

CREATE TABLE RubricTemplate (
                                rubric_template_id BIGINT IDENTITY(1,1) NOT NULL,
                                category_id BIGINT NULL,
                                template_name NVARCHAR(100) NULL,
                                description TEXT NULL,
                                status VARCHAR(50) NULL,
                                CONSTRAINT pk_rubric_template PRIMARY KEY (rubric_template_id),
                                CONSTRAINT fk_rt_category FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
GO

CREATE TABLE RubricTemplateCriteria (
                                        template_criteria_id BIGINT IDENTITY(1,1) NOT NULL,
                                        rubric_template_id BIGINT NULL,
                                        criteria_name NVARCHAR(100) NULL,
                                        description TEXT NULL,
                                        default_weight DECIMAL(18,2) NULL,
                                        max_score DECIMAL(18,2) NULL,
                                        CONSTRAINT pk_rubric_template_criteria PRIMARY KEY (template_criteria_id),
                                        CONSTRAINT fk_rtc_template FOREIGN KEY (rubric_template_id) REFERENCES RubricTemplate(rubric_template_id)
);
GO

CREATE TABLE ContestRubric (
                               contest_rubric_id BIGINT IDENTITY(1,1) NOT NULL,
                               rubric_template_id BIGINT NULL,
                               round_id BIGINT NULL,
                               category_id BIGINT NULL,
                               rubric_name NVARCHAR(100) NULL,
                               total_weight DECIMAL(18,2) NULL,
                               status VARCHAR(50) NULL,
                               CONSTRAINT pk_contest_rubric PRIMARY KEY (contest_rubric_id),
                               CONSTRAINT fk_cr_template FOREIGN KEY (rubric_template_id) REFERENCES RubricTemplate(rubric_template_id),
                               CONSTRAINT fk_cr_round FOREIGN KEY (round_id) REFERENCES [Round](round_id),
                               CONSTRAINT fk_cr_category FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
GO

CREATE TABLE ContestRubricDetails (
                                      contest_rubric_detail_id BIGINT IDENTITY(1,1) NOT NULL,
                                      contest_rubric_id BIGINT NULL,
                                      criteria_name NVARCHAR(100) NULL,
                                      description TEXT NULL,
    [weight] DECIMAL(18,2) NULL,
    max_score DECIMAL(18,2) NULL,
    CONSTRAINT pk_contest_rubric_details PRIMARY KEY (contest_rubric_detail_id),
    CONSTRAINT fk_crd_contest_rubric FOREIGN KEY (contest_rubric_id) REFERENCES ContestRubric(contest_rubric_id)
    );
GO

CREATE TABLE Score (
                       score_id BIGINT IDENTITY(1,1) NOT NULL,
                       submission_id BIGINT NULL,
                       user_id BIGINT NULL,
                       total_score DECIMAL(18,2) NULL,
                       general_feedback TEXT NULL,
                       status VARCHAR(50) NULL,
                       CONSTRAINT pk_score PRIMARY KEY (score_id),
                       CONSTRAINT fk_score_submission FOREIGN KEY (submission_id) REFERENCES Submission(submission_id),
                       CONSTRAINT fk_score_judge FOREIGN KEY (user_id) REFERENCES Judge(user_id)
);
GO

CREATE TABLE ScoreDetail (
                             score_detail_id BIGINT IDENTITY(1,1) NOT NULL,
                             score_id BIGINT NULL,
                             contest_rubric_detail_id BIGINT NULL,
                             raw_score DECIMAL(18,2) NULL,
                             weighted_score DECIMAL(18,2) NULL,
                             feedback TEXT NULL,
                             CONSTRAINT pk_score_detail PRIMARY KEY (score_detail_id),
                             CONSTRAINT fk_sd_score FOREIGN KEY (score_id) REFERENCES Score(score_id),
                             CONSTRAINT fk_sd_contest_rubric_detail FOREIGN KEY (contest_rubric_detail_id) REFERENCES ContestRubricDetails(contest_rubric_detail_id)
);
GO

CREATE TABLE RankingResult (
                               ranking_result_id BIGINT IDENTITY(1,1) NOT NULL,
                               round_id BIGINT NULL,
                               category_id BIGINT NULL,
                               team_id BIGINT NULL,
                               user_id BIGINT NULL,
                               rank_no INT NULL,
                               final_score DECIMAL(18,2) NULL,
                               qualification_status NVARCHAR(50) NULL,
                               date_published_at DATETIME NULL,
                               CONSTRAINT pk_ranking_result PRIMARY KEY (ranking_result_id),
                               CONSTRAINT fk_rr_round FOREIGN KEY (round_id) REFERENCES [Round](round_id),
                               CONSTRAINT fk_rr_category FOREIGN KEY (category_id) REFERENCES Category(category_id),
                               CONSTRAINT fk_rr_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                               CONSTRAINT fk_rr_coordinator FOREIGN KEY (user_id) REFERENCES Coordinator(user_id)
);
GO