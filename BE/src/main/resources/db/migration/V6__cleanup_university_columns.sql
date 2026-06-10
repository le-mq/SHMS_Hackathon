-- Drop the redundant student_code_regex column
ALTER TABLE University DROP COLUMN student_code_regex;
GO

-- Rename mssv_regex to student_code_regex
EXEC sp_rename 'University.mssv_regex', 'student_code_regex', 'COLUMN';
GO

-- Fix status values to match string convention instead of bit/int
UPDATE University SET status = 'ACTIVE' WHERE status = '1';
UPDATE University SET status = 'INACTIVE' WHERE status = '0';
GO
