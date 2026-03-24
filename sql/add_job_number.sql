-- Add a sequential job_number column to jobs table for display purposes
-- This is a human-friendly short ID (1, 2, 3...) instead of the long UUID

-- Add the column if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'job_number'
    ) THEN
        -- Add a sequence and column
        CREATE SEQUENCE IF NOT EXISTS jobs_job_number_seq;
        ALTER TABLE jobs ADD COLUMN job_number INTEGER DEFAULT nextval('jobs_job_number_seq');
        
        -- Backfill existing rows with sequential numbers ordered by creation date
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
            FROM jobs
        )
        UPDATE jobs SET job_number = numbered.rn
        FROM numbered WHERE jobs.id = numbered.id;
        
        -- Make it NOT NULL and set the sequence to continue from max
        ALTER TABLE jobs ALTER COLUMN job_number SET NOT NULL;
        SELECT setval('jobs_job_number_seq', COALESCE((SELECT MAX(job_number) FROM jobs), 0) + 1);
        
        -- Create a trigger to auto-assign job_number on insert
        CREATE OR REPLACE FUNCTION set_job_number()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.job_number := nextval('jobs_job_number_seq');
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_set_job_number ON jobs;
        CREATE TRIGGER trg_set_job_number
            BEFORE INSERT ON jobs
            FOR EACH ROW
            WHEN (NEW.job_number IS NULL)
            EXECUTE FUNCTION set_job_number();

        RAISE NOTICE 'job_number column added successfully';
    ELSE
        RAISE NOTICE 'job_number column already exists, skipping';
    END IF;
END $$;
