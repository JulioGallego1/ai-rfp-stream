-- Create companies table for consulting firm profiles
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  size TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create company capabilities table
CREATE TABLE public.company_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  capability TEXT NOT NULL,
  proficiency_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create RFPs table
CREATE TABLE public.rfps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_name TEXT,
  description TEXT,
  deadline TIMESTAMPTZ,
  budget_min DECIMAL,
  budget_max DECIMAL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  document_url TEXT,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create RFP requirements table
CREATE TABLE public.rfp_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID REFERENCES public.rfps(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create compliance checks table (matching requirements with capabilities)
CREATE TABLE public.compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID REFERENCES public.rfps(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.rfp_requirements(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  match_score DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create responses table for draft responses
CREATE TABLE public.rfp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID REFERENCES public.rfps(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  section_title TEXT NOT NULL,
  draft_content TEXT,
  final_content TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for prototype)
CREATE POLICY "Anyone can view companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update companies" ON public.companies FOR UPDATE USING (true);

CREATE POLICY "Anyone can view capabilities" ON public.company_capabilities FOR SELECT USING (true);
CREATE POLICY "Anyone can insert capabilities" ON public.company_capabilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update capabilities" ON public.company_capabilities FOR UPDATE USING (true);

CREATE POLICY "Anyone can view rfps" ON public.rfps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rfps" ON public.rfps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rfps" ON public.rfps FOR UPDATE USING (true);

CREATE POLICY "Anyone can view requirements" ON public.rfp_requirements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert requirements" ON public.rfp_requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update requirements" ON public.rfp_requirements FOR UPDATE USING (true);

CREATE POLICY "Anyone can view compliance" ON public.compliance_checks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert compliance" ON public.compliance_checks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update compliance" ON public.compliance_checks FOR UPDATE USING (true);

CREATE POLICY "Anyone can view responses" ON public.rfp_responses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert responses" ON public.rfp_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update responses" ON public.rfp_responses FOR UPDATE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfps_updated_at BEFORE UPDATE ON public.rfps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_updated_at BEFORE UPDATE ON public.compliance_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON public.rfp_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();