-- ============================================================
-- Phase 3: Seed simplified 3-role RBAC system
-- Admin (full access), Manager (view all + update, no delete/settings),
-- Recruiter (assigned data only, no reports/settings).
-- Run this AFTER 20260623160000_rbac_foundation.sql
-- ============================================================

-- Upsert all 3 main roles cleanly
INSERT INTO public.roles (name, description, permissions, is_system)
VALUES
  (
    'admin',
    'Full access to all modules. Add/Edit/Delete users, create roles, view all reports.',
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
    'manager',
    'View all openings, candidates, interviews. Update recruitment status. View reports. Cannot delete records.',
    '{
      "tracker:view": true, "tracker:add": true, "tracker:edit": true, "tracker:delete": false,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": true,
      "candidates:view": true, "candidates:add": true, "candidates:edit": true, "candidates:delete": false, "candidates:export": true,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": true, "interviews:view_reports": true,
      "reports:view_dashboard": true, "reports:view_reports": true, "reports:export": true, "reports:download_excel": true, "reports:download_pdf": true,
      "users:view": false, "users:add": false, "users:edit": false, "users:delete": false, "users:reset_password": false, "users:assign_roles": false
    }'::jsonb,
    true
  ),
  (
    'recruiter',
    'View assigned openings only. Add candidates. Update interview/candidate status. No reports or settings.',
    '{
      "tracker:view": true, "tracker:add": false, "tracker:edit": true, "tracker:delete": false,
      "tracker:update_interview": true, "tracker:update_offer": true, "tracker:close": false,
      "candidates:view": true, "candidates:add": true, "candidates:edit": true, "candidates:delete": false, "candidates:export": false,
      "interviews:schedule": true, "interviews:update_status": true, "interviews:cancel": false, "interviews:view_reports": false,
      "reports:view_dashboard": false, "reports:view_reports": false, "reports:export": false, "reports:download_excel": false, "reports:download_pdf": false,
      "users:view": false, "users:add": false, "users:edit": false, "users:delete": false, "users:reset_password": false, "users:assign_roles": false
    }'::jsonb,
    true
  )
ON CONFLICT (name) DO UPDATE
  SET permissions = EXCLUDED.permissions,
      description = EXCLUDED.description,
      updated_at = now();
