-- ============================================================
-- Phase 1: Enterprise RBAC Foundation
-- Creates a robust check_permission function, seeds default
-- roles into the database, and locks down the roles table RLS.
-- ============================================================

-- 1. Ensure roles table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 2. Core permission checker function
-- Reads the JSON permissions blob from the roles table for a given user
-- and checks whether the specified permission key is `true`.
DROP FUNCTION IF EXISTS public.check_permission(uuid, text);
CREATE OR REPLACE FUNCTION public.check_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _permissions jsonb;
  _result boolean;
BEGIN
  -- Super admin / admin always passes
  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF _role IN ('super_admin', 'admin') THEN
    RETURN true;
  END IF;

  -- Fallback to JWT metadata for instant role resolution on login
  IF _role IS NULL THEN
    _role := COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    );
  END IF;

  IF _role IN ('super_admin', 'admin') THEN
    RETURN true;
  END IF;

  -- Look up the permission value from the roles table
  SELECT permissions INTO _permissions
  FROM public.roles
  WHERE name = _role;

  IF _permissions IS NULL THEN
    RETURN false;
  END IF;

  _result := (_permissions ->> _permission_key)::boolean;
  RETURN COALESCE(_result, false);
END;
$$;

-- 3. Seed default roles (skip if already exist)
INSERT INTO public.roles (name, description, permissions, is_system)
VALUES
  (
    'super_admin',
    'Full access to all modules, settings, and user permissions management.',
    '{
      "tracker:view": true, "tracker:add": true, "tracker:edit": true, "tracker:delete": true,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": true,
      "candidates:view": true, "candidates:add": true, "candidates:edit": true, "candidates:delete": true, "candidates:export": true,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": true, "interviews:view_reports": true,
      "reports:view_dashboard": true, "reports:view_reports": true, "reports:export": true, "reports:download_excel": true, "reports:download_pdf": true,
      "users:view": true, "users:add": true, "users:edit": true, "users:delete": true, "users:reset_password": true, "users:assign_roles": true
    }'::jsonb,
    true
  ),
  (
    'admin',
    'Full access to all modules, settings, and user permissions management.',
    '{
      "tracker:view": true, "tracker:add": true, "tracker:edit": true, "tracker:delete": true,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": true,
      "candidates:view": true, "candidates:add": true, "candidates:edit": true, "candidates:delete": true, "candidates:export": true,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": true, "interviews:view_reports": true,
      "reports:view_dashboard": true, "reports:view_reports": true, "reports:export": true, "reports:download_excel": true, "reports:download_pdf": true,
      "users:view": true, "users:add": true, "users:edit": true, "users:delete": true, "users:reset_password": true, "users:assign_roles": true
    }'::jsonb,
    true
  ),
  (
    'hr_manager',
    'Manage requisitions, candidates, schedule interviews, view performance, and approve offers.',
    '{
      "tracker:view": true, "tracker:add": true, "tracker:edit": true, "tracker:delete": true,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": true,
      "candidates:view": true, "candidates:add": true, "candidates:edit": true, "candidates:delete": false, "candidates:export": true,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": true, "interviews:view_reports": true,
      "reports:view_dashboard": true, "reports:view_reports": true, "reports:export": true, "reports:download_excel": true, "reports:download_pdf": true,
      "users:view": true, "users:add": false, "users:edit": false, "users:delete": false, "users:reset_password": false, "users:assign_roles": false
    }'::jsonb,
    true
  ),
  (
    'recruiter',
    'View assigned openings, add candidates, share profiles, and update interview or selection metrics.',
    '{
      "tracker:view": true, "tracker:add": false, "tracker:edit": true, "tracker:delete": false,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": false,
      "candidates:view": true, "candidates:add": true, "candidates:edit": true, "candidates:delete": false, "candidates:export": false,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": false, "interviews:view_reports": false,
      "reports:view_dashboard": true, "reports:view_reports": false, "reports:export": false, "reports:download_excel": false, "reports:download_pdf": false,
      "users:view": false, "users:add": false, "users:edit": false, "users:delete": false, "users:reset_password": false, "users:assign_roles": false
    }'::jsonb,
    true
  ),
  (
    'team_lead',
    'View team positions, track recruiter leaderboard, approve updates, and check analytics.',
    '{
      "tracker:view": true, "tracker:add": true, "tracker:edit": true, "tracker:delete": false,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": true,
      "candidates:view": true, "candidates:add": false, "candidates:edit": true, "candidates:delete": false, "candidates:export": true,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": true, "interviews:view_reports": true,
      "reports:view_dashboard": true, "reports:view_reports": true, "reports:export": true, "reports:download_excel": true, "reports:download_pdf": true,
      "users:view": false, "users:add": false, "users:edit": false, "users:delete": false, "users:reset_password": false, "users:assign_roles": false
    }'::jsonb,
    true
  ),
  (
    'client',
    'Read-only access to assigned requirements, profiles submitted, and scheduling statuses.',
    '{
      "tracker:view": true, "tracker:add": false, "tracker:edit": false, "tracker:delete": false,
      "tracker:update_interview": false, "tracker:update_offer": false, "tracker:close": false,
      "candidates:view": true, "candidates:add": false, "candidates:edit": false, "candidates:delete": false, "candidates:export": false,
      "interviews:schedule": false, "interviews:update_status": false, "interviews:cancel": false, "interviews:view_reports": false,
      "reports:view_dashboard": true, "reports:view_reports": false, "reports:export": false, "reports:download_excel": false, "reports:download_pdf": false,
      "users:view": false, "users:add": false, "users:edit": false, "users:delete": false, "users:reset_password": false, "users:assign_roles": false
    }'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- 4. Secure roles table RLS policies (drop and recreate cleanly)
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.roles;
DROP POLICY IF EXISTS "Allow super_admins to manage roles" ON public.roles;
DROP POLICY IF EXISTS "Allow all updates to roles table" ON public.roles;

-- All authenticated users can read roles (needed to evaluate permissions)
CREATE POLICY "All users can read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can INSERT/UPDATE/DELETE roles
CREATE POLICY "Only admins can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );
