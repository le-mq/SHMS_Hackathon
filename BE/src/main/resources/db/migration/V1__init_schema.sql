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
                                status VARCHAR(50) NULL,
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
                               status VARCHAR(50) NULL,
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
(N'Đại học Ngoại ngữ - Tin học TP.HCM','HUFLIT','^[0-9]{2}[A-Z]{2}[0-9]{6}$','^[0-9]{2}[A-Z]{2}[0-9]{6}@st.huflit.edu.vn$','ACTIVE');
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

-- 0. SEMESTERS (3 Distinct Semesters for 3 Contests - No overlap!)
INSERT INTO Semester (term, [year], semester_code)
VALUES
('Spring', 2025, 'SP25'),
('Fall', 2025, 'FA25'),
('Summer', 2026, 'SU26');
GO

-- 1. CONTESTS (Each Contest in a DIFFERENT Semester!)
INSERT INTO Contest (semester_id, contest_name, theme, max_teams, min_team_members, max_team_members, status, registration_start, registration_end, contest_end_at)
VALUES
(1, 'National AI Challenge 2025', 'Artificial Intelligence', 100, 3, 6, 'CLOSED', '2025-02-01', '2025-02-10', '2025-03-30 23:59:59'),
(2, 'Global Blockchain Summit 2025', 'Blockchain & Web3', 80, 3, 6, 'CLOSED', '2025-09-01', '2025-09-15', '2025-11-30 23:59:59'),
(3, 'SEAL Hackathon 2026', 'Software Engineering & AI Leadership', 150, 3, 5, 'ACTIVED', '2026-06-01', '2026-08-30', '2026-09-30 23:59:59');
GO

-- 2. CATEGORIES
INSERT INTO Category (contest_id, category_name, description, status)
VALUES
    (1, 'Computer Vision', N'Nhận diện hình ảnh và Thị giác máy tính', 'ACTIVE'),
    (1, 'NLP & LLMs', N'Xử lý ngôn ngữ tự nhiên và Mô hình ngôn ngữ lớn', 'ACTIVE'),
    (1, 'Data Science & Predictive AI', N'Khoa học Dữ liệu và AI dự đoán', 'ACTIVE'),
    (2, 'Smart Contracts & Security', N'Lập trình Hợp đồng thông minh và Bảo mật Web3', 'ACTIVE'),
    (2, 'DeFi & Tokenomics', N'Tài chính phi tập trung và Mô hình kinh tế token', 'ACTIVE'),
    (2, 'Web3 DApps', N'Phát triển Ứng dụng phi tập trung Web3', 'ACTIVE'),
    (3, 'AI & Web3 Innovation', N'Sáng tạo ứng dụng kết hợp AI và Blockchain', 'ACTIVE'),
    (3, 'Cloud & Big Data Architecture', N'Kiến trúc Cloud và Xử lý Dữ liệu lớn', 'ACTIVE'),
    (3, 'Mobile & IoT Applications', N'Ứng dụng Di động thông minh và IoT', 'ACTIVE');
GO

-- 3. CONTEST UNIVERSITIES
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 1, university_id FROM University WHERE university_code IN ('HUFLIT', 'HCMUAF', 'FPT');
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 2, university_id FROM University;
INSERT INTO ContestUniversity (contest_id, university_id)
SELECT 3, university_id FROM University;
GO

-- 4. ANNOUNCEMENTS
DECLARE @Admin1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'admin1');
INSERT INTO Announcement (contest_id, user_id, title, content, announcement_type, status, published_at, target_roles)
VALUES
(1, @Admin1_ID, N'Công bố kết quả chung cuộc National AI Challenge 2025', N'Chúc mừng các đội thi AI Pioneers và Visionary Devs đã xuất sắc giành giải cao nhất!', 'GENERAL', 'PUBLISHED', '2026-03-31 09:00:00', 'STUDENT,MENTOR,JUDGE'),
(2, @Admin1_ID, N'Tổng kết Global Blockchain Summit 2025', N'Đội thi Blockchain Masters đã giành giải Nhất với giải pháp DeFi đột phá.', 'GENERAL', 'PUBLISHED', '2025-12-01 09:00:00', 'STUDENT,MENTOR,JUDGE'),
(3, @Admin1_ID, N'Chào mừng đến với SEAL Hackathon 2026', N'Cổng đăng ký thi đấu chính thức mở từ ngày 01/06/2026. Các đội thi vui lòng hoàn thiện đội hình!', 'REGULATION', 'PUBLISHED', '2026-06-01 08:00:00', 'STUDENT,MENTOR,JUDGE');
GO

