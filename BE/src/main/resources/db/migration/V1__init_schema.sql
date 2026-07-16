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
                          entity_name NVARCHAR(255) NULL,
                          reason NVARCHAR(100) NULL,
                          old_value NVARCHAR(100) NULL,
                          new_value NVARCHAR(100) NULL,
                          performed_at DATETIME NULL,
                          CONSTRAINT pk_audit_log PRIMARY KEY (audit_log_id),
                          CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
GO

CREATE TABLE University (
                            university_id BIGINT IDENTITY(1,1) NOT NULL,
                            university_name NVARCHAR(100) NOT NULL,
                            university_code VARCHAR(50) NULL,
                            email_regex VARCHAR(500) NULL,
                            student_code_regex VARCHAR(500) NULL,
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
                         min_team_members INT NULL,
                         max_team_members INT NULL,
                         status VARCHAR(50) NOT NULL,
                         registration_start DATE NULL,
                         registration_end DATE NULL,
                         compliance_rules NVARCHAR(MAX) NULL,
                         tiered_prize_structures NVARCHAR(MAX) NULL,
                         location NVARCHAR(255) NULL,
                         published_at DATETIME2 NULL,
                         contest_start_at DATETIME2 NULL,
                         created_at DATETIME NULL CONSTRAINT df_contest_created_at DEFAULT GETDATE(),
                         contest_end_at DATETIME NULL,
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

CREATE TABLE Admin (
                       user_id BIGINT NOT NULL,
                       status VARCHAR(50) NULL,
                       CONSTRAINT pk_admin PRIMARY KEY (user_id),
                       CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES [User](user_id)
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
                              target_roles VARCHAR(255) NULL,
                              CONSTRAINT pk_announcement PRIMARY KEY (announcement_id),
                              CONSTRAINT fk_announcement_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id),
                              CONSTRAINT fk_announcement_admin FOREIGN KEY (user_id) REFERENCES Admin(user_id)
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
                          description NVARCHAR(255) NULL,
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
                      team_code VARCHAR(50) NOT NULL,
                      team_name NVARCHAR(100) NOT NULL,
                      created_at DATETIME NULL CONSTRAINT df_team_created_at DEFAULT GETDATE(),
                      contest_id BIGINT NULL,
                      status VARCHAR(50) NULL,
                      penalty_details NVARCHAR(MAX) NULL,
                      CONSTRAINT pk_team PRIMARY KEY (team_id),
                      CONSTRAINT uq_team_code UNIQUE (team_code),
                      CONSTRAINT fk_team_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id)
);
GO

CREATE TABLE TeamMentor (
                            team_mentor_id BIGINT IDENTITY(1,1) NOT NULL,
                            team_id BIGINT NOT NULL,
                            user_id BIGINT NOT NULL,
                            category_id BIGINT NOT NULL,
                            status VARCHAR(50) NULL,
                            CONSTRAINT pk_team_mentor PRIMARY KEY (team_mentor_id),
                            CONSTRAINT fk_tmt_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                            CONSTRAINT fk_tmt_mentor FOREIGN KEY (user_id) REFERENCES Mentor(user_id),
                            CONSTRAINT fk_tmt_category FOREIGN KEY (category_id) REFERENCES Category(category_id),
                            CONSTRAINT uq_team_mentor_category UNIQUE (team_id, user_id, category_id)
);
GO


CREATE TABLE TeamMembership (
                                team_membership_id BIGINT IDENTITY(1,1) NOT NULL,
                                team_id BIGINT NOT NULL,
                                user_id BIGINT NOT NULL,
                                member_role NVARCHAR(50) NOT NULL,
                                status VARCHAR(50) NOT NULL,
                                joined_at DATETIME NULL,
                                invitation_token VARCHAR(255) NULL,
                                inviter_user_id BIGINT NULL,
                                CONSTRAINT pk_team_membership PRIMARY KEY (team_membership_id),
                                CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                                CONSTRAINT fk_tm_student FOREIGN KEY (user_id) REFERENCES Student(user_id)
);
GO

CREATE TABLE [Round] (
                         round_id BIGINT IDENTITY(1,1) NOT NULL,
    contest_id BIGINT NULL,
    category_id BIGINT NULL,
    round_name NVARCHAR(100) NOT NULL,
    round_order INT NULL,
    submission_open_at DATETIME NOT NULL,
    submission_deadline_at DATETIME NOT NULL,
    grading_deadline_at DATETIME NULL,
    review_calibration_at DATETIME NULL,
    publish_result_at DATETIME NULL,
    status VARCHAR(50) NOT NULL,
    submission_requirements NVARCHAR(MAX) NULL,
    round_format NVARCHAR(100) NULL,
    CONSTRAINT pk_round PRIMARY KEY (round_id),
    CONSTRAINT fk_round_contest FOREIGN KEY (contest_id) REFERENCES Contest(contest_id),
    CONSTRAINT fk_round_category FOREIGN KEY (category_id) REFERENCES Category(category_id) -- THÊM KHÓA NGOẠI NÀY
    );
GO

