-- Apply only once a frontend that loads the tracking page's workshop through
-- workshop_public() (20261002120100_public_lookup_minimisation.sql) is live. The older
-- tracking page reads public.workshops directly and would show "Bengkel tidak dijumpai".
--
-- Logged-out visitors can no longer list every workshop's phone number, address, owner
-- and billing dates. Owners keep "workshops_owner" and workers "read_workshops_safe";
-- the tracking page, landing counters and invite codes go through functions
-- (workshop_public, track_jobs, platform_stats, join_workshop).
DROP POLICY IF EXISTS "workshops_public_read" ON public.workshops;