-- 5. RUBRICS & CRITERIA
INSERT INTO RubricTemplate (category_id, template_name, description, status)
VALUES
(1, 'Standard AI Judging Rubric', N'Tiêu chí chấm thi chuẩn cho các dự án AI', 'ACTIVE'),
(4, 'Web3 & Blockchain Rubric', N'Tiêu chí chấm thi chuẩn cho các dự án Blockchain', 'ACTIVE'),
(7, 'SEAL Innovation Rubric 2026', N'Tiêu chí chấm thi toàn diện cho SEAL Hackathon', 'ACTIVE');
GO

DECLARE @Rubric1_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE template_name = 'Standard AI Judging Rubric');
DECLARE @Rubric2_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE template_name = 'Web3 & Blockchain Rubric');
DECLARE @Rubric3_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE template_name = 'SEAL Innovation Rubric 2026');

INSERT INTO RubricTemplateCriteria (rubric_template_id, criteria_name, description, default_weight, max_score)
VALUES
(@Rubric1_ID, 'Innovation & Creativity', N'Tính sáng tạo và độc đáo của giải pháp AI', 30.00, 30.00),
(@Rubric1_ID, 'Technical Complexity', N'Độ khó kỹ thuật và mô hình AI sử dụng', 30.00, 30.00),
(@Rubric1_ID, 'Feasibility & Impact', N'Tính khả thi và tác động thực tế tới xã hội', 20.00, 20.00),
(@Rubric1_ID, 'Presentation & Demo', N'Chất lượng thuyết trình và Demo sản phẩm', 20.00, 20.00),

(@Rubric2_ID, 'Smart Contract Security', N'Bảo mật tối ưu của Hợp đồng thông minh', 35.00, 35.00),
(@Rubric2_ID, 'Decentralization & Utility', N'Tính phi tập trung và ứng dụng thực tế', 35.00, 35.00),
(@Rubric2_ID, 'UI/UX & Web3 Integration', N'Trải nghiệm người dùng và kết nối ví Web3', 30.00, 30.00),

(@Rubric3_ID, 'Problem Solving & Innovation', N'Đột phá trong tư duy giải quyết vấn đề', 30.00, 30.00),
(@Rubric3_ID, 'Engineering Excellence', N'Chất lượng kiến trúc và mã nguồn phần mềm', 30.00, 30.00),
(@Rubric3_ID, 'Business Feasibility', N'Tiềm năng thương mại hóa và mở rộng', 20.00, 20.00),
(@Rubric3_ID, 'Live Demo & Q&A', N'Thuyết trình thực tế và trả lời phản biện', 20.00, 20.00);
GO

-- Create ContestRubric and ContestRubricDetails for Contest 1 (Cat 1), Contest 2 (Cat 4), Contest 3 (Cat 7)
DECLARE @Rubric1_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE template_name = 'Standard AI Judging Rubric');
DECLARE @Rubric2_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE template_name = 'Web3 & Blockchain Rubric');
DECLARE @Rubric3_ID BIGINT = (SELECT TOP 1 rubric_template_id FROM RubricTemplate WHERE template_name = 'SEAL Innovation Rubric 2026');

INSERT INTO ContestRubric (rubric_template_id, category_id, rubric_name, total_weight, status)
VALUES
(@Rubric1_ID, 1, 'Computer Vision Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric2_ID, 4, 'Smart Contracts Judging Rubric', 100.00, 'ACTIVE'),
(@Rubric3_ID, 7, 'SEAL AI & Web3 Judging Rubric', 100.00, 'ACTIVE');
GO

DECLARE @CR1_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 1);
DECLARE @CR2_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 4);
DECLARE @CR3_ID BIGINT = (SELECT TOP 1 contest_rubric_id FROM ContestRubric WHERE category_id = 7);