CREATE TABLE Submission (
                            submission_id BIGINT IDENTITY(1,1) NOT NULL,
                            team_id BIGINT NOT NULL,
                            round_id BIGINT NULL,
                            submission_data NVARCHAR(MAX) NULL,
                            version INT NULL,
                            history_log NVARCHAR(MAX) NULL,
                            submitted_at DATETIME NULL,
                            status VARCHAR(50) NULL,
                            mentor_feedback NVARCHAR(MAX) NULL,
                            mentor_id BIGINT NULL,
                            CONSTRAINT pk_submission PRIMARY KEY (submission_id),
                            CONSTRAINT fk_submission_team FOREIGN KEY (team_id) REFERENCES Team(team_id),
                            CONSTRAINT fk_submission_round FOREIGN KEY (round_id) REFERENCES [Round](round_id),
                            CONSTRAINT fk_submission_mentor FOREIGN KEY (mentor_id) REFERENCES Mentor(user_id)
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
                                description NVARCHAR(MAX) NULL,
                                status VARCHAR(50) DEFAULT 'TEMPLATE' NULL,
                                CONSTRAINT pk_rubric_template PRIMARY KEY (rubric_template_id),
                                CONSTRAINT fk_rt_category FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
GO

CREATE TABLE RubricTemplateCriteria (
                                        template_criteria_id BIGINT IDENTITY(1,1) NOT NULL,
                                        rubric_template_id BIGINT NOT NULL,
                                        criteria_name NVARCHAR(100) NOT NULL,
                                        description NVARCHAR(255) NULL,
                                        default_weight DECIMAL(18,2) NOT NULL,
                                        max_score DECIMAL(18,2) NOT NULL,
                                        CONSTRAINT pk_rubric_template_criteria PRIMARY KEY (template_criteria_id),
                                        CONSTRAINT fk_rtc_template FOREIGN KEY (rubric_template_id) REFERENCES RubricTemplate(rubric_template_id)
);
GO

CREATE TABLE ContestRubric (
                               contest_rubric_id BIGINT IDENTITY(1,1) NOT NULL,
                               rubric_template_id BIGINT NOT NULL,
                               category_id BIGINT NOT NULL,
                               rubric_name NVARCHAR(100) NULL,
                               total_weight DECIMAL(18,2) NULL,
                               status VARCHAR(50) DEFAULT 'TEMPLATE' NULL,
                               CONSTRAINT pk_contest_rubric PRIMARY KEY (contest_rubric_id),
                               CONSTRAINT fk_cr_template FOREIGN KEY (rubric_template_id) REFERENCES RubricTemplate(rubric_template_id),
                               CONSTRAINT fk_cr_category FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
GO

CREATE TABLE ContestRubricDetails (
                                      contest_rubric_detail_id BIGINT IDENTITY(1,1) NOT NULL,
                                      contest_rubric_id BIGINT NOT NULL,
                                      criteria_name NVARCHAR(100) NOT NULL,
                                      description NVARCHAR(255) NULL,
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
                       general_feedback NVARCHAR(MAX) NULL,
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
                             feedback NVARCHAR(255) NULL,
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
                               CONSTRAINT fk_rr_admin FOREIGN KEY (user_id) REFERENCES Admin(user_id)
);
GO

INSERT INTO University (university_name, university_code, student_code_regex, email_regex, status)
VALUES
(N'Đại học FPT', 'FPT', '^[S|C][A-Z][0-9]{6}$','^[a-zA-Z0-9._%+-]+@(fpt\.edu\.vn|gmail\.com)$', 'ACTIVE'),
(N'Đại học Nông Lâm TP.HCM','HCMUAF','^[0-9]{8}$','^[0-9]{8}@st.hcmuaf.edu.vn$','ACTIVE'),
(N'Đại học Bách Khoa TP.HCM','HCMUT','^[0-9]{7}$','^[a-zA-Z0-9.-]+@hcmut.edu.vn$','ACTIVE'),
(N'Đại học Khoa học Tự nhiên TP.HCM','HCMUS','^[0-9]{8}$','^[0-9]{8}@student.hcmus.edu.vn$','ACTIVE'),
(N'Đại học Ngoại ngữ - Tin học TP.HCM','HUFLIT','^[0-9]{2}DH[0-9]{6}$','^[0-9]{2}DH[0-9]{6}@st.huflit.edu.vn$','ACTIVE');
GO

INSERT INTO [Role] (role_name, description) VALUES ('ADMIN', N'Quản trị viên hệ thống');
INSERT INTO [Role] (role_name, description) VALUES ('STUDENT', N'Sinh viên tham gia Hackathon');
INSERT INTO [Role] (role_name, description) VALUES ('JUDGE', N'Ban giám khảo chấm thi');
INSERT INTO [Role] (role_name, description) VALUES ('MENTOR', N'Người hướng dẫn dự án');
INSERT INTO [Role] (role_name, description) VALUES ('LEADER', N'Lãnh đạo của team');
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
('hieuminh1', '20DH123456@st.huflit.edu.vn', 'minhvu123', N'Vũ Hiếu Minh', 1, 'ACTIVE'),
('datle2004', '20DH123457@st.huflit.edu.vn', 'datle1234', N'Lê Tiến Đạt', 1, 'ACTIVE');
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
    (@UniId_HUFLIT, '20DH123456', '20DH123456@st.huflit.edu.vn', N'Vũ Hiếu Minh', 'IT', 1),
    (@UniId_HUFLIT, '20DH123457', '20DH123457@st.huflit.edu.vn', N'Lê Tiến Đạt', 'IT', 1);

INSERT INTO Student (user_id, university_id, student_code, major, student_email, status)
SELECT u.user_id, @UniId_HUFLIT, v.student_code, v.major, u.email, 'ACTIVE'
FROM [User] u JOIN StudentVerificationData v ON u.email = v.email
WHERE u.email IN ('20DH123456@st.huflit.edu.vn', '20DH123457@st.huflit.edu.vn');
END
GO

INSERT INTO Judge (user_id, expertise, status)
SELECT user_id, 'Software Engineering', 'ACTIVE' FROM [User] WHERE username = 'judge1';

INSERT INTO Mentor (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username IN ('mentor1', 'judge_mentor');
GO

INSERT INTO Judge (user_id, expertise, status)
SELECT user_id, 'Software Architecture', 'ACTIVE' FROM [User] WHERE username IN ('judge2', 'judge_mentor');
GO

INSERT INTO Mentor (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username = 'mentor2';
GO

INSERT INTO Admin (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username = 'admin1';
GO

INSERT INTO Admin (user_id, status)
SELECT user_id, 'ACTIVE' FROM [User] WHERE username = 'admin2';
GO

-- 0. SEMESTERS (4 Distinct Semesters for 4 Contests)
INSERT INTO Semester (term, [year], semester_code)
VALUES
('Spring', 2025, 'SP25'),
('Fall', 2025, 'FA25'),
('Summer', 2026, 'SU26'),
('Spring', 2026, 'SP26');
GO

-- 1. CONTESTS (Each Contest in a DIFFERENT Semester!)
INSERT INTO Contest (semester_id, contest_name, theme, max_teams, min_team_members, max_team_members, status, registration_start, registration_end, contest_start_at, contest_end_at, location, compliance_rules, tiered_prize_structures, published_at)
VALUES
(1, 'National AI Challenge 2025', 'Artificial Intelligence', 100, 3, 6, 'CLOSED', '2025-02-01', '2025-02-10', '2025-02-11 08:00:00', '2025-03-30 23:59:59', N'FPT University Hanoi Campus, Hoa Lac High-Tech Park', N'[{"rule":"All source code must be 100% self-developed during the competition.","penalty":"Disqualified"},{"rule":"All teams must comply with AI ethics and integrity guidelines.","penalty":"Minus 20 points"}]', N'[{"rank":"First Prize","amount":"50,000,000 VND"},{"rank":"Second Prize","amount":"30,000,000 VND"},{"rank":"Third Prize","amount":"15,000,000 VND"}]', '2025-01-15 08:00:00'),
(2, 'Global Blockchain Summit 2025', 'Blockchain & Web3', 80, 3, 6, 'CLOSED', '2025-09-01', '2025-09-15', '2025-09-16 08:00:00', '2025-11-30 23:59:59', N'FPT University HCM Campus, Lot E2a-7, D1 Street, Thu Duc City', N'[{"rule":"Smart contracts must be deployed and verified on Testnet or Mainnet.","penalty":"Disqualified"},{"rule":"Security audit and gas optimization report required prior to submission.","penalty":"Minus 15 points"}]', N'[{"rank":"First Prize","amount":"60,000,000 VND"},{"rank":"Second Prize","amount":"35,000,000 VND"},{"rank":"Third Prize","amount":"20,000,000 VND"}]', '2025-08-15 08:00:00'),
(3, 'SEAL Hackathon 2026', 'Software Engineering & AI Leadership', 150, 3, 5, 'ACTIVED', '2026-07-01', '2026-07-15', '2026-07-16 08:00:00', '2026-08-31 23:59:59', N'FPT University HCM Campus, Lot E2a-7, D1 Street, Thu Duc City', N'[{"rule":"All source code must be developed within the official hackathon timeline.","penalty":"Disqualified"},{"rule":"Participating teams must strictly follow student conduct and academic integrity rules.","penalty":"Minus 20 points"},{"rule":"The decision of the Judging Panel is final and binding.","penalty":"Warning"}]', N'[{"rank":"First Prize","amount":"100,000,000 VND"},{"rank":"Second Prize","amount":"50,000,000 VND"},{"rank":"Third Prize","amount":"25,000,000 VND"},{"rank":"Consolation Prize","amount":"10,000,000 VND"}]', '2026-04-15 08:00:00'),
(4, 'FPT Global Tech Championship 2026', 'Enterprise Cloud & Advanced AI', 200, 3, 6, 'CLOSED', '2026-02-01', '2026-02-15', '2026-02-16 08:00:00', '2026-04-25 23:59:59', N'FPT University Hanoi Campus, Hoa Lac High-Tech Park', N'[{"rule":"Source code must be original and developed during the hackathon.","penalty":"Disqualified"},{"rule":"Teams must comply with IP and open-source regulations.","penalty":"Minus 15 points"}]', N'[{"rank":"Grand Prize","amount":"150,000,000 VND"},{"rank":"First Runner-Up","amount":"80,000,000 VND"},{"rank":"Second Runner-Up","amount":"40,000,000 VND"},{"rank":"Excellence Award","amount":"15,000,000 VND"}]', '2026-01-15 08:00:00');
GO

-- 2. CATEGORIES
SET IDENTITY_INSERT Category ON;
INSERT INTO Category (category_id, contest_id, category_name, description, status)
VALUES
    (1, 1, 'Computer Vision', N'Image Recognition and Computer Vision Applications', 'ACTIVED'),
    (2, 1, 'NLP & LLMs', N'Natural Language Processing and Large Language Models', 'ACTIVED'),
    (3, 1, 'Data Science & Predictive AI', N'Data Science and Predictive AI Analytics', 'ACTIVED'),
    (4, 2, 'Smart Contracts & Security', N'Smart Contract Development and Web3 Security', 'ACTIVED'),
    (5, 2, 'DeFi & Tokenomics', N'Decentralized Finance and Tokenomics Modeling', 'ACTIVED'),
    (6, 2, 'Web3 DApps', N'Decentralized Web3 Application Development', 'ACTIVED'),
    (7, 3, 'AI & Web3 Innovation', N'Innovative Applications combining AI and Blockchain', 'ACTIVED'),
    (8, 3, 'Cloud & Big Data Architecture', N'Cloud Architecture and Big Data Processing Systems', 'ACTIVED'),
    (10, 4, 'Enterprise Cloud & AI Mastery', N'Enterprise-scale Cloud Architecture and AI Systems', 'ACTIVED');
SET IDENTITY_INSERT Category OFF;
GO

-- 3. CONTEST UNIVERSITIES
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 1, university_id FROM University WHERE university_code IN ('HUFLIT', 'HCMUAF', 'FPT');
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 2, university_id FROM University;
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 3, university_id FROM University;
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 4, university_id FROM University;
GO

-- 4. ANNOUNCEMENTS
DECLARE @Admin1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'admin1');
INSERT INTO Announcement (contest_id, user_id, title, content, announcement_type, status, published_at, target_roles)
VALUES
(1, @Admin1_ID, N'Final Results Announcement: National AI Challenge 2025', N'Congratulations to AI Pioneers and Visionary Devs for winning the top awards!', 'GENERAL', 'PUBLISHED', '2026-03-31 09:00:00', 'STUDENT,MENTOR,JUDGE'),
(2, @Admin1_ID, N'Summary of Global Blockchain Summit 2025', N'Blockchain Masters secured First Prize with their breakthrough DeFi solution.', 'GENERAL', 'PUBLISHED', '2025-12-01 09:00:00', 'STUDENT,MENTOR,JUDGE'),
(3, @Admin1_ID, N'Welcome to SEAL Hackathon 2026', N'Official registration portal is now open. Please complete your team roster!', 'REGULATION', 'PUBLISHED', '2026-06-01 08:00:00', 'STUDENT,MENTOR,JUDGE'),
(4, @Admin1_ID, N'Official Leaderboard & Winners of FPT Global Tech Championship 2026', N'Nexus AI emerged as Champion among 10 competing finalist teams in the Global Championship Round.', 'GENERAL', 'PUBLISHED', '2026-04-26 09:00:00', 'STUDENT,MENTOR,JUDGE');
GO

-- 5. RUBRICS & CRITERIA
INSERT INTO RubricTemplate (category_id, template_name, description, status)
VALUES
(1, 'Standard AI - Computer Vision Rubric', N'Standard evaluation criteria for Computer Vision projects', 'ACTIVE'),
(2, 'Standard AI - NLP & LLMs Rubric', N'Standard evaluation criteria for Natural Language & LLM projects', 'ACTIVE'),
(3, 'Standard AI - Predictive Analytics Rubric', N'Standard evaluation criteria for Data Science & Predictive AI projects', 'ACTIVE'),
(4, 'Web3 - Smart Contracts & Security Rubric', N'Standard evaluation criteria for Smart Contract & Security projects', 'ACTIVE'),
(5, 'Web3 - DeFi & Tokenomics Rubric', N'Standard evaluation criteria for DeFi & Tokenomics modeling projects', 'ACTIVE'),
(6, 'Web3 - Decentralized DApps Rubric', N'Standard evaluation criteria for Decentralized Web3 DApp projects', 'ACTIVE'),
(10, 'Enterprise Cloud & AI Rubric', N'Enterprise evaluation criteria for Cloud & Advanced AI solutions', 'ACTIVE');
GO

DECLARE @Rubric1_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 1);
DECLARE @Rubric2_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 2);
DECLARE @Rubric3_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 3);
DECLARE @Rubric4_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 4);
DECLARE @Rubric5_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 5);
DECLARE @Rubric6_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 6);
DECLARE @Rubric10_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 10);

INSERT INTO RubricTemplateCriteria (rubric_template_id, criteria_name, description, default_weight, max_score)
VALUES
-- Category 1
(@Rubric1_ID, 'Innovation & Creativity', N'Uniqueness and creative application of AI models', 30.00, 30.00),
(@Rubric1_ID, 'Technical Complexity', N'Technical depth and algorithm sophistication', 30.00, 30.00),
(@Rubric1_ID, 'Feasibility & Impact', N'Practical viability and real-world social impact', 20.00, 20.00),
(@Rubric1_ID, 'Presentation & Demo', N'Presentation quality and smooth live product demo', 20.00, 20.00),

-- Category 2
(@Rubric2_ID, 'Model Accuracy & Prompt Engineering', N'Precision of NLP models and effectiveness of prompt architectures', 35.00, 35.00),
(@Rubric2_ID, 'Contextual Understanding & Reasoning', N'Depth of language comprehension and logical inference capabilities', 35.00, 35.00),
(@Rubric2_ID, 'Real-world Application & Scalability', N'Practical utility and scalability of language processing solutions', 30.00, 30.00),

-- Category 3
(@Rubric3_ID, 'Data Quality & Feature Engineering', N'Rigorous data preprocessing and predictive feature design', 35.00, 35.00),
(@Rubric3_ID, 'Predictive Model Performance & Robustness', N'Statistical accuracy, generalization, and model robustness', 35.00, 35.00),
(@Rubric3_ID, 'Business Insight & Actionability', N'Clarity of predictive insights and real-world decision impact', 30.00, 30.00),

-- Category 4
(@Rubric4_ID, 'Smart Contract Security', N'Optimal security and vulnerability auditing of Smart Contracts', 35.00, 35.00),
(@Rubric4_ID, 'Decentralization & Utility', N'Degree of decentralization and practical Web3 utility', 35.00, 35.00),
(@Rubric4_ID, 'UI/UX & Web3 Integration', N'User experience and seamless wallet interaction', 30.00, 30.00),

-- Category 5
(@Rubric5_ID, 'Tokenomics Sustainability & Mathematical Rigor', N'Long-term economic viability and mathematical soundness of token models', 35.00, 35.00),
(@Rubric5_ID, 'Liquidity & Yield Protocol Design', N'Efficiency of capital allocation and automated market mechanisms', 35.00, 35.00),
(@Rubric5_ID, 'Regulatory Compliance & Risk Management', N'Systemic risk mitigation and security compliance design', 30.00, 30.00),

-- Category 6
(@Rubric6_ID, 'DApp User Experience & Wallet Seamlessness', N'Smooth decentralized interaction and intuitive wallet connectivity', 35.00, 35.00),
(@Rubric6_ID, 'Decentralized Architecture & On-chain Integration', N'Robust smart contract integration and decentralized storage efficiency', 35.00, 35.00),
(@Rubric6_ID, 'Innovation & Market Adoption Potential', N'Unique value proposition and readiness for mass user adoption', 30.00, 30.00),

-- Category 10
(@Rubric10_ID, 'Cloud Architecture & Reliability', N'Enterprise cloud scalability, fault tolerance, and DevOps practices', 35.00, 35.00),
(@Rubric10_ID, 'Advanced AI & Data Mastery', N'Sophisticated AI model implementation and data processing pipelines', 35.00, 35.00),
(@Rubric10_ID, 'Business Value & Security', N'Enterprise security compliance, ROI potential, and clear business value', 30.00, 30.00);
GO

-- Create ContestRubric and ContestRubricDetails
DECLARE @Rubric1_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 1);
DECLARE @Rubric2_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 2);
DECLARE @Rubric3_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 3);
DECLARE @Rubric4_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 4);
DECLARE @Rubric5_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 5);
DECLARE @Rubric6_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 6);
DECLARE @Rubric10_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE category_id = 10);

