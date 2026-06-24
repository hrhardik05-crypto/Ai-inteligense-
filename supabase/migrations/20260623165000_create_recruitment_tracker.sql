CREATE TABLE IF NOT EXISTS public.recruitment_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_name text NOT NULL,
  client_name text NOT NULL,
  recruiter_name text NOT NULL,
  openings integer NOT NULL DEFAULT 0,
  shared integer NOT NULL DEFAULT 0,
  r1_conducted integer NOT NULL DEFAULT 0,
  r1_rejected integer NOT NULL DEFAULT 0,
  r2_conducted integer NOT NULL DEFAULT 0,
  r2_rejected integer NOT NULL DEFAULT 0,
  r_final_conducted integer NOT NULL DEFAULT 0,
  r_final_rejected integer NOT NULL DEFAULT 0,
  selected integer NOT NULL DEFAULT 0,
  offered integer NOT NULL DEFAULT 0,
  accepted integer NOT NULL DEFAULT 0,
  joined integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  remarks text,
  date text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.recruitment_tracker ENABLE ROW LEVEL SECURITY;
