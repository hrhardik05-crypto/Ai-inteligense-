-- 1. Create role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'hr_manager', 'recruiter');
  END IF;
END $$;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions for roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 5. Create candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
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
  resume_url TEXT,
  resume_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- 6. Trigger functions for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Auto-create profile and role on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Dynamic logic: The first user to signup becomes Admin automatically, subsequent users become recruiters
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.user_roles) THEN 'admin'::public.app_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'recruiter'::public.app_role)
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Enable profiles RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- 9. Enable user_roles RLS policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Enable candidates RLS policies (restricted by role)
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins and hr managers can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins and hr managers can update candidates" ON public.candidates;

CREATE POLICY "Authenticated users can view candidates"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins and hr managers can insert candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager'));

CREATE POLICY "Only admins and hr managers can update candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager'));

CREATE POLICY "Only admins can delete candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. Create storage bucket for resumes safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resumes') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
  END IF;
END $$;

-- 12. Create storage RLS policies
DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete resumes" ON storage.objects;

CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Anyone can read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes');
CREATE POLICY "Anyone can delete resumes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resumes');

-- 13. Create extension pgcrypto if it does not exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 14. Seed dummy accounts for developer testing
-- Seed Admin
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  'd9b30000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@dummy.com',
  extensions.crypt('admin123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dummy Admin", "role": "admin"}',
  false,
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Seed HR Manager
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  'd9b30000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'hr@dummy.com',
  extensions.crypt('hr12345', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dummy HR Manager", "role": "hr_manager"}',
  false,
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Seed Recruiter (Standard User)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  'd9b30000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'recruiter@dummy.com',
  extensions.crypt('recruiter123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dummy Recruiter", "role": "recruiter"}',
  false,
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Ensure profiles and roles are also seeded in case triggers are disabled/deferred
INSERT INTO public.profiles (id, email, full_name)
VALUES 
  ('d9b30000-0000-0000-0000-000000000001', 'admin@dummy.com', 'Dummy Admin'),
  ('d9b30000-0000-0000-0000-000000000002', 'hr@dummy.com', 'Dummy HR Manager'),
  ('d9b30000-0000-0000-0000-000000000003', 'recruiter@dummy.com', 'Dummy Recruiter')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('d9b30000-0000-0000-0000-000000000001', 'admin'),
  ('d9b30000-0000-0000-0000-000000000002', 'hr_manager'),
  ('d9b30000-0000-0000-0000-000000000003', 'recruiter')
ON CONFLICT (user_id, role) DO NOTHING;
