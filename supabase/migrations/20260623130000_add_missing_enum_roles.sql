-- Add all missing role values to the app_role enum
-- The current enum only has: 'admin', 'hr_manager', 'recruiter'
-- We need to add: 'super_admin', 'team_lead', 'client'

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Verify all enum values now
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
ORDER BY enumsortorder;
