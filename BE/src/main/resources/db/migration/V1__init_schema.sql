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
    created_at DATETIME NULL CONSTRAINT df_user_created_at DEFAULT GETDATE(),
    CONSTRAINT pk_user PRIMARY KEY (user_id),
    CONSTRAINT uq_user_username UNIQUE (username),
    CONSTRAINT uq_user_email UNIQUE (email)
    );
GO

CREATE TABLE VerificationToken (
                                   token_id BIGINT IDENTITY(1,1) NOT NULL,
                                   user_id BIGINT NOT NULL,
                                   token VARCHAR(255) NOT NULL,
                                   token_type VARCHAR(50) NULL,
                                   expires_at DATETIME NOT NULL,
                                   used_at DATETIME NULL,
                                   CONSTRAINT pk_verification_token PRIMARY KEY (token_id),
                                   CONSTRAINT fk_verification_token_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE [Role] (
                        role_id BIGINT IDENTITY(1,1) NOT NULL,
    role_name NVARCHAR(50) NOT NULL,
    description NVARCHAR(255) NULL,
    CONSTRAINT pk_role PRIMARY KEY (role_id),
    CONSTRAINT uq_role_name UNIQUE (role_name)
    );
GO

CREATE TABLE UserRole (
                          user_role_id BIGINT IDENTITY(1,1) NOT NULL,
                          user_id BIGINT NULL,
                          role_id BIGINT NULL,
                          expires_at DATETIME NULL,
                          is_active BIT NULL CONSTRAINT df_user_role_is_active DEFAULT 1,
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
                            university_name NVARCHAR(100) NOT NULL,
                            university_code VARCHAR(50) NULL,
                            email_regex VARCHAR(100) NULL,
                            student_code_regex VARCHAR(100) NULL,
                            status VARCHAR(50) NULL,
                            CONSTRAINT pk_university PRIMARY KEY (university_id),
                            CONSTRAINT uq_university_name UNIQUE (university_name)
);
GO

CREATE UNIQUE NONCLUSTERED INDEX uq_university_code
ON University(university_code)
WHERE university_code IS NOT NULL;
GO

CREATE TABLE StudentVerificationData (
                                         verification_data_id BIGINT IDENTITY(1,1) NOT NULL,
                                         university_id BIGINT NULL,
                                         student_code VARCHAR(50) NOT NULL,
                                         email VARCHAR(50) NOT NULL,
                                         full_name NVARCHAR(100) NOT NULL,
                                         major NVARCHAR(100) NOT NULL,
                                         is_current_student BIT NOT NULL CONSTRAINT df_svd_current DEFAULT 1,
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
                          semester_code VARCHAR(50) NOT NULL,
                          CONSTRAINT pk_semester PRIMARY KEY (semester_id),
                          CONSTRAINT uq_semester_code UNIQUE (semester_code)
);
GO

CREATE TABLE Student (
                         user_id BIGINT NOT NULL,
                         university_id BIGINT NULL,
                         student_code VARCHAR(50) NOT NULL,
                         major NVARCHAR(100) NOT NULL,
                         student_email VARCHAR(50) NOT NULL,
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
                         contest_name NVARCHAR(100) NOT NULL,
                         theme NVARCHAR(100) NULL,
                         region NVARCHAR(50) NULL,
                         max_teams INT NULL,
                         status VARCHAR(50) NOT NULL,
                         registration_start DATE NULL,
                         registration_end DATE NULL,
                         development_start DATE NULL,
                         development_end DATE NULL,
                         allowed_corporate_domains NVARCHAR(500) NULL,
                         track_themes NVARCHAR(500) NULL,
                         compliance_rules NVARCHAR(MAX) NULL,
                         tiered_prize_structures NVARCHAR(MAX) NULL,
                         hero_branding_banner VARCHAR(255) NULL,
                         created_at DATETIME NULL CONSTRAINT df_contest_created_at DEFAULT GETDATE(),
                         CONSTRAINT pk_contest PRIMARY KEY (contest_id),
                         CONSTRAINT fk_contest_semester FOREIGN KEY (semester_id) REFERENCES Semester(semester_id)
);
GO

CREATE TABLE ContestUniversity (
                                   contest_university_id BIGINT IDENTITY(1,1) NOT NULL,
                                   contest_id BIGINT NOT NULL,
                                   university_id BIGINT NOT NULL,
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
                              title NVARCHAR(100) NOT NULL,
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
                                    announcement_id BIGINT NOT NULL,
                                    role_id BIGINT NOT NULL,
                                    CONSTRAINT pk_announcement_target PRIMARY KEY (announcement_target_id),
                                    CONSTRAINT fk_at_announcement FOREIGN KEY (announcement_id) REFERENCES Announcement(announcement_id),
                                    CONSTRAINT fk_at_role FOREIGN KEY (role_id) REFERENCES [Role](role_id)
);
GO

CREATE TABLE Category (
                          category_id BIGINT IDENTITY(1,1) NOT NULL,
                          contest_id BIGINT NULL,
                          category_name NVARCHAR(100) NOT NULL,
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
                      team_code VARCHAR(50) NOT NULL,
                      team_name NVARCHAR(100) NOT NULL,
                      status VARCHAR(50) NOT NULL,
                      created_at DATETIME NULL CONSTRAINT df_team_created_at DEFAULT GETDATE(),
                      CONSTRAINT pk_team PRIMARY KEY (team_id),
                      CONSTRAINT uq_team_code UNIQUE (team_code),
                      CONSTRAINT fk_team_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id),
                      CONSTRAINT fk_team_mentor FOREIGN KEY (user_id) REFERENCES Mentor(user_id)
);
GO