INSERT INTO ContestRubric (rubric_template_id, category_id, rubric_name, total_weight, status)
VALUES
(@Rubric1_ID, 1, 'Computer Vision Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric2_ID, 2, 'NLP & LLMs Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric3_ID, 3, 'Data Science & Predictive AI Rubric', 100.00, 'ACTIVE'),
(@Rubric4_ID, 4, 'Smart Contracts Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric5_ID, 5, 'DeFi & Tokenomics Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric6_ID, 6, 'Web3 DApps Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric10_ID, 10, 'Enterprise Cloud & AI Judging Rubric', 100.00, 'ACTIVE');
GO

DECLARE @CR1_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 1);
DECLARE @CR2_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 2);
DECLARE @CR3_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 3);
DECLARE @CR4_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 4);
DECLARE @CR5_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 5);
DECLARE @CR6_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 6);
DECLARE @CR10_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 10);

INSERT INTO ContestRubricDetails (contest_rubric_id, criteria_name, description, [weight], max_score)
VALUES
-- Category 1
(@CR1_ID, 'Innovation & Creativity', N'Uniqueness and creative application of AI models', 30.00, 30.00),
(@CR1_ID, 'Technical Complexity', N'Technical depth and algorithm sophistication', 30.00, 30.00),
(@CR1_ID, 'Feasibility & Impact', N'Practical viability and real-world social impact', 20.00, 20.00),
(@CR1_ID, 'Presentation & Demo', N'Presentation quality and smooth live product demo', 20.00, 20.00),

-- Category 2
(@CR2_ID, 'Model Accuracy & Prompt Engineering', N'Precision of NLP models and effectiveness of prompt architectures', 35.00, 35.00),
(@CR2_ID, 'Contextual Understanding & Reasoning', N'Depth of language comprehension and logical inference capabilities', 35.00, 35.00),
(@CR2_ID, 'Real-world Application & Scalability', N'Practical utility and scalability of language processing solutions', 30.00, 30.00),

-- Category 3
(@CR3_ID, 'Data Quality & Feature Engineering', N'Rigorous data preprocessing and predictive feature design', 35.00, 35.00),
(@CR3_ID, 'Predictive Model Performance & Robustness', N'Statistical accuracy, generalization, and model robustness', 35.00, 35.00),
(@CR3_ID, 'Business Insight & Actionability', N'Clarity of predictive insights and real-world decision impact', 30.00, 30.00),

-- Category 4
(@CR4_ID, 'Smart Contract Security', N'Optimal security and vulnerability auditing of Smart Contracts', 35.00, 35.00),
(@CR4_ID, 'Decentralization & Utility', N'Degree of decentralization and practical Web3 utility', 35.00, 35.00),
(@CR4_ID, 'UI/UX & Web3 Integration', N'User experience and seamless wallet interaction', 30.00, 30.00),

-- Category 5
(@CR5_ID, 'Tokenomics Sustainability & Mathematical Rigor', N'Long-term economic viability and mathematical soundness of token models', 35.00, 35.00),
(@CR5_ID, 'Liquidity & Yield Protocol Design', N'Efficiency of capital allocation and automated market mechanisms', 35.00, 35.00),
(@CR5_ID, 'Regulatory Compliance & Risk Management', N'Systemic risk mitigation and security compliance design', 30.00, 30.00),

-- Category 6
(@CR6_ID, 'DApp User Experience & Wallet Seamlessness', N'Smooth decentralized interaction and intuitive wallet connectivity', 35.00, 35.00),
(@CR6_ID, 'Decentralized Architecture & On-chain Integration', N'Robust smart contract integration and decentralized storage efficiency', 35.00, 35.00),
(@CR6_ID, 'Innovation & Market Adoption Potential', N'Unique value proposition and readiness for mass user adoption', 30.00, 30.00),

-- Category 10
(@CR10_ID, 'Cloud Architecture & Reliability', N'Enterprise cloud scalability, fault tolerance, and DevOps practices', 35.00, 35.00),
(@CR10_ID, 'Advanced AI & Data Mastery', N'Sophisticated AI model implementation and data processing pipelines', 35.00, 35.00),
(@CR10_ID, 'Business Value & Security', N'Enterprise security compliance, ROI potential, and clear business value', 30.00, 30.00);
GO

-- 6. MENTOR & JUDGE ASSIGNMENTS
DECLARE @Mentor1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor1');
DECLARE @Mentor2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor2');
DECLARE @Judge1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge1');
DECLARE @Judge2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge2');
DECLARE @JudgeMentor_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge_mentor');

INSERT INTO MentorAssignment (category_id, user_id, status) VALUES
(1, @Mentor1_ID, 'ACTIVE'), (4, @Mentor2_ID, 'ACTIVE'), (10, @Mentor1_ID, 'ACTIVE'), (10, @Mentor2_ID, 'ACTIVE');

INSERT INTO JudgeAssignment (category_id, user_id, status) VALUES
(1, @Judge1_ID, 'ACTIVE'), (1, @Judge2_ID, 'ACTIVE'), (1, @JudgeMentor_ID, 'ACTIVE'), 
(2, @Judge1_ID, 'ACTIVE'), (2, @Judge2_ID, 'ACTIVE'), (2, @JudgeMentor_ID, 'ACTIVE'), 
(3, @Judge1_ID, 'ACTIVE'), (3, @Judge2_ID, 'ACTIVE'), (3, @JudgeMentor_ID, 'ACTIVE'), 
(4, @Judge1_ID, 'ACTIVE'), (4, @Judge2_ID, 'ACTIVE'), (4, @JudgeMentor_ID, 'ACTIVE'), 
(5, @Judge1_ID, 'ACTIVE'), (5, @Judge2_ID, 'ACTIVE'), (5, @JudgeMentor_ID, 'ACTIVE'), 
(6, @Judge1_ID, 'ACTIVE'), (6, @Judge2_ID, 'ACTIVE'), (6, @JudgeMentor_ID, 'ACTIVE'), 
(10, @Judge1_ID, 'ACTIVE'), (10, @Judge2_ID, 'ACTIVE'), (10, @JudgeMentor_ID, 'ACTIVE');
GO

-- 7. ROUNDS
SET IDENTITY_INSERT [Round] ON;
INSERT INTO [Round] (round_id, contest_id, category_id, round_name, round_order, submission_open_at, submission_deadline_at, grading_deadline_at, publish_result_at, status, submission_requirements, round_format)
VALUES
(1, 1, 1, 'Qualification Round', 1, '2025-02-11 09:00:00', '2025-02-20 23:59:59', '2025-02-23 17:00:00', '2025-02-24 10:00:00', 'CLOSED', N'Source Code URL,Documentation URL', 'Remote Submission'),
(2, 1, 2, 'Semifinal Round', 2, '2025-02-25 08:00:00', '2025-03-15 23:59:59', '2025-03-18 17:00:00', '2025-03-19 10:00:00', 'CLOSED', N'Source Code URL,Documentation URL,Live Demo URL', 'Remote Submission'),
(9, 1, 3, 'Final Presentation', 3, '2025-03-20 08:00:00', '2025-03-27 23:59:59', '2025-03-28 17:00:00', '2025-03-29 10:00:00', 'CLOSED', N'Source Code URL,Live Demo URL,Presentation Slide URL', 'Stage Presentation'),

(3, 2, 4, 'Qualification Round', 1, '2025-09-16 09:00:00', '2025-10-05 23:59:59', '2025-10-08 17:00:00', '2025-10-09 10:00:00', 'CLOSED', N'Source Code URL,Documentation URL', 'Remote Submission'),
(4, 2, 5, 'Semifinal Round', 2, '2025-10-10 08:00:00', '2025-10-25 23:59:59', '2025-10-28 17:00:00', '2025-10-29 10:00:00', 'CLOSED', N'Source Code URL,Documentation URL,Live Demo URL', 'Remote Submission'),
(10, 2, 6, 'Final Presentation', 3, '2025-11-01 08:00:00', '2025-11-20 23:59:59', '2025-11-25 17:00:00', '2025-11-28 10:00:00', 'CLOSED', N'Source Code URL,Live Demo URL,Presentation Slide URL', 'Stage Presentation'),

(5, 3, 7, 'AI & Web3 Innovation Round', 1, '2026-07-16 08:00:00', '2026-07-26 23:59:59', '2026-07-29 17:00:00', '2026-07-30 10:00:00', 'UPCOMING', N'Source Code URL,Live Demo URL,Presentation Slide URL', 'Remote Submission'),
(6, 3, 8, 'Cloud & Big Data Architecture Round', 2, '2026-08-01 08:00:00', '2026-08-11 23:59:59', '2026-08-14 17:00:00', '2026-08-15 10:00:00', 'UPCOMING', N'Source Code URL,Documentation URL,Live Demo URL', 'Remote Submission'),

(8, 4, 10, 'Global Championship Round', 1, '2026-02-16 09:00:00', '2026-04-18 23:59:59', '2026-04-22 17:00:00', '2026-04-24 10:00:00', 'CLOSED', N'Source Code URL,Documentation URL,Live Demo URL,Presentation Slide URL', 'Stage Presentation');
SET IDENTITY_INSERT [Round] OFF;
GO

-- 8. TEAMS & MEMBERSHIPS (3 Historical Completed Teams, 3 Current Ongoing Teams, 2 Forming Teams)
DECLARE @PastTeam1_ID BIGINT, @PastTeam2_ID BIGINT, @PastTeam3_ID BIGINT;
DECLARE @Team1_ID BIGINT, @Team2_ID BIGINT, @Team3_ID BIGINT, @Team4_ID BIGINT, @Team5_ID BIGINT, @Team6_ID BIGINT;
DECLARE @C4_T01_ID BIGINT, @C4_T02_ID BIGINT, @C4_T03_ID BIGINT, @C4_T04_ID BIGINT, @C4_T05_ID BIGINT;
DECLARE @C4_T06_ID BIGINT, @C4_T07_ID BIGINT, @C4_T08_ID BIGINT, @C4_T09_ID BIGINT, @C4_T10_ID BIGINT;
DECLARE @SEAL_T01_ID BIGINT, @SEAL_T02_ID BIGINT, @SEAL_T03_ID BIGINT, @SEAL_T04_ID BIGINT, @SEAL_T05_ID BIGINT, @SEAL_T06_ID BIGINT;

-- Historical Team 1: AI Pioneers (Contest 1, Category 1) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('PAST01', 'AI Pioneers', 1, 'CLOSED', '2026-02-05 10:00:00');
SET @PastTeam1_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam1_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email = 'nhatmysocutedl@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam1_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email IN ('huongtuongyen1982@gmail.com', 'nguyendangduyquang@gmail.com', 'thuhien456@gmail.com', '20DH123457@st.huflit.edu.vn');

-- Historical Team 2: Visionary Devs (Contest 1, Category 1) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('PAST02', 'Visionary Devs', 1, 'CLOSED', '2026-02-06 10:00:00');
SET @PastTeam2_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam2_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email = 'vuthituanh123@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam2_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email IN ('vuxuanbach2508@gmail.com', 'buianhtuan123@gmail.com', 'phuonguyen@gmail.com');

-- Historical Team 3: Blockchain Masters (Contest 2, Category 4) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('PAST03', 'Blockchain Masters', 2, 'CLOSED', '2025-09-05 10:00:00');
SET @PastTeam3_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam3_ID, u.user_id, 'LEADER', 'APPROVED', '2025-09-05 10:00:00' FROM [User] u WHERE u.email = '20120001@student.hcmus.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam3_ID, u.user_id, 'MEMBER', 'APPROVED', '2025-09-05 10:00:00' FROM [User] u WHERE u.email IN ('Phamgiahan@hcmut.edu.vn', '20120002@student.hcmus.edu.vn');

-- Historical Team 4: Cyber Core (Contest 1, Category 1) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('TEAM01', 'Cyber Core', 1, 'CLOSED', '2026-02-07 10:00:00');
SET @Team1_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team1_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-07 10:00:00' FROM [User] u WHERE u.email = 'dntotrinh@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team1_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-07 10:00:00' FROM [User] u WHERE u.email IN ('phannha@gmail.com', '12345678@st.hcmuaf.edu.vn', '09876543@st.hcmuaf.edu.vn', 'Leduyphuc@hcmut.edu.vn');