INSERT INTO ContestRubricDetails (contest_rubric_id, criteria_name, description, [weight], max_score)
VALUES
(@CR1_ID, 'Innovation & Creativity', N'Tính sáng tạo và độc đáo của giải pháp AI', 30.00, 30.00),
(@CR1_ID, 'Technical Complexity', N'Độ khó kỹ thuật và mô hình AI sử dụng', 30.00, 30.00),
(@CR1_ID, 'Feasibility & Impact', N'Tính khả thi và tác động thực tế tới xã hội', 20.00, 20.00),
(@CR1_ID, 'Presentation & Demo', N'Chất lượng thuyết trình và Demo sản phẩm', 20.00, 20.00),

(@CR2_ID, 'Smart Contract Security', N'Bảo mật tối ưu của Hợp đồng thông minh', 35.00, 35.00),
(@CR2_ID, 'Decentralization & Utility', N'Tính phi tập trung và ứng dụng thực tế', 35.00, 35.00),
(@CR2_ID, 'UI/UX & Web3 Integration', N'Trải nghiệm người dùng và kết nối ví Web3', 30.00, 30.00),

(@CR3_ID, 'Problem Solving & Innovation', N'Đột phá trong tư duy giải quyết vấn đề', 30.00, 30.00),
(@CR3_ID, 'Engineering Excellence', N'Chất lượng kiến trúc và mã nguồn phần mềm', 30.00, 30.00),
(@CR3_ID, 'Business Feasibility', N'Tiềm năng thương mại hóa và mở rộng', 20.00, 20.00),
(@CR3_ID, 'Live Demo & Q&A', N'Thuyết trình thực tế và trả lời phản biện', 20.00, 20.00);
GO

-- 6. MENTOR & JUDGE ASSIGNMENTS
DECLARE @Mentor1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor1');
DECLARE @Mentor2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor2');
DECLARE @Judge1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge1');
DECLARE @Judge2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge2');
DECLARE @JudgeMentor_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge_mentor');

INSERT INTO MentorAssignment (category_id, user_id, status) VALUES
(1, @Mentor1_ID, 'ACTIVE'), (4, @Mentor2_ID, 'ACTIVE'), (7, @Mentor1_ID, 'ACTIVE'), (7, @Mentor2_ID, 'ACTIVE');

INSERT INTO JudgeAssignment (category_id, user_id, status) VALUES
(1, @Judge1_ID, 'ACTIVE'), (1, @Judge2_ID, 'ACTIVE'), (4, @JudgeMentor_ID, 'ACTIVE'), (7, @Judge1_ID, 'ACTIVE'), (7, @Judge2_ID, 'ACTIVE'), (7, @JudgeMentor_ID, 'ACTIVE');
GO

-- 7. ROUNDS
INSERT INTO [Round] (contest_id, category_id, round_name, round_order, submission_open_at, submission_deadline_at, grading_deadline_at, publish_result_at, status, submission_requirements, round_format)
VALUES
(1, 1, 'Qualification Round', 1, '2026-02-11 08:00:00', '2026-02-20 23:59:59', '2026-02-25 17:00:00', '2026-02-26 10:00:00', 'COMPLETED', N'Nộp link GitHub Repo và tài liệu tả kiến trúc', 'ONLINE'),
(1, 1, 'Final Presentation', 2, '2026-02-27 08:00:00', '2026-03-25 23:59:59', '2026-03-29 17:00:00', '2026-03-30 10:00:00', 'COMPLETED', N'Nộp Video Demo, Slide thuyết trình và Source code hoàn thiện', 'OFFLINE'),
(2, 4, 'Qualification Round', 1, '2025-09-16 08:00:00', '2025-10-15 23:59:59', '2025-10-20 17:00:00', '2025-10-21 10:00:00', 'COMPLETED', N'Nộp link Smart Contract trên Testnet và Whitepaper', 'ONLINE'),
(2, 4, 'Final Presentation', 2, '2025-10-22 08:00:00', '2025-11-25 23:59:59', '2025-11-28 17:00:00', '2025-11-30 10:00:00', 'COMPLETED', N'Nộp DApp hoàn chỉnh chạy trên Mainnet/Testnet và Video Demo', 'OFFLINE'),
(3, 7, 'Ideation & Proposal', 1, '2026-06-05 08:00:00', '2026-08-15 23:59:59', '2026-08-20 17:00:00', '2026-08-22 10:00:00', 'IN_PROGRESS', N'Nộp bản Đề xuất Ý tưởng (Proposal), Wireframe và Kế hoạch phát triển', 'ONLINE'),
(3, 7, 'Final Hackathon Day', 2, '2026-08-23 08:00:00', '2026-09-25 23:59:59', '2026-09-28 17:00:00', '2026-09-30 10:00:00', 'NOT_STARTED', N'Nộp Sản phẩm thực tế, Slide và Demo trực tiếp tại gian hàng', 'OFFLINE');
GO

