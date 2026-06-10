ALTER TABLE University ADD email_regex VARCHAR(100) NULL;
ALTER TABLE University ADD student_code_regex VARCHAR(100) NULL;
GO

UPDATE University 
SET student_code_regex = '^[A-Z]{2}\d{6}$', 
    email_regex = '^[a-zA-Z0-9._%+-]+@fpt\.edu\.vn$' 
WHERE university_name = 'FPT University HCMC';
GO