-- Historical Team 5: Code Rangers (Contest 2, Category 4) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('TEAM02', 'Code Rangers', 2, 'CLOSED', '2025-09-06 10:00:00');
SET @Team2_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team2_ID, u.user_id, 'LEADER', 'APPROVED', '2025-09-06 10:00:00' FROM [User] u WHERE u.email = '20DH123456@st.huflit.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team2_ID, u.user_id, 'MEMBER', 'APPROVED', '2025-09-06 10:00:00' FROM [User] u WHERE u.email IN ('20DH123457@st.huflit.edu.vn', 'nhatmysocutedl@gmail.com', 'huongtuongyen1982@gmail.com', 'Leduyphuc@hcmut.edu.vn');

-- Historical Team 6: Byte Wizards (Contest 2, Category 4) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('TEAM03', 'Byte Wizards', 2, 'CLOSED', '2025-09-07 10:00:00');
SET @Team3_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team3_ID, u.user_id, 'LEADER', 'APPROVED', '2025-09-07 10:00:00' FROM [User] u WHERE u.email = 'vuthituanh123@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team3_ID, u.user_id, 'MEMBER', 'APPROVED', '2025-09-07 10:00:00' FROM [User] u WHERE u.email IN ('vuxuanbach2508@gmail.com', 'buianhtuan123@gmail.com', 'nguyendangduyquang@gmail.com', 'thuhien456@gmail.com');

-- 10 TEAMS FOR CONTEST 4 (FPT Global Tech Championship 2026 - Category 10) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T01', 'Nexus AI', 4, 'CLOSED', '2026-02-05 10:00:00'); SET @C4_T01_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T02', 'Cloud Horizon', 4, 'CLOSED', '2026-02-05 10:00:00'); SET @C4_T02_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T03', 'Quantum Leap', 4, 'CLOSED', '2026-02-06 10:00:00'); SET @C4_T03_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T04', 'Cyber Synapse', 4, 'CLOSED', '2026-02-06 10:00:00'); SET @C4_T04_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T05', 'Vanguard Devs', 4, 'CLOSED', '2026-02-07 10:00:00'); SET @C4_T05_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T06', 'Apex Dynamics', 4, 'CLOSED', '2026-02-07 10:00:00'); SET @C4_T06_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T07', 'Byte Builders', 4, 'CLOSED', '2026-02-08 10:00:00'); SET @C4_T07_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T08', 'Spark Matrix', 4, 'CLOSED', '2026-02-08 10:00:00'); SET @C4_T08_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T09', 'Zero Latency', 4, 'CLOSED', '2026-02-09 10:00:00'); SET @C4_T09_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, contest_id, status, created_at) VALUES ('C4_T10', 'Titan Coders', 4, 'CLOSED', '2026-02-09 10:00:00'); SET @C4_T10_ID = SCOPE_IDENTITY();

-- Assign Members to Contest 4 Teams
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T01_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email = 'nhatmysocutedl@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T01_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email IN ('huongtuongyen1982@gmail.com', 'nguyendangduyquang@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T02_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email = 'vuthituanh123@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T02_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email IN ('vuxuanbach2508@gmail.com', 'buianhtuan123@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T03_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email = 'thuhien456@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T03_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email IN ('phuonguyen@gmail.com', '20120001@student.hcmus.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T04_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email = 'dntotrinh@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T04_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email IN ('phannha@gmail.com', '20120002@student.hcmus.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T05_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-07 10:00:00' FROM [User] u WHERE u.email = '12345678@st.hcmuaf.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T05_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-07 10:00:00' FROM [User] u WHERE u.email IN ('09876543@st.hcmuaf.edu.vn', 'Phamgiahan@hcmut.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T06_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-07 10:00:00' FROM [User] u WHERE u.email = 'Leduyphuc@hcmut.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T06_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-07 10:00:00' FROM [User] u WHERE u.email IN ('20DH123456@st.huflit.edu.vn', '20DH123457@st.huflit.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T07_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-08 10:00:00' FROM [User] u WHERE u.email = '20120001@student.hcmus.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T07_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-08 10:00:00' FROM [User] u WHERE u.email IN ('nhatmysocutedl@gmail.com', 'huongtuongyen1982@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T08_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-08 10:00:00' FROM [User] u WHERE u.email = 'vuxuanbach2508@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T08_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-08 10:00:00' FROM [User] u WHERE u.email IN ('nguyendangduyquang@gmail.com', 'buianhtuan123@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T09_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-09 10:00:00' FROM [User] u WHERE u.email = 'dntotrinh@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T09_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-09 10:00:00' FROM [User] u WHERE u.email IN ('phannha@gmail.com', 'thuhien456@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T10_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-09 10:00:00' FROM [User] u WHERE u.email = '20120002@student.hcmus.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @C4_T10_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-09 10:00:00' FROM [User] u WHERE u.email IN ('12345678@st.hcmuaf.edu.vn', '09876543@st.hcmuaf.edu.vn');

