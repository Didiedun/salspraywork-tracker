-- Apply only once a frontend that uses track_jobs() and platform_stats() is live
-- (20260930130000_tracking_lookup.sql). The older tracking page reads public.jobs
-- directly and finds no cars without the policies removed here.

-- 1. Jobs and their photos are no longer readable by everyone. Owners keep
--    "jobs_owner" and "owners_manage_attachments", workers keep "jobs_worker_read"
--    and "workers_read_attachments"; the tracking page goes through track_jobs().
DROP POLICY IF EXISTS "jobs_public_read" ON public.jobs;
DROP POLICY IF EXISTS "attachments_public_read" ON public.job_attachments;

-- 2. Only the workshop's own people can list files in the attachments bucket.
--    The bucket is public, so photo and logo links keep working without any read
--    policy: Supabase serves public-bucket files without checking RLS. Storage also
--    needs read access to a file to delete it, so members keep that for their own
--    workshop's files (and for files left behind by deleted jobs).
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "attachments_read_own_workshop" ON storage.objects;
CREATE POLICY "attachments_read_own_workshop" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND public.can_write_attachment(name, true));