CREATE TABLE TeamMembership (
                                team_membership_id BIGINT IDENTITY(1,1) NOT NULL,
                                team_id BIGINT NOT NULL,
                                user_id BIGINT NOT NULL,
                                member_role NVARCHAR(50) NOT NULL,
                                status VARCHAR(50) NOT NULL,
                                joined_at DATETIME NULL,
                                CONSTRAINT pk_team_membership PRIMARY KEY (team_membership_id),
                                CONSTRAINT uq_team_membership_user UNIQUE (user_id),
                                CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                                CONSTRAINT fk_tm_student FOREIGN KEY (user_id) REFERENCES Student(user_id)
);
GO

CREATE TABLE TeamRegistration (
                                  team_registration_id BIGINT IDENTITY(1,1) NOT NULL,
                                  team_id BIGINT NOT NULL,
                                  category_id BIGINT NOT NULL,
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
    round_name NVARCHAR(100) NOT NULL,
    round_order INT NULL,
    round_format NVARCHAR(50) NOT NULL,
    submission_open_at DATETIME NOT NULL,
    submission_deadline_at DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL,
    CONSTRAINT pk_round PRIMARY KEY (round_id),
    CONSTRAINT fk_round_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id)
    );
GO

CREATE TABLE Submission (
                            submission_id BIGINT IDENTITY(1,1) NOT NULL,
                            team_id BIGINT NOT NULL,
                            round_id BIGINT NULL,
                            github_url VARCHAR(255) NULL,
                            demo_url VARCHAR(255) NULL,
                            document_url VARCHAR(255) NULL,
                            slide_url VARCHAR(255) NULL,
                            version INT NULL,
                            history_log TEXT NULL,
                            submitted_at DATETIME NULL,
                            status VARCHAR(50) NULL,
                            CONSTRAINT pk_submission PRIMARY KEY (submission_id),
                            CONSTRAINT fk_submission_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                            CONSTRAINT fk_submission_round FOREIGN KEY (round_id) REFERENCES [Round](round_id)
);
GO

CREATE TABLE MentorAssignment (
                                  mentor_assignment_id BIGINT IDENTITY(1,1) NOT NULL,
                                  category_id BIGINT NOT NULL,
                                  user_id BIGINT NOT NULL,
                                  status VARCHAR(50) NULL,
                                  CONSTRAINT pk_mentor_assignment PRIMARY KEY (mentor_assignment_id),
                                  CONSTRAINT fk_ma_category FOREIGN KEY (category_id) REFERENCES Category(category_id),
                                  CONSTRAINT fk_ma_mentor FOREIGN KEY (user_id) REFERENCES Mentor(user_id)
);
GO