-- 6 TEAMS IN FORMING STATUS (Not yet enrolled into any specific contest)
INSERT INTO Team (team_code, team_name, status, created_at) VALUES ('SEAL_T01', 'Neural Pioneers', 'FORMING', '2026-07-02 10:00:00'); SET @SEAL_T01_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, status, created_at) VALUES ('SEAL_T02', 'Web3 Vanguard', 'FORMING', '2026-07-02 11:00:00'); SET @SEAL_T02_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, status, created_at) VALUES ('SEAL_T03', 'Cloud Architects', 'FORMING', '2026-07-03 10:00:00'); SET @SEAL_T03_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, status, created_at) VALUES ('SEAL_T04', 'Data Synthesizers', 'FORMING', '2026-07-03 14:00:00'); SET @SEAL_T04_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, status, created_at) VALUES ('SEAL_T05', 'IoT Innovators', 'FORMING', '2026-07-04 09:00:00'); SET @SEAL_T05_ID = SCOPE_IDENTITY();
INSERT INTO Team (team_code, team_name, status, created_at) VALUES ('SEAL_T06', 'Smart Mobility', 'FORMING', '2026-07-04 15:00:00'); SET @SEAL_T06_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T01_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-02 10:00:00' FROM [User] u WHERE u.email = 'nhatmysocutedl@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T01_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-02 10:00:00' FROM [User] u WHERE u.email IN ('huongtuongyen1982@gmail.com', 'nguyendangduyquang@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T02_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-02 11:00:00' FROM [User] u WHERE u.email = 'vuthituanh123@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T02_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-02 11:00:00' FROM [User] u WHERE u.email IN ('vuxuanbach2508@gmail.com', 'buianhtuan123@gmail.com');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T03_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-03 10:00:00' FROM [User] u WHERE u.email = 'thuhien456@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T03_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-03 10:00:00' FROM [User] u WHERE u.email IN ('phuonguyen@gmail.com', '20120001@student.hcmus.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T04_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-03 14:00:00' FROM [User] u WHERE u.email = 'dntotrinh@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T04_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-03 14:00:00' FROM [User] u WHERE u.email IN ('phannha@gmail.com', '20120002@student.hcmus.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T05_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-04 09:00:00' FROM [User] u WHERE u.email = '12345678@st.hcmuaf.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T05_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-04 09:00:00' FROM [User] u WHERE u.email IN ('09876543@st.hcmuaf.edu.vn', 'Phamgiahan@hcmut.edu.vn');

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T06_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-04 15:00:00' FROM [User] u WHERE u.email = 'Leduyphuc@hcmut.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @SEAL_T06_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-07-04 15:00:00' FROM [User] u WHERE u.email IN ('20DH123456@st.huflit.edu.vn', '20DH123457@st.huflit.edu.vn');

-- Forming Team 4: Tech Titans (No contest yet) - FORMING
INSERT INTO Team (team_code, team_name, status, created_at)
VALUES ('TEAM04', 'Tech Titans', 'FORMING', '2026-06-05 10:00:00');
SET @Team4_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team4_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-05 10:00:00' FROM [User] u WHERE u.email = 'thuhien456@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team4_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-05 10:00:00' FROM [User] u WHERE u.email IN ('phuonguyen@gmail.com', '09876543@st.hcmuaf.edu.vn', '20120002@student.hcmus.edu.vn');

-- Forming Team 5: Data Ninjas (No contest yet) - FORMING
INSERT INTO Team (team_code, team_name, status, created_at)
VALUES ('TEAM05', 'Data Ninjas', 'FORMING', '2026-06-06 10:00:00');
SET @Team5_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team5_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-06 10:00:00' FROM [User] u WHERE u.email = 'dntotrinh@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team5_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-06 10:00:00' FROM [User] u WHERE u.email = 'phannha@gmail.com';

-- Forming Team 6: DatLe Pioneers (No contest yet) - FORMING
INSERT INTO Team (team_code, team_name, status, created_at)
VALUES ('TEAM06', 'DatLe Pioneers', 'FORMING', '2026-06-06 10:00:00');
SET @Team6_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team6_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-06 10:00:00' FROM [User] u WHERE u.email = '20DH123457@st.huflit.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team6_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-06 10:00:00' FROM [User] u WHERE u.email IN ('20DH123456@st.huflit.edu.vn', 'Leduyphuc@hcmut.edu.vn', '12345678@st.hcmuaf.edu.vn');
GO

-- Assign Mentors to Teams
DECLARE @Mentor1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor1');
DECLARE @Mentor2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor2');
DECLARE @PastTeam1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01');
DECLARE @PastTeam2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02');
DECLARE @PastTeam3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03');
DECLARE @Team1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM01');
DECLARE @Team2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM02');
DECLARE @Team3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM03');
DECLARE @C4_T01_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T01');
DECLARE @C4_T02_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T02');
DECLARE @C4_T03_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T03');
DECLARE @C4_T04_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T04');
DECLARE @C4_T05_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T05');
DECLARE @C4_T06_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T06');
DECLARE @C4_T07_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T07');
DECLARE @C4_T08_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T08');
DECLARE @C4_T09_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T09');
DECLARE @C4_T10_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T10');

INSERT INTO TeamMentor (team_id, user_id, category_id, status) VALUES
(@PastTeam1_ID, @Mentor1_ID, 1, 'ACTIVE'), (@PastTeam2_ID, @Mentor2_ID, 1, 'ACTIVE'), (@PastTeam3_ID, @Mentor1_ID, 4, 'ACTIVE'),
(@Team1_ID, @Mentor1_ID, 1, 'ACTIVE'), (@Team2_ID, @Mentor2_ID, 4, 'ACTIVE'), (@Team3_ID, @Mentor1_ID, 4, 'ACTIVE'),
(@C4_T01_ID, @Mentor1_ID, 10, 'ACTIVE'), (@C4_T02_ID, @Mentor2_ID, 10, 'ACTIVE'), (@C4_T03_ID, @Mentor1_ID, 10, 'ACTIVE'),
(@C4_T04_ID, @Mentor2_ID, 10, 'ACTIVE'), (@C4_T05_ID, @Mentor1_ID, 10, 'ACTIVE'), (@C4_T06_ID, @Mentor2_ID, 10, 'ACTIVE'),
(@C4_T07_ID, @Mentor1_ID, 10, 'ACTIVE'), (@C4_T08_ID, @Mentor2_ID, 10, 'ACTIVE'), (@C4_T09_ID, @Mentor1_ID, 10, 'ACTIVE'),
(@C4_T10_ID, @Mentor2_ID, 10, 'ACTIVE');
GO

-- 9. SUBMISSIONS (Full Submissions across all completed & active rounds)
DECLARE @PastTeam1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01');
DECLARE @PastTeam2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02');
DECLARE @PastTeam3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03');
DECLARE @Team1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM01');
DECLARE @Team2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM02');
DECLARE @Team3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM03');
DECLARE @C4_T01_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T01');
DECLARE @C4_T02_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T02');
DECLARE @C4_T03_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T03');
DECLARE @C4_T04_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T04');
DECLARE @C4_T05_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T05');
DECLARE @C4_T06_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T06');
DECLARE @C4_T07_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T07');
DECLARE @C4_T08_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T08');
DECLARE @C4_T09_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T09');
DECLARE @C4_T10_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T10');
DECLARE @Mentor1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor1');
DECLARE @Mentor2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor2');

INSERT INTO Submission (team_id, round_id, submission_data, version, submitted_at, status, mentor_feedback, mentor_id)
VALUES
-- Contest 1 Submissions (Round 1 & Round 2)
(@PastTeam1_ID, 1, N'{"Project Repository":"https://github.com/aipioneers/smart-ai-qual","Documentation":"https://docs.google.com/aipioneers-qual"}', 1, '2025-02-18 14:00:00', 'GRADED', N'Excellent core idea, well prepared for qualification stage.', @Mentor1_ID),
(@PastTeam1_ID, 2, N'{"Project Repository":"https://github.com/aipioneers/smart-ai-final","Demo Video":"https://youtube.com/watch?v=demo1","Slide":"https://docs.google.com/presentation/d/ai-pioneers"}', 1, '2025-03-10 15:30:00', 'GRADED', N'Outstanding architecture and extremely smooth live presentation!', @Mentor1_ID),
(@PastTeam2_ID, 1, N'{"Project Repository":"https://github.com/visionary/cv-qual","Documentation":"https://docs.google.com/visionary-qual"}', 1, '2025-02-19 10:00:00', 'GRADED', N'Good model design, further improve validation accuracy.', @Mentor2_ID),
(@PastTeam2_ID, 2, N'{"Project Repository":"https://github.com/visionary/cv-final","Demo Video":"https://youtube.com/watch?v=demo2","Slide":"https://docs.google.com/presentation/d/visionary"}', 1, '2025-03-12 11:00:00', 'GRADED', N'Well-rounded computer vision app with solid documentation.', @Mentor2_ID),
(@Team1_ID, 1, N'{"Project Repository":"https://github.com/cybercore/ai-app","Documentation":"https://docs.google.com/document/d/cybercore-doc"}', 1, '2025-02-15 14:00:00', 'GRADED', N'Solid qualification submission, good technical foundation.', @Mentor1_ID),
(@Team1_ID, 2, N'{"Project Repository":"https://github.com/cybercore/ai-app-final","Demo Video":"https://youtube.com/watch?v=demo_cybercore","Slide":"https://docs.google.com/presentation/d/cybercore-final"}', 1, '2025-03-13 10:00:00', 'GRADED', N'Good practical UI and solid backend AI pipeline.', @Mentor1_ID),

-- Contest 2 Submissions (Round 3 & Round 4)
(@PastTeam3_ID, 3, N'{"Project Repository":"https://github.com/blockchainmasters/defi-qual","Smart Contract":"0x71C...893"}', 1, '2025-10-10 16:00:00', 'GRADED', N'Flawless smart contract code with optimal gas usage.', @Mentor1_ID),
(@PastTeam3_ID, 4, N'{"Project Repository":"https://github.com/blockchainmasters/defi-final","Demo Video":"https://youtube.com/watch?v=demo3","DApp URL":"https://defi-masters.app"}', 1, '2025-11-20 09:30:00', 'GRADED', N'Seamless DApp integration and industry-grade Web3 UX!', @Mentor1_ID),
(@Team2_ID, 3, N'{"Project Repository":"https://github.com/coderangers/blockchain-web3","Whitepaper":"https://docs.google.com/document/d/coderangers-whitepaper"}', 1, '2025-09-20 10:00:00', 'GRADED', N'Well-structured smart contracts and clear whitepaper logic.', @Mentor2_ID),
(@Team2_ID, 4, N'{"Project Repository":"https://github.com/coderangers/defi-app-final","Demo Video":"https://youtube.com/watch?v=demo_coderangers","DApp URL":"https://coderangers.dapp"}', 1, '2025-11-22 14:00:00', 'GRADED', N'High security standards and robust decentralized exchange logic.', @Mentor2_ID),
(@Team3_ID, 3, N'{"Project Repository":"https://github.com/bytewizards/defi-dapp","Whitepaper":"https://docs.google.com/document/d/bytewizards-doc"}', 1, '2025-09-21 08:00:00', 'GRADED', N'Great tokenomics proposal and clean Solidity code.', @Mentor1_ID),
(@Team3_ID, 4, N'{"Project Repository":"https://github.com/bytewizards/defi-dapp-final","Demo Video":"https://youtube.com/watch?v=demo_bytewizards","DApp URL":"https://bytewizards-dapp.io"}', 1, '2025-11-23 16:00:00', 'GRADED', N'Good staking pool architecture and smooth wallet connectivity.', @Mentor1_ID),

-- Contest 4 Submissions (Round 8 - Global Championship Round - 10 Teams)
(@C4_T01_ID, 8, N'{"Project Repository":"https://github.com/nexusai/enterprise-cloud","Architecture Diagram":"https://docs.google.com/drawings/nexus-ai","Demo Video":"https://youtube.com/watch?v=nexus_ai_demo"}', 1, '2026-04-10 10:00:00', 'GRADED', N'Exceptional enterprise AI platform with zero-latency cloud scaling.', @Mentor1_ID),
(@C4_T02_ID, 8, N'{"Project Repository":"https://github.com/cloudhorizon/hybrid-mesh","Architecture Diagram":"https://docs.google.com/drawings/cloud-horizon","Demo Video":"https://youtube.com/watch?v=cloud_horizon"}', 1, '2026-04-10 11:30:00', 'GRADED', N'Brilliant cloud reliability engineering and fault tolerance architecture.', @Mentor2_ID),
(@C4_T03_ID, 8, N'{"Project Repository":"https://github.com/quantumleap/neural-ops","Architecture Diagram":"https://docs.google.com/drawings/quantum-leap","Demo Video":"https://youtube.com/watch?v=quantum_leap"}', 1, '2026-04-11 09:00:00', 'GRADED', N'Highly innovative predictive maintenance system for cloud clusters.', @Mentor1_ID),
(@C4_T04_ID, 8, N'{"Project Repository":"https://github.com/cybersynapse/cloud-guard","Architecture Diagram":"https://docs.google.com/drawings/cyber-synapse","Demo Video":"https://youtube.com/watch?v=cyber_synapse"}', 1, '2026-04-11 14:00:00', 'GRADED', N'Very strong security compliance and automated threat mitigation.', @Mentor2_ID),
(@C4_T05_ID, 8, N'{"Project Repository":"https://github.com/vanguard/ai-analytics","Architecture Diagram":"https://docs.google.com/drawings/vanguard-devs","Demo Video":"https://youtube.com/watch?v=vanguard_devs"}', 1, '2026-04-12 10:30:00', 'GRADED', N'Solid big data processing pipeline and clear dashboard visualizer.', @Mentor1_ID),
(@C4_T06_ID, 8, N'{"Project Repository":"https://github.com/apexdynamics/serverless-ai","Architecture Diagram":"https://docs.google.com/drawings/apex-dynamics","Demo Video":"https://youtube.com/watch?v=apex_dynamics"}', 1, '2026-04-12 15:00:00', 'GRADED', N'Good serverless design, optimize cold-start latency further.', @Mentor2_ID),
(@C4_T07_ID, 8, N'{"Project Repository":"https://github.com/bytebuilders/cloud-monitor","Architecture Diagram":"https://docs.google.com/drawings/byte-builders","Demo Video":"https://youtube.com/watch?v=byte_builders"}', 1, '2026-04-13 09:30:00', 'GRADED', N'Reliable monitoring suite, improve UI responsiveness.', @Mentor1_ID),
(@C4_T08_ID, 8, N'{"Project Repository":"https://github.com/sparkmatrix/data-flow","Architecture Diagram":"https://docs.google.com/drawings/spark-matrix","Demo Video":"https://youtube.com/watch?v=spark_matrix"}', 1, '2026-04-13 13:00:00', 'GRADED', N'Clean data ingestion architecture, enhance error handling.', @Mentor2_ID),
(@C4_T09_ID, 8, N'{"Project Repository":"https://github.com/zerolatency/edge-cloud","Architecture Diagram":"https://docs.google.com/drawings/zero-latency","Demo Video":"https://youtube.com/watch?v=zero_latency"}', 1, '2026-04-14 10:00:00', 'GRADED', N'Interesting edge computing concept, documentation could be more detailed.', @Mentor1_ID),
(@C4_T10_ID, 8, N'{"Project Repository":"https://github.com/titancoders/cloud-storage","Architecture Diagram":"https://docs.google.com/drawings/titan-coders","Demo Video":"https://youtube.com/watch?v=titan_coders"}', 1, '2026-04-14 16:00:00', 'GRADED', N'Solid storage utility, continue polishing performance.', @Mentor2_ID);
GO

-- 10. SCORES & SCORE DETAILS (Full Scores for ALL Completed Rounds across Contest 1, 2, and 4)
DECLARE @Judge1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge1');
DECLARE @Judge2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge2');
DECLARE @JudgeMentor_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge_mentor');

-- Get Submissions for Contest 1 Round 1
DECLARE @Sub_AI_R1 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST01') AND round_id = 1);
DECLARE @Sub_Vis_R1 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST02') AND round_id = 1);
DECLARE @Sub_Cyb_R1 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'TEAM01') AND round_id = 1);

-- Get Submissions for Contest 1 Round 2
DECLARE @Sub_AI_R2 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST01') AND round_id = 2);
DECLARE @Sub_Vis_R2 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST02') AND round_id = 2);
DECLARE @Sub_Cyb_R2 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'TEAM01') AND round_id = 2);

-- Get Submissions for Contest 2 Round 3
DECLARE @Sub_Block_R3 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST03') AND round_id = 3);
DECLARE @Sub_Code_R3 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'TEAM02') AND round_id = 3);
DECLARE @Sub_Byte_R3 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'TEAM03') AND round_id = 3);

-- Get Submissions for Contest 2 Round 4
DECLARE @Sub_Block_R4 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST03') AND round_id = 4);
DECLARE @Sub_Code_R4 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'TEAM02') AND round_id = 4);
DECLARE @Sub_Byte_R4 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'TEAM03') AND round_id = 4);

-- Get Submissions for Contest 4 Round 8
DECLARE @Sub_C4_T01 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T01') AND round_id = 8);
DECLARE @Sub_C4_T02 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T02') AND round_id = 8);
DECLARE @Sub_C4_T03 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T03') AND round_id = 8);
DECLARE @Sub_C4_T04 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T04') AND round_id = 8);
DECLARE @Sub_C4_T05 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T05') AND round_id = 8);
DECLARE @Sub_C4_T06 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T06') AND round_id = 8);
DECLARE @Sub_C4_T07 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T07') AND round_id = 8);
DECLARE @Sub_C4_T08 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T08') AND round_id = 8);
DECLARE @Sub_C4_T09 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T09') AND round_id = 8);
DECLARE @Sub_C4_T10 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'C4_T10') AND round_id = 8);

INSERT INTO Score (submission_id, user_id, total_score, general_feedback, status)
VALUES
-- Contest 1 Round 1 Scores (Judges: Judge1, Judge2, JudgeMentor)
(@Sub_AI_R1, @Judge1_ID, 91.50, N'Exceptional AI qualification proposal and architecture.', 'PUBLISHED'),
(@Sub_AI_R1, @Judge2_ID, 90.00, N'Strong architecture, well thought out data models.', 'PUBLISHED'),
(@Sub_AI_R1, @JudgeMentor_ID, 92.00, N'Great practical application of machine learning.', 'PUBLISHED'),
(@Sub_Vis_R1, @Judge1_ID, 87.00, N'Very solid computer vision wireframe and prototype.', 'PUBLISHED'),
(@Sub_Vis_R1, @Judge2_ID, 88.50, N'Solid visual detection pipeline and good performance metrics.', 'PUBLISHED'),
(@Sub_Vis_R1, @JudgeMentor_ID, 86.50, N'Clear wireframe and realistic prototype design.', 'PUBLISHED'),
(@Sub_Cyb_R1, @Judge1_ID, 84.00, N'Clear cybersecurity qualification documentation.', 'PUBLISHED'),
(@Sub_Cyb_R1, @Judge2_ID, 83.50, N'Good technical foundation, clear qualification doc.', 'PUBLISHED'),
(@Sub_Cyb_R1, @JudgeMentor_ID, 85.00, N'Solid threat analysis and mitigation strategies.', 'PUBLISHED'),