-- 8. TEAMS & MEMBERSHIPS (3 Historical Completed Teams, 3 Current Ongoing Teams, 2 Forming Teams)
DECLARE @PastTeam1_ID BIGINT, @PastTeam2_ID BIGINT, @PastTeam3_ID BIGINT;
DECLARE @Team1_ID BIGINT, @Team2_ID BIGINT, @Team3_ID BIGINT, @Team4_ID BIGINT, @Team5_ID BIGINT;

-- Historical Team 1: AI Pioneers (Contest 1, Category 1) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('PAST01', 'AI Pioneers', 1, 'CLOSED', '2026-02-05 10:00:00');
SET @PastTeam1_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam1_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email = 'nhatmysocutedl@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam1_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-05 10:00:00' FROM [User] u WHERE u.email IN ('huongtuongyen1982@gmail.com', 'nguyendangduyquang@gmail.com', 'thuhien456@gmail.com', '20IT123457@st.huflit.edu.vn');

-- Historical Team 2: Visionary Devs (Contest 1, Category 1) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('PAST02', 'Visionary Devs', 1, 'CLOSED', '2026-02-06 10:00:00');
SET @PastTeam2_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam2_ID, u.user_id, 'LEADER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email = 'vuthituanh123@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam2_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-02-06 10:00:00' FROM [User] u WHERE u.email IN ('vuxuanbach2508@gmail.com', 'buianhtuan123@gmail.com', 'phuonguyen@gmail.com', '20IT123456@st.huflit.edu.vn');

-- Historical Team 3: Blockchain Masters (Contest 2, Category 4) - CLOSED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('PAST03', 'Blockchain Masters', 2, 'CLOSED', '2025-09-05 10:00:00');
SET @PastTeam3_ID = SCOPE_IDENTITY();

INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam3_ID, u.user_id, 'LEADER', 'APPROVED', '2025-09-05 10:00:00' FROM [User] u WHERE u.email = '12345678@st.hcmuaf.edu.vn';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @PastTeam3_ID, u.user_id, 'MEMBER', 'APPROVED', '2025-09-05 10:00:00' FROM [User] u WHERE u.email IN ('20120001@student.hcmus.edu.vn', 'Phamgiahan@hcmut.edu.vn', '09876543@st.hcmuaf.edu.vn', '20IT123457@st.huflit.edu.vn', '20120002@student.hcmus.edu.vn');

-- Ongoing Team 1: Cyber Core (Contest 3, Category 7) - APPROVED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('TEAM01', 'Cyber Core', 3, 'APPROVED', '2026-06-02 10:00:00');
SET @Team1_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team1_ID, u.user_id, 'LEADER', 'APPROVED', '2026-06-02 10:00:00' FROM [User] u WHERE u.email = 'nhatmysocutedl@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team1_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-02 10:00:00' FROM [User] u WHERE u.email IN ('vuthituanh123@gmail.com', '12345678@st.hcmuaf.edu.vn', 'Leduyphuc@hcmut.edu.vn');

-- Ongoing Team 2: Code Rangers (Contest 3, Category 7) - APPROVED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('TEAM02', 'Code Rangers', 3, 'APPROVED', '2026-06-03 10:00:00');
SET @Team2_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team2_ID, u.user_id, 'LEADER', 'APPROVED', '2026-06-03 10:00:00' FROM [User] u WHERE u.email = 'huongtuongyen1982@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team2_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-03 10:00:00' FROM [User] u WHERE u.email IN ('vuxuanbach2508@gmail.com', '20120001@student.hcmus.edu.vn', '20IT123456@st.huflit.edu.vn');

