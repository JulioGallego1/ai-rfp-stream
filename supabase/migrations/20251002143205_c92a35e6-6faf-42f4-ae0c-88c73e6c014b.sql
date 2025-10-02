-- Add additional fields to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS available_funds NUMERIC,
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS technologies TEXT[];

-- Update rfps table to include more detailed status and compatibility
ALTER TABLE rfps
ADD COLUMN IF NOT EXISTS compatibility_score NUMERIC,
ADD COLUMN IF NOT EXISTS required_technologies TEXT[];

-- Update status column to use specific enum values
ALTER TABLE rfps
ALTER COLUMN status SET DEFAULT 'pending';

-- Create a table for past projects/references
CREATE TABLE IF NOT EXISTS past_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  project_name TEXT NOT NULL,
  client_name TEXT,
  completion_date TIMESTAMP WITH TIME ZONE,
  technologies_used TEXT[],
  budget NUMERIC,
  description TEXT,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE past_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view past projects"
  ON past_projects FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert past projects"
  ON past_projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update past projects"
  ON past_projects FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_past_projects_updated_at
  BEFORE UPDATE ON past_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();