-- Contest 1 Round 2 Scores (Judges: Judge1, Judge2, JudgeMentor)
(@Sub_AI_R2, @Judge1_ID, 93.00, N'Outstanding project addressing key societal pain points.', 'PUBLISHED'),
(@Sub_AI_R2, @Judge2_ID, 92.00, N'Algorithm architecture is highly robust and creative.', 'PUBLISHED'),
(@Sub_AI_R2, @JudgeMentor_ID, 93.50, N'Exceptional final delivery and live demo execution.', 'PUBLISHED'),
(@Sub_Vis_R2, @Judge1_ID, 88.00, N'Solid application, commercial readiness can be improved.', 'PUBLISHED'),
(@Sub_Vis_R2, @Judge2_ID, 89.00, N'Clean real-time computer vision processing architecture.', 'PUBLISHED'),
(@Sub_Vis_R2, @JudgeMentor_ID, 87.50, N'Good UI/UX with responsive detection feedback.', 'PUBLISHED'),
(@Sub_Cyb_R2, @Judge1_ID, 85.00, N'Well structured network defense mechanism demo.', 'PUBLISHED'),
(@Sub_Cyb_R2, @Judge2_ID, 84.00, N'Well-executed final presentation and working AI prototype.', 'PUBLISHED'),
(@Sub_Cyb_R2, @JudgeMentor_ID, 84.50, N'Solid prototype, ensure scalability under high load.', 'PUBLISHED'),

-- Contest 2 Round 3 Scores (Judges: Judge1, Judge2, JudgeMentor)
(@Sub_Block_R3, @Judge1_ID, 93.50, N'Brilliant blockchain whitepaper and token design.', 'PUBLISHED'),
(@Sub_Block_R3, @Judge2_ID, 94.50, N'Very clean consensus model and smart contract security.', 'PUBLISHED'),
(@Sub_Block_R3, @JudgeMentor_ID, 94.00, N'Flawless smart contract qualification proposal and whitepaper.', 'PUBLISHED'),
(@Sub_Code_R3, @Judge1_ID, 88.50, N'Good exchange architecture and low latency design.', 'PUBLISHED'),
(@Sub_Code_R3, @Judge2_ID, 89.50, N'Very solid liquidity contract specifications.', 'PUBLISHED'),
(@Sub_Code_R3, @JudgeMentor_ID, 89.00, N'Strong DeFi architecture and clean contract structure.', 'PUBLISHED'),
(@Sub_Byte_R3, @Judge1_ID, 85.50, N'Clear DApp wireframes and solid integration layout.', 'PUBLISHED'),
(@Sub_Byte_R3, @Judge2_ID, 84.50, N'Good wallet connection architecture and staking mechanics.', 'PUBLISHED'),
(@Sub_Byte_R3, @JudgeMentor_ID, 85.00, N'Good DApp concept with realistic tokenomics.', 'PUBLISHED'),

-- Contest 2 Round 4 Scores (Judges: Judge1, Judge2, JudgeMentor)
(@Sub_Block_R4, @Judge1_ID, 94.50, N'Exceptional live smart contract execution and auditing report.', 'PUBLISHED'),
(@Sub_Block_R4, @Judge2_ID, 95.50, N'World-class DeFi protocol with top security practices.', 'PUBLISHED'),
(@Sub_Block_R4, @JudgeMentor_ID, 95.00, N'Comprehensive DeFi solution, maximum security and stellar UI/UX.', 'PUBLISHED'),
(@Sub_Code_R4, @Judge1_ID, 90.00, N'Robust decentralized exchange with high transaction throughput.', 'PUBLISHED'),
(@Sub_Code_R4, @Judge2_ID, 90.50, N'Clean order-book synchronization and fast settlement speed.', 'PUBLISHED'),
(@Sub_Code_R4, @JudgeMentor_ID, 89.50, N'Strong final prototype, very responsive decentralized interface.', 'PUBLISHED'),
(@Sub_Byte_R4, @Judge1_ID, 86.50, N'Great liquidity pool demonstration and clean UX.', 'PUBLISHED'),
(@Sub_Byte_R4, @Judge2_ID, 86.00, N'Clean liquidity staking app with intuitive wallet connectivity.', 'PUBLISHED'),
(@Sub_Byte_R4, @JudgeMentor_ID, 85.50, N'Solid staking reward mechanism and reliable smart contracts.', 'PUBLISHED'),

-- Contest 4 Round 8 Scores (10 Teams Leaderboard - All 3 Judges evaluate every team)
(@Sub_C4_T01, @Judge1_ID, 96.50, N'Masterpiece enterprise architecture, zero-latency scalability, and cutting-edge AI integration.', 'PUBLISHED'),
(@Sub_C4_T01, @Judge2_ID, 96.00, N'Exceptional cloud mesh topology with zero downtime deployment.', 'PUBLISHED'),
(@Sub_C4_T01, @JudgeMentor_ID, 97.00, N'Flawless system design and world-class technical execution.', 'PUBLISHED'),
(@Sub_C4_T02, @Judge1_ID, 94.00, N'Outstanding fault-tolerant hybrid architecture with automated failover.', 'PUBLISHED'),
(@Sub_C4_T02, @Judge2_ID, 94.20, N'World-class cloud reliability engineering, multi-region failover, and immaculate DevOps.', 'PUBLISHED'),
(@Sub_C4_T02, @JudgeMentor_ID, 94.40, N'Highly reliable multi-cloud infrastructure and clean monitoring pipeline.', 'PUBLISHED'),
(@Sub_C4_T03, @Judge1_ID, 91.80, N'Brilliant predictive AI maintenance pipeline with real-time cluster telemetry.', 'PUBLISHED'),
(@Sub_C4_T03, @Judge2_ID, 91.50, N'Strong neural network integration for system anomaly detection.', 'PUBLISHED'),
(@Sub_C4_T03, @JudgeMentor_ID, 92.10, N'Extremely practical enterprise utility with high accuracy prediction models.', 'PUBLISHED'),
(@Sub_C4_T04, @Judge1_ID, 89.00, N'Solid zero-trust cloud security gateway and encryption standards.', 'PUBLISHED'),
(@Sub_C4_T04, @Judge2_ID, 89.50, N'Bank-grade cloud security and automated threat defense mechanisms.', 'PUBLISHED'),
(@Sub_C4_T04, @JudgeMentor_ID, 90.00, N'Comprehensive compliance framework and real-time threat response.', 'PUBLISHED'),
(@Sub_C4_T05, @Judge1_ID, 86.80, N'Great data aggregation engine and fast analytical queries.', 'PUBLISHED'),
(@Sub_C4_T05, @Judge2_ID, 87.20, N'Well-structured data processing pipeline with low latency insights.', 'PUBLISHED'),
(@Sub_C4_T05, @JudgeMentor_ID, 87.00, N'Robust enterprise analytics platform with high data processing speed.', 'PUBLISHED'),
(@Sub_C4_T06, @Judge1_ID, 84.50, N'Solid serverless microservices setup, optimize function cold-start slightly.', 'PUBLISHED'),
(@Sub_C4_T06, @Judge2_ID, 84.80, N'Clean event-driven architecture using serverless cloud functions.', 'PUBLISHED'),
(@Sub_C4_T06, @JudgeMentor_ID, 84.20, N'Good scalability metrics and clean code structure.', 'PUBLISHED'),
(@Sub_C4_T07, @Judge1_ID, 81.80, N'Real-time cloud monitoring tool with insightful visualization graphs.', 'PUBLISHED'),
(@Sub_C4_T07, @Judge2_ID, 82.00, N'Effective cloud infrastructure monitoring suite with good utility.', 'PUBLISHED'),
(@Sub_C4_T07, @JudgeMentor_ID, 82.20, N'Useful resource tracking utility, continue polishing UI layout.', 'PUBLISHED'),
(@Sub_C4_T08, @Judge1_ID, 79.20, N'Streamlined data ingestion flow and reliable buffer management.', 'PUBLISHED'),
(@Sub_C4_T08, @Judge2_ID, 79.80, N'Good data pipeline architecture, improve error logging mechanisms.', 'PUBLISHED'),
(@Sub_C4_T08, @JudgeMentor_ID, 79.50, N'Clean data ingestion system, error recovery can be polished further.', 'PUBLISHED'),
(@Sub_C4_T09, @Judge1_ID, 76.00, N'Promising edge cloud architecture, presentation and docs need more depth.', 'PUBLISHED'),
(@Sub_C4_T09, @Judge2_ID, 76.50, N'Good edge computing concept with low latency data transmission.', 'PUBLISHED'),
(@Sub_C4_T09, @JudgeMentor_ID, 75.50, N'Solid prototype, expand documentation and architectural diagrams.', 'PUBLISHED'),
(@Sub_C4_T10, @Judge1_ID, 72.80, N'Decent cloud storage utility with encrypted file transfer support.', 'PUBLISHED'),
(@Sub_C4_T10, @Judge2_ID, 72.50, N'Functional cloud storage utility, UI and read/write speeds require optimization.', 'PUBLISHED'),
(@Sub_C4_T10, @JudgeMentor_ID, 72.20, N'Good baseline storage app, further enhance throughput and error handling.', 'PUBLISHED');
GO

-- 10.5. SCORE DETAILS (Detailed rubric criteria evaluations precisely matching Score and Rubric criteria)
DECLARE @CR1_D1 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 1) AND criteria_name = 'Innovation & Creativity');
DECLARE @CR1_D2 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 1) AND criteria_name = 'Technical Complexity');
DECLARE @CR1_D3 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 1) AND criteria_name = 'Feasibility & Impact');
DECLARE @CR1_D4 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 1) AND criteria_name = 'Presentation & Demo');

DECLARE @CR2_D1 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 2) AND criteria_name = 'Model Accuracy & Prompt Engineering');
DECLARE @CR2_D2 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 2) AND criteria_name = 'Contextual Understanding & Reasoning');
DECLARE @CR2_D3 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 2) AND criteria_name = 'Real-world Application & Scalability');

DECLARE @CR4_D1 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 4) AND criteria_name = 'Smart Contract Security');
DECLARE @CR4_D2 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 4) AND criteria_name = 'Decentralization & Utility');
DECLARE @CR4_D3 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 4) AND criteria_name = 'UI/UX & Web3 Integration');

DECLARE @CR5_D1 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 5) AND criteria_name = 'Tokenomics Sustainability & Mathematical Rigor');
DECLARE @CR5_D2 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 5) AND criteria_name = 'Liquidity & Yield Protocol Design');
DECLARE @CR5_D3 BIGINT = (SELECT TOP 1 contest_rubric_detail_id FROM ContestRubricDetails WHERE contest_rubric_id = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 5) AND criteria_name = 'Regulatory Compliance & Risk Management');

DECLARE @Sub_AI_R1 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01') AND round_id = 1);
DECLARE @Sub_Vis_R1 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02') AND round_id = 1);
DECLARE @Sub_Cyb_R1 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM01') AND round_id = 1);

DECLARE @Sub_AI_R2 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01') AND round_id = 2);
DECLARE @Sub_Vis_R2 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02') AND round_id = 2);
DECLARE @Sub_Cyb_R2 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM01') AND round_id = 2);

DECLARE @Sub_Block_R3 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03') AND round_id = 3);
DECLARE @Sub_Code_R3 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM02') AND round_id = 3);
DECLARE @Sub_Byte_R3 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM03') AND round_id = 3);

DECLARE @Sub_Block_R4 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03') AND round_id = 4);
DECLARE @Sub_Code_R4 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM02') AND round_id = 4);
DECLARE @Sub_Byte_R4 BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM03') AND round_id = 4);

DECLARE @Judge1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge1');
DECLARE @Judge2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge2');
DECLARE @JudgeMentor_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge_mentor');

