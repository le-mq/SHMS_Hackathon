-- Drop the existing UNIQUE constraint that causes duplicate NULLs
ALTER TABLE University DROP CONSTRAINT uq_university_code;
GO

-- Recreate it as a filtered unique index to allow multiple NULLs
CREATE UNIQUE NONCLUSTERED INDEX uq_university_code
ON University(university_code)
WHERE university_code IS NOT NULL;
GO