-- Ongoing Team 3: Byte Wizards (Contest 3, Category 7) - APPROVED
INSERT INTO Team (team_code, team_name, contest_id, status, created_at)
VALUES ('TEAM03', 'Byte Wizards', 3, 'APPROVED', '2026-06-04 10:00:00');
SET @Team3_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team3_ID, u.user_id, 'LEADER', 'APPROVED', '2026-06-04 10:00:00' FROM [User] u WHERE u.email = 'nguyendangduyquang@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team3_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-04 10:00:00' FROM [User] u WHERE u.email IN ('buianhtuan123@gmail.com', 'Phamgiahan@hcmut.edu.vn', '20IT123457@st.huflit.edu.vn');

-- Forming Team 4: Tech Titans (No contest yet) - FORMING
INSERT INTO Team (team_code, team_name, status, created_at)
VALUES ('TEAM04', 'Tech Titans', 'FORMING', '2026-06-05 10:00:00');
SET @Team4_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team4_ID, u.user_id, 'LEADER', 'APPROVED', '2026-06-05 10:00:00' FROM [User] u WHERE u.email = 'thuhien456@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team4_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-05 10:00:00' FROM [User] u WHERE u.email IN ('phuonguyen@gmail.com', '09876543@st.hcmuaf.edu.vn', '20120002@student.hcmus.edu.vn');

-- Forming Team 5: Data Ninjas (No contest yet) - FORMING
INSERT INTO Team (team_code, team_name, status, created_at)
VALUES ('TEAM05', 'Data Ninjas', 'FORMING', '2026-06-06 10:00:00');
SET @Team5_ID = SCOPE_IDENTITY();
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team5_ID, u.user_id, 'LEADER', 'APPROVED', '2026-06-06 10:00:00' FROM [User] u WHERE u.email = 'dntotrinh@gmail.com';
INSERT INTO TeamMembership (team_id, user_id, member_role, status, joined_at)
SELECT @Team5_ID, u.user_id, 'MEMBER', 'APPROVED', '2026-06-06 10:00:00' FROM [User] u WHERE u.email = 'phannha@gmail.com';
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

INSERT INTO TeamMentor (team_id, user_id, category_id, status) VALUES
(@PastTeam1_ID, @Mentor1_ID, 1, 'ACTIVE'),
(@PastTeam2_ID, @Mentor2_ID, 1, 'ACTIVE'),
(@PastTeam3_ID, @Mentor1_ID, 4, 'ACTIVE'),
(@Team1_ID, @Mentor1_ID, 7, 'ACTIVE'),
(@Team2_ID, @Mentor2_ID, 7, 'ACTIVE'),
(@Team3_ID, @Mentor1_ID, 7, 'ACTIVE');
GO

-- 9. SUBMISSIONS
DECLARE @PastTeam1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01');
DECLARE @PastTeam2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02');
DECLARE @PastTeam3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03');
DECLARE @Team1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM01');
DECLARE @Team2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM02');
DECLARE @Team3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'TEAM03');
DECLARE @Mentor1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor1');
DECLARE @Mentor2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'mentor2');