DECLARE @S_C1_R1_AI_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_AI_R1 AND user_id = @Judge1_ID);
DECLARE @S_C1_R1_AI_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_AI_R1 AND user_id = @Judge2_ID);
DECLARE @S_C1_R1_AI_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_AI_R1 AND user_id = @JudgeMentor_ID);
DECLARE @S_C1_R1_Vis_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Vis_R1 AND user_id = @Judge1_ID);
DECLARE @S_C1_R1_Vis_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Vis_R1 AND user_id = @Judge2_ID);
DECLARE @S_C1_R1_Vis_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Vis_R1 AND user_id = @JudgeMentor_ID);
DECLARE @S_C1_R1_Cyb_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Cyb_R1 AND user_id = @Judge1_ID);
DECLARE @S_C1_R1_Cyb_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Cyb_R1 AND user_id = @Judge2_ID);
DECLARE @S_C1_R1_Cyb_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Cyb_R1 AND user_id = @JudgeMentor_ID);

DECLARE @S_C1_R2_AI_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_AI_R2 AND user_id = @Judge1_ID);
DECLARE @S_C1_R2_AI_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_AI_R2 AND user_id = @Judge2_ID);
DECLARE @S_C1_R2_AI_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_AI_R2 AND user_id = @JudgeMentor_ID);
DECLARE @S_C1_R2_Vis_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Vis_R2 AND user_id = @Judge1_ID);
DECLARE @S_C1_R2_Vis_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Vis_R2 AND user_id = @Judge2_ID);
DECLARE @S_C1_R2_Vis_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Vis_R2 AND user_id = @JudgeMentor_ID);
DECLARE @S_C1_R2_Cyb_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Cyb_R2 AND user_id = @Judge1_ID);
DECLARE @S_C1_R2_Cyb_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Cyb_R2 AND user_id = @Judge2_ID);
DECLARE @S_C1_R2_Cyb_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Cyb_R2 AND user_id = @JudgeMentor_ID);

DECLARE @S_C2_R3_Blk_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Block_R3 AND user_id = @Judge1_ID);
DECLARE @S_C2_R3_Blk_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Block_R3 AND user_id = @Judge2_ID);
DECLARE @S_C2_R3_Blk_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Block_R3 AND user_id = @JudgeMentor_ID);
DECLARE @S_C2_R3_Cod_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Code_R3 AND user_id = @Judge1_ID);
DECLARE @S_C2_R3_Cod_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Code_R3 AND user_id = @Judge2_ID);
DECLARE @S_C2_R3_Cod_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Code_R3 AND user_id = @JudgeMentor_ID);
DECLARE @S_C2_R3_Byt_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Byte_R3 AND user_id = @Judge1_ID);
DECLARE @S_C2_R3_Byt_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Byte_R3 AND user_id = @Judge2_ID);
DECLARE @S_C2_R3_Byt_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Byte_R3 AND user_id = @JudgeMentor_ID);

DECLARE @S_C2_R4_Blk_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Block_R4 AND user_id = @Judge1_ID);
DECLARE @S_C2_R4_Blk_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Block_R4 AND user_id = @Judge2_ID);
DECLARE @S_C2_R4_Blk_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Block_R4 AND user_id = @JudgeMentor_ID);
DECLARE @S_C2_R4_Cod_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Code_R4 AND user_id = @Judge1_ID);
DECLARE @S_C2_R4_Cod_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Code_R4 AND user_id = @Judge2_ID);
DECLARE @S_C2_R4_Cod_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Code_R4 AND user_id = @JudgeMentor_ID);
DECLARE @S_C2_R4_Byt_J1 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Byte_R4 AND user_id = @Judge1_ID);
DECLARE @S_C2_R4_Byt_J2 BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Byte_R4 AND user_id = @Judge2_ID);
DECLARE @S_C2_R4_Byt_JM BIGINT = (SELECT TOP 1 score_id FROM Score WHERE submission_id = @Sub_Byte_R4 AND user_id = @JudgeMentor_ID);

INSERT INTO ScoreDetail (score_id, contest_rubric_detail_id, raw_score, weighted_score, feedback)
VALUES
-- Contest 1 Round 1 Scores details
(@S_C1_R1_AI_J1, @CR1_D1, 27.50, 27.50, N'Exceptional AI innovation'),
(@S_C1_R1_AI_J1, @CR1_D2, 27.50, 27.50, N'Sophisticated model depth'),
(@S_C1_R1_AI_J1, @CR1_D3, 18.50, 18.50, N'Highly viable in real world'),
(@S_C1_R1_AI_J1, @CR1_D4, 18.00, 18.00, N'Smooth presentation structure'),

(@S_C1_R1_AI_J2, @CR1_D1, 27.00, 27.00, N'Great novelty in approach'),
(@S_C1_R1_AI_J2, @CR1_D2, 27.00, 27.00, N'Clean algorithmic pipeline'),
(@S_C1_R1_AI_J2, @CR1_D3, 18.00, 18.00, N'Clear social impact'),
(@S_C1_R1_AI_J2, @CR1_D4, 18.00, 18.00, N'Well explained architecture'),

(@S_C1_R1_AI_JM, @CR1_D1, 28.00, 28.00, N'Top tier AI creativity'),
(@S_C1_R1_AI_JM, @CR1_D2, 28.00, 28.00, N'Excellent technical execution'),
(@S_C1_R1_AI_JM, @CR1_D3, 18.00, 18.00, N'Strong feasibility metrics'),
(@S_C1_R1_AI_JM, @CR1_D4, 18.00, 18.00, N'Engaging live demonstration'),

(@S_C1_R1_Vis_J1, @CR1_D1, 26.00, 26.00, N'Solid vision wireframe'),
(@S_C1_R1_Vis_J1, @CR1_D2, 26.00, 26.00, N'Reliable detection pipeline'),
(@S_C1_R1_Vis_J1, @CR1_D3, 17.50, 17.50, N'Practical industry usage'),
(@S_C1_R1_Vis_J1, @CR1_D4, 17.50, 17.50, N'Clear prototype layout'),

(@S_C1_R1_Vis_J2, @CR1_D1, 26.50, 26.50, N'Creative visual recognition'),
(@S_C1_R1_Vis_J2, @CR1_D2, 26.50, 26.50, N'High frame rate accuracy'),
(@S_C1_R1_Vis_J2, @CR1_D3, 18.00, 18.00, N'Strong market potential'),
(@S_C1_R1_Vis_J2, @CR1_D4, 17.50, 17.50, N'Well structured slides'),

(@S_C1_R1_Vis_JM, @CR1_D1, 26.00, 26.00, N'Good vision concept'),
(@S_C1_R1_Vis_JM, @CR1_D2, 26.00, 26.00, N'Consistent detection output'),
(@S_C1_R1_Vis_JM, @CR1_D3, 17.50, 17.50, N'Realistic deployment model'),
(@S_C1_R1_Vis_JM, @CR1_D4, 17.00, 17.00, N'Decent presentation workflow'),

(@S_C1_R1_Cyb_J1, @CR1_D1, 25.00, 25.00, N'Clear threat analysis'),
(@S_C1_R1_Cyb_J1, @CR1_D2, 25.00, 25.00, N'Solid encryption layout'),
(@S_C1_R1_Cyb_J1, @CR1_D3, 17.00, 17.00, N'Practical network protection'),
(@S_C1_R1_Cyb_J1, @CR1_D4, 17.00, 17.00, N'Good qualification document'),

(@S_C1_R1_Cyb_J2, @CR1_D1, 25.00, 25.00, N'Logical security approach'),
(@S_C1_R1_Cyb_J2, @CR1_D2, 25.00, 25.00, N'Well structured defense rules'),
(@S_C1_R1_Cyb_J2, @CR1_D3, 17.00, 17.00, N'Good utility value'),
(@S_C1_R1_Cyb_J2, @CR1_D4, 16.50, 16.50, N'Clear technical diagrams'),

(@S_C1_R1_Cyb_JM, @CR1_D1, 25.50, 25.50, N'Good security innovation'),
(@S_C1_R1_Cyb_JM, @CR1_D2, 25.50, 25.50, N'Clean threat model design'),
(@S_C1_R1_Cyb_JM, @CR1_D3, 17.00, 17.00, N'High practical application'),
(@S_C1_R1_Cyb_JM, @CR1_D4, 17.00, 17.00, N'Solid presentation defense'),

-- Contest 1 Round 2 Scores details
(@S_C1_R2_AI_J1, @CR2_D1, 32.50, 32.50, N'Outstanding NLP accuracy'),
(@S_C1_R2_AI_J1, @CR2_D2, 32.50, 32.50, N'Exceptional reasoning depth'),
(@S_C1_R2_AI_J1, @CR2_D3, 28.00, 28.00, N'Highly scalable enterprise solution'),

(@S_C1_R2_AI_J2, @CR2_D1, 32.00, 32.00, N'Very high model precision'),
(@S_C1_R2_AI_J2, @CR2_D2, 32.00, 32.00, N'Robust logical inference capabilities'),
(@S_C1_R2_AI_J2, @CR2_D3, 28.00, 28.00, N'Excellent production readiness'),

(@S_C1_R2_AI_JM, @CR2_D1, 33.00, 33.00, N'Superb prompt architecture'),
(@S_C1_R2_AI_JM, @CR2_D2, 32.50, 32.50, N'Deep contextual understanding'),
(@S_C1_R2_AI_JM, @CR2_D3, 28.00, 28.00, N'Seamless real-world application'),

(@S_C1_R2_Vis_J1, @CR2_D1, 31.00, 31.00, N'Clean processing pipeline'),
(@S_C1_R2_Vis_J1, @CR2_D2, 31.00, 31.00, N'Good feature recognition speed'),
(@S_C1_R2_Vis_J1, @CR2_D3, 26.00, 26.00, N'Solid application deployment'),

(@S_C1_R2_Vis_J2, @CR2_D1, 31.50, 31.50, N'Reliable real-time accuracy'),
(@S_C1_R2_Vis_J2, @CR2_D2, 31.00, 31.00, N'Smooth model tracking'),
(@S_C1_R2_Vis_J2, @CR2_D3, 26.50, 26.50, N'Good commercial potential'),

(@S_C1_R2_Vis_JM, @CR2_D1, 30.50, 30.50, N'Stable detection performance'),
(@S_C1_R2_Vis_JM, @CR2_D2, 31.00, 31.00, N'Good contextual filtering'),
(@S_C1_R2_Vis_JM, @CR2_D3, 26.00, 26.00, N'Responsive UI/UX integration'),

(@S_C1_R2_Cyb_J1, @CR2_D1, 30.00, 30.00, N'Well structured network defense'),
(@S_C1_R2_Cyb_J1, @CR2_D2, 30.00, 30.00, N'Accurate threat classification'),
(@S_C1_R2_Cyb_J1, @CR2_D3, 25.00, 25.00, N'Good system protection demo'),

(@S_C1_R2_Cyb_J2, @CR2_D1, 29.50, 29.50, N'Clean defense mechanism'),
(@S_C1_R2_Cyb_J2, @CR2_D2, 29.50, 29.50, N'Good anomaly recognition'),
(@S_C1_R2_Cyb_J2, @CR2_D3, 25.00, 25.00, N'Solid working AI prototype'),

(@S_C1_R2_Cyb_JM, @CR2_D1, 29.50, 29.50, N'Reliable prototype design'),
(@S_C1_R2_Cyb_JM, @CR2_D2, 30.00, 30.00, N'Good logic verification'),
(@S_C1_R2_Cyb_JM, @CR2_D3, 25.00, 25.00, N'Satisfactory system scalability'),

-- Contest 2 Round 3 Scores details
(@S_C2_R3_Blk_J1, @CR4_D1, 33.00, 33.00, N'Optimal smart contract security'),
(@S_C2_R3_Blk_J1, @CR4_D2, 32.50, 32.50, N'High degree of decentralization'),
(@S_C2_R3_Blk_J1, @CR4_D3, 28.00, 28.00, N'Intuitive wallet interaction'),

(@S_C2_R3_Blk_J2, @CR4_D1, 33.00, 33.00, N'Rigorous vulnerability auditing'),
(@S_C2_R3_Blk_J2, @CR4_D2, 33.00, 33.00, N'Very clean consensus layout'),
(@S_C2_R3_Blk_J2, @CR4_D3, 28.50, 28.50, N'Smooth Web3 UX integration'),

