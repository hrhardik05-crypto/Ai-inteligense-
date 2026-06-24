-- Explicitly update RLS policies to grant all privileges to 'super_admin' role
-- This ensures super_admin users can assign roles and manage the system without RLS violations.

-- 1. Ensure the app_role enum has 'super_admin' value if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_lead';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
  END IF;
END $$;

-- 2. Redefine has_role function using plpgsql to safely fall back to JWT metadata if the database row is deleted or missing.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_exists boolean;
  jwt_role text;
BEGIN
  -- Check user_roles table
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (role::text = _role OR role::text = 'super_admin')
  ) INTO role_exists;

  IF role_exists THEN
    RETURN true;
  END IF;

  -- Fallback to JWT metadata if it's the current logged-in user
  IF _user_id = auth.uid() THEN
    BEGIN
      jwt_role := COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role'
      );
      IF jwt_role = _role OR jwt_role = 'super_admin' THEN
        RETURN true;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN false;
END;
$$;

-- 3. Redefine has_role(uuid, public.app_role) if the enum type exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      role_exists boolean;
      jwt_role text;
    BEGIN
      -- Check user_roles table
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND (role::text = _role::text OR role::text = 'super_admin')
      ) INTO role_exists;

      IF role_exists THEN
        RETURN true;
      END IF;

      -- Fallback to JWT metadata if it's the current logged-in user
      IF _user_id = auth.uid() THEN
        BEGIN
          jwt_role := COALESCE(
            auth.jwt() -> 'app_metadata' ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role'
          );
          IF jwt_role = _role::text OR jwt_role = 'super_admin' THEN
            RETURN true;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;

      RETURN false;
    END;
    $func$;
  END IF;
END $$;

-- 4. Ensure hardik.parmar@indianic.com actually has the super_admin role row in the database
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'hardik.parmar@indianic.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Delete any old role first to avoid unique constraint issues
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Insert the new super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin');
  END IF;
END $$;

-- 5. Clean up and Update user_roles table RLS policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- 6. Update profiles table RLS policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- 7. Update candidates table RLS policies
DROP POLICY IF EXISTS "Only admins and hr managers can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins and hr managers can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can delete candidates" ON public.candidates;

CREATE POLICY "Only admins and hr managers can insert candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'hr_manager')
  );

CREATE POLICY "Only admins and hr managers can update candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'hr_manager')
  );

CREATE POLICY "Only admins can delete candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );
