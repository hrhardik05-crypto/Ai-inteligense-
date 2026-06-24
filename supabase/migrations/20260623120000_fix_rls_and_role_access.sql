-- Fix: Allow every authenticated user to read their OWN role row
-- (Previously only 'admin' could read all roles — this caused a chicken-and-egg problem:
--  you need your role to pass the RLS check, but the RLS check needs your role)

-- 1. Drop the old restrictive user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 2. Re-create: every user can read their OWN row (fixes the blank sidebar bug)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Admins can read ALL rows
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Admins can manage (insert/update/delete) all rows
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Fix profiles policy: users can always read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Ensure hardik.parmar@indianic.com has a profile and admin role
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE email = 'hardik.parmar@indianic.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'hardik.parmar@indianic.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Verify
SELECT 
  u.email, 
  p.full_name, 
  ur.role,
  'OK' as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hardik.parmar@indianic.com';