(@S_C2_R3_Blk_JM, @CR4_D1, 33.00, 33.00, N'Flawless contract whitepaper'),
(@S_C2_R3_Blk_JM, @CR4_D2, 33.00, 33.00, N'Excellent decentralized utility'),
(@S_C2_R3_Blk_JM, @CR4_D3, 28.00, 28.00, N'Seamless DApp navigation'),

(@S_C2_R3_Cod_J1, @CR4_D1, 31.00, 31.00, N'Good exchange architecture'),
(@S_C2_R3_Cod_J1, @CR4_D2, 31.00, 31.00, N'Low latency decentralized flow'),
(@S_C2_R3_Cod_J1, @CR4_D3, 26.50, 26.50, N'Clean trading interface'),

(@S_C2_R3_Cod_J2, @CR4_D1, 31.50, 31.50, N'Very solid liquidity specifications'),
(@S_C2_R3_Cod_J2, @CR4_D2, 31.50, 31.50, N'Reliable decentralized model'),
(@S_C2_R3_Cod_J2, @CR4_D3, 26.50, 26.50, N'Good user experience design'),

(@S_C2_R3_Cod_JM, @CR4_D1, 31.00, 31.00, N'Strong DeFi security practices'),
(@S_C2_R3_Cod_JM, @CR4_D2, 31.50, 31.50, N'Clean smart contract structure'),
(@S_C2_R3_Cod_JM, @CR4_D3, 26.50, 26.50, N'Responsive wallet interaction'),

(@S_C2_R3_Byt_J1, @CR4_D1, 30.00, 30.00, N'Clear DApp security layout'),
(@S_C2_R3_Byt_J1, @CR4_D2, 30.00, 30.00, N'Solid decentralized integration'),
(@S_C2_R3_Byt_J1, @CR4_D3, 25.50, 25.50, N'Clean wireframe structure'),

(@S_C2_R3_Byt_J2, @CR4_D1, 29.50, 29.50, N'Good staking security logic'),
(@S_C2_R3_Byt_J2, @CR4_D2, 30.00, 30.00, N'Well thought out utility model'),
(@S_C2_R3_Byt_J2, @CR4_D3, 25.00, 25.00, N'Smooth wallet connection'),

(@S_C2_R3_Byt_JM, @CR4_D1, 30.00, 30.00, N'Reliable tokenomics proposal'),
(@S_C2_R3_Byt_JM, @CR4_D2, 30.00, 30.00, N'Good decentralized concept'),
(@S_C2_R3_Byt_JM, @CR4_D3, 25.00, 25.00, N'Intuitive user interface'),

-- Contest 2 Round 4 Scores details
(@S_C2_R4_Blk_J1, @CR5_D1, 33.00, 33.00, N'Exceptional mathematical rigor'),
(@S_C2_R4_Blk_J1, @CR5_D2, 33.00, 33.00, N'World-class yield protocol design'),
(@S_C2_R4_Blk_J1, @CR5_D3, 28.50, 28.50, N'Stellar regulatory compliance'),

(@S_C2_R4_Blk_J2, @CR5_D1, 33.50, 33.50, N'Flawless tokenomics modeling'),
(@S_C2_R4_Blk_J2, @CR5_D2, 33.50, 33.50, N'Optimal capital allocation'),
(@S_C2_R4_Blk_J2, @CR5_D3, 28.50, 28.50, N'Top tier security auditing'),

(@S_C2_R4_Blk_JM, @CR5_D1, 33.00, 33.00, N'Sustainable economic viability'),
(@S_C2_R4_Blk_JM, @CR5_D2, 33.50, 33.50, N'Highly efficient market mechanics'),
(@S_C2_R4_Blk_JM, @CR5_D3, 28.50, 28.50, N'Maximum risk mitigation'),

(@S_C2_R4_Cod_J1, @CR5_D1, 31.50, 31.50, N'Robust DEX tokenomics'),
(@S_C2_R4_Cod_J1, @CR5_D2, 31.50, 31.50, N'High transaction throughput design'),
(@S_C2_R4_Cod_J1, @CR5_D3, 27.00, 27.00, N'Solid compliance management'),

(@S_C2_R4_Cod_J2, @CR5_D1, 31.50, 31.50, N'Clean order-book synchronization'),
(@S_C2_R4_Cod_J2, @CR5_D2, 32.00, 32.00, N'Fast settlement liquidity pool'),
(@S_C2_R4_Cod_J2, @CR5_D3, 27.00, 27.00, N'Reliable systemic risk control'),

(@S_C2_R4_Cod_JM, @CR5_D1, 31.50, 31.50, N'Well balanced economic structure'),
(@S_C2_R4_Cod_JM, @CR5_D2, 31.50, 31.50, N'Strong liquidity protocol'),
(@S_C2_R4_Cod_JM, @CR5_D3, 26.50, 26.50, N'Good security risk standards'),

(@S_C2_R4_Byt_J1, @CR5_D1, 30.50, 30.50, N'Great liquidity staking formula'),
(@S_C2_R4_Byt_J1, @CR5_D2, 30.50, 30.50, N'Clean reward distribution design'),
(@S_C2_R4_Byt_J1, @CR5_D3, 25.50, 25.50, N'Satisfactory compliance checks'),

(@S_C2_R4_Byt_J2, @CR5_D1, 30.00, 30.00, N'Reliable staking mathematics'),
(@S_C2_R4_Byt_J2, @CR5_D2, 30.50, 30.50, N'Good yield pool efficiency'),
(@S_C2_R4_Byt_J2, @CR5_D3, 25.50, 25.50, N'Solid risk monitoring rules'),

(@S_C2_R4_Byt_JM, @CR5_D1, 30.00, 30.00, N'Consistent token reward model'),
(@S_C2_R4_Byt_JM, @CR5_D2, 30.00, 30.00, N'Solid automated market mechanism'),
(@S_C2_R4_Byt_JM, @CR5_D3, 25.50, 25.50, N'Good baseline risk management');
GO

-- 11. RANKING RESULTS (Complete Leaderboards for ALL Completed Rounds & 10-Team Championship)
DECLARE @PastTeam1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01');
DECLARE @PastTeam2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02');
DECLARE @PastTeam3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03');
DECLARE @Team1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM01');
DECLARE @Team2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM02');
DECLARE @Team3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM03');
DECLARE @C4_T01_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T01');
DECLARE @C4_T02_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T02');
DECLARE @C4_T03_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T03');
DECLARE @C4_T04_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T04');
DECLARE @C4_T05_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T05');
DECLARE @C4_T06_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T06');
DECLARE @C4_T07_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T07');
DECLARE @C4_T08_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T08');
DECLARE @C4_T09_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T09');
DECLARE @C4_T10_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'C4_T10');
DECLARE @Admin1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'admin1');

INSERT INTO RankingResult (round_id, category_id, team_id, user_id, rank_no, final_score, qualification_status, date_published_at)
VALUES
-- Contest 1 Round 1 (Qualification) Ranking
(1, 1, @PastTeam1_ID, @Admin1_ID, 1, 91.50, 'QUALIFIED', '2025-02-24 10:00:00'),
(1, 1, @PastTeam2_ID, @Admin1_ID, 2, 87.00, 'QUALIFIED', '2025-02-24 10:00:00'),
(1, 1, @Team1_ID, @Admin1_ID, 3, 83.50, 'QUALIFIED', '2025-02-24 10:00:00'),

-- Contest 1 Round 2 (Semifinal Round) Ranking
(2, 2, @PastTeam1_ID, @Admin1_ID, 1, 92.50, 'QUALIFIED', '2025-03-19 10:00:00'),
(2, 2, @PastTeam2_ID, @Admin1_ID, 2, 88.00, 'ELIMINATED', '2025-03-19 10:00:00'),
(2, 2, @Team1_ID, @Admin1_ID, 3, 84.00, 'ELIMINATED', '2025-03-19 10:00:00'),

-- Contest 1 Round 9 (Final Presentation) Ranking
(9, 3, @PastTeam1_ID, @Admin1_ID, 1, 94.00, 'QUALIFIED', '2025-03-29 10:00:00'),
(9, 3, @PastTeam2_ID, @Admin1_ID, 2, 89.50, 'ELIMINATED', '2025-03-29 10:00:00'),
(9, 3, @Team1_ID, @Admin1_ID, 3, 85.00, 'ELIMINATED', '2025-03-29 10:00:00'),

-- Contest 2 Round 3 (Qualification) Ranking
(3, 4, @PastTeam3_ID, @Admin1_ID, 1, 94.00, 'QUALIFIED', '2025-10-21 10:00:00'),
(3, 4, @Team2_ID, @Admin1_ID, 2, 89.00, 'QUALIFIED', '2025-10-21 10:00:00'),
(3, 4, @Team3_ID, @Admin1_ID, 3, 85.00, 'QUALIFIED', '2025-10-21 10:00:00'),

-- Contest 2 Round 4 (Semifinal Round) Ranking
(4, 5, @PastTeam3_ID, @Admin1_ID, 1, 95.00, 'QUALIFIED', '2025-11-30 10:00:00'),
(4, 5, @Team2_ID, @Admin1_ID, 2, 90.00, 'ELIMINATED', '2025-11-30 10:00:00'),
(4, 5, @Team3_ID, @Admin1_ID, 3, 86.00, 'ELIMINATED', '2025-11-30 10:00:00'),

-- Contest 2 Round 10 (Final Presentation) Ranking
(10, 6, @PastTeam3_ID, @Admin1_ID, 1, 96.00, 'QUALIFIED', '2025-11-28 10:00:00'),
(10, 6, @Team2_ID, @Admin1_ID, 2, 91.00, 'ELIMINATED', '2025-11-28 10:00:00'),
(10, 6, @Team3_ID, @Admin1_ID, 3, 87.00, 'ELIMINATED', '2025-11-28 10:00:00'),

-- Contest 4 Round 8 (Global Championship Round - 10-Team Leaderboard)
(8, 10, @C4_T01_ID, @Admin1_ID, 1, 96.50, 'QUALIFIED', '2026-04-25 10:00:00'),
(8, 10, @C4_T02_ID, @Admin1_ID, 2, 94.20, 'QUALIFIED', '2026-04-25 10:00:00'),
(8, 10, @C4_T03_ID, @Admin1_ID, 3, 91.80, 'QUALIFIED', '2026-04-25 10:00:00'),
(8, 10, @C4_T04_ID, @Admin1_ID, 4, 89.50, 'QUALIFIED', '2026-04-25 10:00:00'),
(8, 10, @C4_T05_ID, @Admin1_ID, 5, 87.00, 'QUALIFIED', '2026-04-25 10:00:00'),
(8, 10, @C4_T06_ID, @Admin1_ID, 6, 84.50, 'ELIMINATED', '2026-04-25 10:00:00'),
(8, 10, @C4_T07_ID, @Admin1_ID, 7, 82.00, 'ELIMINATED', '2026-04-25 10:00:00'),
(8, 10, @C4_T08_ID, @Admin1_ID, 8, 79.50, 'ELIMINATED', '2026-04-25 10:00:00'),
(8, 10, @C4_T09_ID, @Admin1_ID, 9, 76.00, 'ELIMINATED', '2026-04-25 10:00:00'),
(8, 10, @C4_T10_ID, @Admin1_ID, 10, 72.50, 'ELIMINATED', '2026-04-25 10:00:00');
GO

-- Normalize any DRAFT rubric status to TEMPLATE
UPDATE RubricTemplate SET status = 'TEMPLATE' WHERE status = 'DRAFT' OR status = 'draft';
UPDATE ContestRubric SET status = 'TEMPLATE' WHERE status = 'DRAFT' OR status = 'draft';
UPDATE AuditLog SET old_value = 'TEMPLATE' WHERE (old_value = 'DRAFT' OR old_value = 'draft') AND entity_name LIKE '%Rubric%';
UPDATE AuditLog SET new_value = 'TEMPLATE' WHERE (new_value = 'DRAFT' OR new_value = 'draft') AND entity_name LIKE '%Rubric%';
GO

