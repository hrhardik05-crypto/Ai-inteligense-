-- Fix: Redefine has_role helper function to automatically grant super_admin all permissions.
-- This prevents row-level security (RLS) violations when a super_admin tries to manage roles or access restricted resources.

DO $$
BEGIN
  -- 1. Redefine has_role(uuid, text)
  CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $func$
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND (role::text = _role OR role::text = 'super_admin')
    )
  $func$;

  -- 2. Redefine has_role(uuid, public.app_role) if the enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = _user_id AND (role::text = _role::text OR role::text = ''super_admin'')
        )
      $func$;
    ';
  END IF;
END $$;