CREATE TABLE JudgeAssignment (
                                 judge_assignment_id BIGINT IDENTITY(1,1) NOT NULL,
                                 category_id BIGINT NOT NULL,
                                 user_id BIGINT NOT NULL,
                                 status VARCHAR(50) NULL,
                                 CONSTRAINT pk_judge_assignment PRIMARY KEY (judge_assignment_id),
                                 CONSTRAINT fk_ja_category FOREIGN KEY (category_id) REFERENCES Category(category_id),
                                 CONSTRAINT fk_ja_judge FOREIGN KEY (user_id) REFERENCES Judge(user_id)
);
GO

CREATE TABLE RubricTemplate (
                                rubric_template_id BIGINT IDENTITY(1,1) NOT NULL,
                                category_id BIGINT NULL,
                                template_name NVARCHAR(100) NOT NULL,
                                description TEXT NULL,
                                status VARCHAR(50) NULL,
                                CONSTRAINT pk_rubric_template PRIMARY KEY (rubric_template_id),
                                CONSTRAINT fk_rt_category FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
GO

CREATE TABLE RubricTemplateCriteria (
                                        template_criteria_id BIGINT IDENTITY(1,1) NOT NULL,
                                        rubric_template_id BIGINT NOT NULL,
                                        criteria_name NVARCHAR(100) NOT NULL,
                                        description TEXT NULL,
                                        default_weight DECIMAL(18,2) NOT NULL,
                                        max_score DECIMAL(18,2) NOT NULL,
                                        CONSTRAINT pk_rubric_template_criteria PRIMARY KEY (template_criteria_id),
                                        CONSTRAINT fk_rtc_template FOREIGN KEY (rubric_template_id) REFERENCES RubricTemplate(rubric_template_id)
);
GO

CREATE TABLE ContestRubric (
                               contest_rubric_id BIGINT IDENTITY(1,1) NOT NULL,
                               rubric_template_id BIGINT NOT NULL,
                               round_id BIGINT NOT NULL,
                               category_id BIGINT NOT NULL,
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
                                      contest_rubric_id BIGINT NOT NULL,
                                      criteria_name NVARCHAR(100) NOT NULL,
                                      description TEXT NULL,
    [weight] DECIMAL(18,2) NOT NULL,
    max_score DECIMAL(18,2) NOT NULL,
    CONSTRAINT pk_contest_rubric_details PRIMARY KEY (contest_rubric_detail_id),
    CONSTRAINT fk_crd_contest_rubric FOREIGN KEY (contest_rubric_id) REFERENCES ContestRubric(contest_rubric_id)
    );
GO

CREATE TABLE Score (
                       score_id BIGINT IDENTITY(1,1) NOT NULL,
                       submission_id BIGINT NOT NULL,
                       user_id BIGINT NOT NULL,
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
                             score_id BIGINT NOT NULL,
                             contest_rubric_detail_id BIGINT NOT NULL,
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
                               round_id BIGINT NOT NULL,
                               category_id BIGINT NOT NULL,
                               team_id BIGINT NOT NULL,
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

INSERT INTO University (university_name, university_code, student_code_regex, email_regex, status)
VALUES
(N'Đại học FPT', 'FPT', '^[S|C][A-Z][0-9]{6}$', '^.*@gmail\.com$', 'ACTIVE'),
(N'Đại học Nông Lâm TP.HCM','HCMUAF','^[0-9]{8}$','^[0-9]{8}@st.hcmuaf.edu.vn$','ACTIVE'),
(N'Đại học Bách Khoa TP.HCM','HCMUT','^[0-9]{7}$','^[a-zA-Z0-9.-]+@hcmut.edu.vn$','ACTIVE'),
(N'Đại học Khoa học Tự nhiên TP.HCM','HCMUS','^[0-9]{8}$','^[0-9]{8}@student.hcmus.edu.vn$','ACTIVE'),
(N'Đại học Ngoại ngữ - Tin học TP.HCM','HUFLIT','^[0-9]{2}[A-Z]{2}[0-9]{6}$','^[0-9]{2}[A-Z]{2}[0-9]{6}@st.huflit.edu.vn$','ACTIVE');
GO

INSERT INTO [Role] (role_name, description) VALUES ('ADMIN', N'Quản trị viên hệ thống');
INSERT INTO [Role] (role_name, description) VALUES ('STUDENT', N'Sinh viên tham gia Hackathon');
INSERT INTO [Role] (role_name, description) VALUES ('JUDGE', N'Ban giám khảo chấm thi');
INSERT INTO [Role] (role_name, description) VALUES ('MENTOR', N'Người hướng dẫn dự án');
GO

INSERT INTO [User] (username, email, password, full_name, email_verified, status) VALUES
('admin1', 'admin1@gmail.com', 'Admin1234', N'Admin', 1, 'ACTIVE'),
('judge1', 'judge1@gmail.com', 'Judge1123', N'Giám Khảo 1', 1, 'ACTIVE'),
('mentor1', 'mentor1@gamil.com', 'Mentor1234', N'Mentor 1', 1, 'ACTIVE'),
('admin2', 'admin2@gmail.com', 'Admin2234', N'Admin Số 2', 1, 'ACTIVE'),
('judge2', 'judge2@gmail.com', 'Judge2123', N'Giám Khảo Số 2', 1, 'ACTIVE'),
('mentor2', 'mentor2@gmail.com', 'Mentor2234', N'Mentor Số 2', 1, 'ACTIVE'),
('judge_mentor', 'judge_mentor@gmail.com', 'AdminMentor123', N'Người dùng 2 Role', 1, 'ACTIVE'),

--DH FPT
('nhatmy12', 'nhatmysocutedl@gmail.com', 'nhatmy12', N'Nguyễn Trần Nhật Mỹ', 1, 'ACTIVE'),
('tuanhne', 'vuthituanh123@gmail.com', 'tuanh123', N'Vũ Thị Tú Anh', 1, 'ACTIVE'),
('haiyen90', 'huongtuongyen1982@gmail.com', 'haiyen90', N'Nguyễn Thị Hải Yến', 1, 'ACTIVE'),
('xuanbach2', 'vuxuanbach2508@gmail.com', 'bach2508', N'Vũ Xuân Bách', 1, 'ACTIVE'),
('quangne', 'nguyendangduyquang@gmail.com', 'Quang5123', N'Nguyễn Đặng Duy Quang', 1, 'ACTIVE'),
('tuan789', 'buianhtuan123@gmail.com', 'tuan3456', N'Bùi Anh Tuấn', 1, 'ACTIVE'),
('hien23', 'thuhien456@gmail.com', 'hien1010', N'Trần Thị Thu Hiền', 1, 'ACTIVE'),
('phuonguyen45', 'phuonguyen@gmail.com', 'uyen4567', N'Lê Ngọc Phương Uyên', 1, 'ACTIVE'),
('trinhnguyen1', 'dntotrinh@gmail.com', 'Totrinh56', N'Dương Nguyễn Tố Trinh', 1, 'ACTIVE'),
('nhanha12', 'phannha@gmail.com', 'nhasi1000', N'Phan Nha', 1, 'ACTIVE'),

--ĐH Nông Lâm TP.HCM
('baobao11', '12345678@st.hcmuaf.edu.vn', 'thaibao123', N'Thái Nguyễn Gia Bảo', 1, 'ACTIVE'),
('letoan34', '09876543@st.hcmuaf.edu.vn', 'vantoan01', N'Lê Văn Toàn', 1, 'ACTIVE'),

--Bách Khoa TP.HCM
('phucduy78', 'Leduyphuc@hcmut.edu.vn', 'duyphuc123', N'Lê Duy Phúc', 1, 'ACTIVE'),
('hanphạm00', 'Phamgiahan@hcmut.edu.vn', 'hanhan2005', N'Phạm Gia Hân', 1, 'ACTIVE'),

--KHTN TP.HCM
('quantran90', '20120001@student.hcmus.edu.vn', 'quan1234', N'Trần Minh Quân', 1, 'ACTIVE'),
('tunhien11', '20120002@student.hcmus.edu.vn', 'nhien123', N'Hoàng Tự Nhiên', 1, 'ACTIVE'),

--HUFLIT
('hieuminh1', '20IT123456@st.huflit.edu.vn', 'minhvu123', N'Vũ Hiếu Minh', 1, 'ACTIVE'),
('datle2004', '20IT123457@st.huflit.edu.vn', 'datle1234', N'Lê Tiến Đạt', 1, 'ACTIVE');
GO

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'admin1' AND r.role_name = 'ADMIN';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username IN (
    'nhatmy12', 'tuanhne', 'haiyen90', 'xuanbach2', 'quangne', 'tuan789', 'hien23', 'phuonguyen45', 'trinhnguyen1', 'nhanha12',
    'baobao11', 'letoan34', 'phucduy78', 'hanphạm00', 'quantran90', 'tunhien11', 'hieuminh1', 'datle2004')
AND r.role_name = 'STUDENT';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'judge1' AND r.role_name = 'JUDGE';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'mentor1' AND r.role_name = 'MENTOR';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'admin2' AND r.role_name = 'ADMIN';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'judge2' AND r.role_name = 'JUDGE';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'mentor2' AND r.role_name = 'MENTOR';

INSERT INTO UserRole (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, 1 FROM [User] u, [Role] r
WHERE u.username = 'judge_mentor' AND r.role_name IN ('JUDGE', 'MENTOR');
GO

DECLARE @UniId_FPT BIGINT = (SELECT TOP 1 university_id FROM University WHERE university_code = 'FPT');
IF @UniId_FPT IS NOT NULL
BEGIN
INSERT INTO StudentVerificationData (university_id, student_code, email, full_name, major, is_current_student)
VALUES
    (@UniId_FPT, 'SE185041', 'nhatmysocutedl@gmail.com', N'Nguyễn Trần Nhật Mỹ', 'SE', 1),
    (@UniId_FPT, 'SE185042', 'vuthituanh123@gmail.com', N'Vũ Thị Tú Anh', 'SE', 1),
    (@UniId_FPT, 'SE185043', 'huongtuongyen1982@gmail.com', N'Nguyễn Thị Hải Yến', 'SE', 1),
    (@UniId_FPT, 'SE185044', 'vuxuanbach2508@gmail.com', N'Vũ Xuân Bách', 'SE', 1),
    (@UniId_FPT, 'SE185045', 'nguyendangduyquang@gmail.com', N'Nguyễn Đặng Duy Quang', 'SE', 1),
    (@UniId_FPT, 'SE185046', 'buianhtuan123@gmail.com', N'Bùi Anh Tuấn', 'SE', 1),
    (@UniId_FPT, 'SE185047', 'thuhien456@gmail.com', N'Trần Thị Thu Hiền', 'SE', 1),
    (@UniId_FPT, 'SE185048', 'phuonguyen@gmail.com', N'Lê Ngọc Phương Uyên', 'SE', 1),
    (@UniId_FPT, 'SE185049', 'dntotrinh@gmail.com', N'Dương Nguyễn Tố Trinh', 'SE', 1),
    (@UniId_FPT, 'SE185050', 'phannha@gmail.com', N'Phan Nha', 'SE', 1);

INSERT INTO Student (user_id, university_id, student_code, major, student_email, status)
SELECT u.user_id, @UniId_FPT, v.student_code, v.major, u.email, 'ACTIVE'
FROM [User] u JOIN StudentVerificationData v ON u.email = v.email
WHERE u.email IN ('nhatmysocutedl@gmail.com', 'vuthituanh123@gmail.com', 'huongtuongyen1982@gmail.com', 'vuxuanbach2508@gmail.com', 'nguyendangduyquang@gmail.com', 'buianhtuan123@gmail.com', 'thuhien456@gmail.com', 'phuonguyen@gmail.com', 'dntotrinh@gmail.com', 'phannha@gmail.com');
END
GO


DECLARE @UniId_HCMUAF BIGINT = (SELECT TOP 1 university_id FROM University WHERE university_code = 'HCMUAF');
IF @UniId_HCMUAF IS NOT NULL
BEGIN
INSERT INTO StudentVerificationData (university_id, student_code, email, full_name, major, is_current_student)
VALUES
    (@UniId_HCMUAF, '12345678', '12345678@st.hcmuaf.edu.vn', N'Thái Nguyễn Gia Bảo', 'IT', 1),
    (@UniId_HCMUAF, '09876543', '09876543@st.hcmuaf.edu.vn', N'Lê Văn Toàn', 'IT', 1);

INSERT INTO Student (user_id, university_id, student_code, major, student_email, status)
SELECT u.user_id, @UniId_HCMUAF, v.student_code, v.major, u.email, 'ACTIVE'
FROM [User] u JOIN StudentVerificationData v ON u.email = v.email
WHERE u.email IN ('12345678@st.hcmuaf.edu.vn', '09876543@st.hcmuaf.edu.vn');
END
GO


DECLARE @UniId_HCMUT BIGINT = (SELECT TOP 1 university_id FROM University WHERE university_code = 'HCMUT');
IF @UniId_HCMUT IS NOT NULL
BEGIN
INSERT INTO StudentVerificationData (university_id, student_code, email, full_name, major, is_current_student)
VALUES
    (@UniId_HCMUT, '2010001', 'Leduyphuc@hcmut.edu.vn', N'Lê Duy Phúc', 'CS', 1),
    (@UniId_HCMUT, '2010002', 'Phamgiahan@hcmut.edu.vn', N'Phạm Gia Hân', 'CS', 1);

INSERT INTO Student (user_id, university_id, student_code, major, student_email, status)
SELECT u.user_id, @UniId_HCMUT, v.student_code, v.major, u.email, 'ACTIVE'
FROM [User] u JOIN StudentVerificationData v ON u.email = v.email
WHERE u.email IN ('Leduyphuc@hcmut.edu.vn', 'Phamgiahan@hcmut.edu.vn');
END
GO


DECLARE @UniId_HCMUS BIGINT = (SELECT TOP 1 university_id FROM University WHERE university_code = 'HCMUS');
IF @UniId_HCMUS IS NOT NULL
BEGIN
INSERT INTO StudentVerificationData (university_id, student_code, email, full_name, major, is_current_student)
VALUES
    (@UniId_HCMUS, '20120001', '20120001@student.hcmus.edu.vn', N'Trần Minh Quân', 'SE', 1),
    (@UniId_HCMUS, '20120002', '20120002@student.hcmus.edu.vn', N'Hoàng Tự Nhiên', 'SE', 1);

INSERT INTO Student (user_id, university_id, student_code, major, student_email, status)
SELECT u.user_id, @UniId_HCMUS, v.student_code, v.major, u.email, 'ACTIVE'
FROM [User] u JOIN StudentVerificationData v ON u.email = v.email
WHERE u.email IN ('20120001@student.hcmus.edu.vn', '20120002@student.hcmus.edu.vn');
END
GO


DECLARE @UniId_HUFLIT BIGINT = (SELECT TOP 1 university_id FROM University WHERE university_code = 'HUFLIT');
IF @UniId_HUFLIT IS NOT NULL
BEGIN
INSERT INTO StudentVerificationData (university_id, student_code, email, full_name, major, is_current_student)
VALUES
    (@UniId_HUFLIT, '20IT123456', '20IT123456@st.huflit.edu.vn', N'Vũ Hiếu Minh', 'IT', 1),
    (@UniId_HUFLIT, '20IT123457', '20IT123457@st.huflit.edu.vn', N'Lê Tiến Đạt', 'IT', 1);

INSERT INTO Student (user_id, university_id, student_code, major, student_email, status)
SELECT u.user_id, @UniId_HUFLIT, v.student_code, v.major, u.email, 'ACTIVE'
FROM [User] u JOIN StudentVerificationData v ON u.email = v.email
WHERE u.email IN ('20IT123456@st.huflit.edu.vn', '20IT123457@st.huflit.edu.vn');
END
GO

INSERT INTO Judge (user_id, expertise, status)
SELECT user_id, 'Software Engineering', 'ACTIVE' FROM [User] WHERE username = 'judge1';

INSERT INTO Mentor (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username IN ('mentor1', 'judge_mentor');
GO

INSERT INTO Judge (user_id, expertise, status)
SELECT user_id, 'Software Architecture', 'ACTIVE' FROM [User] WHERE username = 'judge2';
GO

INSERT INTO Mentor (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username = 'mentor2';
GO

INSERT INTO Coordinator (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username = 'admin1';
GO

INSERT INTO Coordinator (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username = 'admin2';
GO