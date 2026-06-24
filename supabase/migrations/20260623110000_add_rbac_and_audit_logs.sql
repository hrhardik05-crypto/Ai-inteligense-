-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Temporary helper to drop dependencies on app_role enum column in user_roles
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(_user_id uuid) CASCADE;

-- Convert user_roles.role column from app_role enum to text to support custom roles
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;

-- Re-create helper functions using text type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Add RLS policies for roles table
CREATE POLICY "Allow authenticated users to read roles" ON public.roles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow super_admins to manage roles" ON public.roles 
  FOR ALL TO authenticated USING (
    public.get_user_role(auth.uid()) = 'super_admin' OR 
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  table_name text NOT NULL,
  record_id text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for audit_logs
CREATE POLICY "Allow authenticated users to read audit_logs" ON public.audit_logs 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert audit_logs" ON public.audit_logs 
  FOR INSERT TO authenticated WITH CHECK (true);
