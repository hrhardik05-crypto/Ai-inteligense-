-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  notice_period INTEGER NOT NULL DEFAULT 30,
  notice_negotiated BOOLEAN NOT NULL DEFAULT false,
  reduced_notice_period INTEGER NOT NULL DEFAULT 30,
  current_ctc NUMERIC NOT NULL DEFAULT 0,
  offered_ctc NUMERIC NOT NULL DEFAULT 0,
  hike_percentage NUMERIC NOT NULL DEFAULT 0,
  counter_offer_history BOOLEAN NOT NULL DEFAULT false,
  company_type TEXT NOT NULL DEFAULT 'MNC' CHECK (company_type IN ('MNC', 'Startup', 'Service-based')),
  years_in_current_org NUMERIC NOT NULL DEFAULT 0,
  total_experience NUMERIC NOT NULL DEFAULT 0,
  job_changes INTEGER NOT NULL DEFAULT 0,
  location_change BOOLEAN NOT NULL DEFAULT false,
  work_mode TEXT NOT NULL DEFAULT 'Hybrid' CHECK (work_mode IN ('Remote', 'Onsite', 'Hybrid')),
  joining_probability INTEGER NOT NULL DEFAULT 50,
  offer_drop_risk TEXT NOT NULL DEFAULT 'Medium' CHECK (offer_drop_risk IN ('Low', 'Medium', 'High')),
  notice_negotiation_success INTEGER NOT NULL DEFAULT 50,
  joined BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Anyone can view candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update candidates" ON public.candidates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete candidates" ON public.candidates FOR DELETE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();