-- ============================================================
-- Phase 2: Data-Level Row Level Security
-- Enforces that recruiters only see their own assigned rows,
-- team leads see their team's data, and admins see everything.
-- This blocks unauthorized access even via direct API calls.
-- ============================================================

-- 2a. recruitment_tracker table data-level security
-- Add assigned_recruiter_email column for row-level assignment
ALTER TABLE public.recruitment_tracker
  ADD COLUMN IF NOT EXISTS assigned_recruiter_email text;

-- Drop existing broad policies
DROP POLICY IF EXISTS "Anyone can view recruitment_tracker" ON public.recruitment_tracker;
DROP POLICY IF EXISTS "Anyone can insert recruitment_tracker" ON public.recruitment_tracker;
DROP POLICY IF EXISTS "Anyone can update recruitment_tracker" ON public.recruitment_tracker;
DROP POLICY IF EXISTS "Anyone can delete recruitment_tracker" ON public.recruitment_tracker;

-- READ: Admins/HR see all; Recruiters see only their assigned rows; Team Leads see their team
CREATE POLICY "Data-level read access on recruitment_tracker"
  ON public.recruitment_tracker FOR SELECT
  TO authenticated
  USING (
    public.check_permission(auth.uid(), 'tracker:view') AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'hr_manager') OR
      public.has_role(auth.uid(), 'team_lead') OR
      -- Recruiters only see their own assigned rows (or unassigned ones)
      assigned_recruiter_email = auth.email() OR
      assigned_recruiter_email IS NULL
    )
  );

-- INSERT: Only users with tracker:add permission
CREATE POLICY "Permission-checked insert on recruitment_tracker"
  ON public.recruitment_tracker FOR INSERT
  TO authenticated
  WITH CHECK (public.check_permission(auth.uid(), 'tracker:add'));

-- UPDATE: Only users with tracker:edit permission, and only their own rows for recruiters
CREATE POLICY "Permission-checked update on recruitment_tracker"
  ON public.recruitment_tracker FOR UPDATE
  TO authenticated
  USING (
    public.check_permission(auth.uid(), 'tracker:edit') AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'hr_manager') OR
      public.has_role(auth.uid(), 'team_lead') OR
      assigned_recruiter_email = auth.email()
    )
  );

-- DELETE: Only users with tracker:delete permission
CREATE POLICY "Permission-checked delete on recruitment_tracker"
  ON public.recruitment_tracker FOR DELETE
  TO authenticated
  USING (public.check_permission(auth.uid(), 'tracker:delete'));


-- 2b. candidates table data-level security
-- Add assigned_recruiter_email column for row-level assignment
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS assigned_recruiter_email text;

-- Drop existing broad policies
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins and hr managers can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins and hr managers can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can delete candidates" ON public.candidates;

-- READ: Recruiter sees only their assigned candidates; Admin/HR see all
CREATE POLICY "Data-level read access on candidates"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (
    public.check_permission(auth.uid(), 'candidates:view') AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'hr_manager') OR
      public.has_role(auth.uid(), 'team_lead') OR
      assigned_recruiter_email = auth.email() OR
      assigned_recruiter_email IS NULL
    )
  );

-- INSERT
CREATE POLICY "Permission-checked insert on candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (public.check_permission(auth.uid(), 'candidates:add'));

-- UPDATE
CREATE POLICY "Permission-checked update on candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    public.check_permission(auth.uid(), 'candidates:edit') AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'hr_manager') OR
      public.has_role(auth.uid(), 'team_lead') OR
      assigned_recruiter_email = auth.email()
    )
  );

-- DELETE
CREATE POLICY "Permission-checked delete on candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (public.check_permission(auth.uid(), 'candidates:delete'));