INSERT INTO Submission (team_id, round_id, submission_data, version, submitted_at, status, mentor_feedback, mentor_id)
VALUES
(@PastTeam1_ID, 1, N'{"Project Repository":"https://github.com/aipioneers/smart-ai-qual","Documentation":"https://docs.google.com/aipioneers-qual"}', 1, '2026-02-18 14:00:00', 'GRADED', N'Ý tưởng rất tốt, cần chuẩn bị kỹ cho vòng Chung kết.', @Mentor1_ID),
(@PastTeam1_ID, 2, N'{"Project Repository":"https://github.com/aipioneers/smart-ai-final","Demo Video":"https://youtube.com/watch?v=demo1","Slide":"https://docs.google.com/presentation/d/ai-pioneers"}', 1, '2026-03-20 15:30:00', 'GRADED', N'Kiến trúc tuyệt vời, phần Demo cực kỳ mượt mà!', @Mentor1_ID),
(@PastTeam2_ID, 1, N'{"Project Repository":"https://github.com/visionary/cv-qual","Documentation":"https://docs.google.com/visionary-qual"}', 1, '2026-02-19 10:00:00', 'GRADED', N'Cải thiện thêm độ chính xác của model nhé.', @Mentor2_ID),
(@PastTeam2_ID, 2, N'{"Project Repository":"https://github.com/visionary/cv-final","Demo Video":"https://youtube.com/watch?v=demo2","Slide":"https://docs.google.com/presentation/d/visionary"}', 1, '2026-03-22 11:00:00', 'GRADED', N'Sản phẩm hoàn thiện rất tốt, thuyết trình rõ ràng.', @Mentor2_ID),
(@PastTeam3_ID, 3, N'{"Project Repository":"https://github.com/blockchainmasters/defi-qual","Smart Contract":"0x71C...893"}', 1, '2025-10-10 16:00:00', 'GRADED', N'Smart contract viết chuẩn, gas fee tối ưu.', @Mentor1_ID),
(@PastTeam3_ID, 4, N'{"Project Repository":"https://github.com/blockchainmasters/defi-final","Demo Video":"https://youtube.com/watch?v=demo3","DApp URL":"https://defi-masters.app"}', 1, '2025-11-20 09:30:00', 'GRADED', N'DApp chạy mượt, giao diện UI/UX rất đẳng cấp!', @Mentor1_ID),
(@Team1_ID, 5, N'{"Project Repository":"https://github.com/cybercore/seal-app","Proposal":"https://docs.google.com/document/d/cybercore-proposal"}', 1, '2026-06-15 14:00:00', 'SUBMITTED', N'Đang chờ Mentor đánh giá chi tiết.', @Mentor1_ID),
(@Team2_ID, 5, N'{"Project Repository":"https://github.com/coderangers/ai-web3","Proposal":"https://docs.google.com/document/d/coderangers-proposal"}', 1, '2026-06-16 10:00:00', 'UNDER_REVIEW', N'Đề xuất ý tưởng rất sáng tạo, tiếp tục làm prototype nhé!', @Mentor2_ID),
(@Team3_ID, 5, N'{"Project Repository":"https://github.com/bytewizards/hackathon-draft"}', 1, '2026-06-17 08:00:00', 'DRAFT', NULL, NULL);
GO

-- 10. SCORES & SCORE DETAILS (For Historical Finals)
DECLARE @Sub_AI_Final BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST01') AND round_id = 2);
DECLARE @Sub_Vis_Final BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST02') AND round_id = 2);
DECLARE @Sub_Block_Final BIGINT = (SELECT TOP 1 submission_id FROM Submission WHERE team_id = (SELECT team_id FROM Team WHERE team_code = 'PAST03') AND round_id = 4);

DECLARE @Judge1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge1');
DECLARE @Judge2_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge2');
DECLARE @JudgeMentor_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'judge_mentor');

-- Score for AI Pioneers by Judge 1 & Judge 2
INSERT INTO Score (submission_id, user_id, total_score, general_feedback, status)
VALUES
(@Sub_AI_Final, @Judge1_ID, 93.00, N'Dự án xuất sắc, giải quyết đúng nỗi đau của xã hội.', 'PUBLISHED'),
(@Sub_AI_Final, @Judge2_ID, 92.00, N'Kiến trúc thuật toán rất vững chắc và sáng tạo.', 'PUBLISHED'),
(@Sub_Vis_Final, @Judge1_ID, 88.00, N'Sản phẩm tốt nhưng tính năng thương mại cần hoàn thiện thêm.', 'PUBLISHED'),
(@Sub_Block_Final, @JudgeMentor_ID, 95.00, N'Giải pháp DeFi toàn diện, bảo mật cao và UI/UX tuyệt vời.', 'PUBLISHED');
GO

-- 11. RANKING RESULTS (For Leaderboards & My Teams)
DECLARE @PastTeam1_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST01');
DECLARE @PastTeam2_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST02');
DECLARE @PastTeam3_ID BIGINT = (SELECT TOP 1 team_id FROM Team WHERE team_code = 'PAST03');
DECLARE @Admin1_ID BIGINT = (SELECT TOP 1 user_id FROM [User] WHERE username = 'admin1');

INSERT INTO RankingResult (round_id, category_id, team_id, user_id, rank_no, final_score, qualification_status, date_published_at)
VALUES
(2, 1, @PastTeam1_ID, @Admin1_ID, 1, 92.50, 'QUALIFIED', '2026-03-30 10:00:00'),
(2, 1, @PastTeam2_ID, @Admin1_ID, 2, 88.00, 'QUALIFIED', '2026-03-30 10:00:00'),
(4, 4, @PastTeam3_ID, @Admin1_ID, 1, 95.00, 'QUALIFIED', '2025-11-30 10:00:00');
GO
