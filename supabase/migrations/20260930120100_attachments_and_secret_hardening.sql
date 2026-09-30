-- Security hardening, applied 30 Sep 2026.
--
-- 1. Remove the leftover public copy of the ToyyibPay secret.
--    The secret lives only in workshop_secrets (service role only) since
--    0001_toyyibpay_secret_hardening.sql, but that migration's final step (drop the
--    old column) was never run. The old column still held a live key, and the
--    "workshops_public_read" policy let anyone read it with the public anon key.
--    Nothing reads or writes this column any more (the app, the edge functions and
--    set_toyyibpay_secret all use workshop_secrets).
ALTER TABLE public.workshops DROP COLUMN IF EXISTS toyyibpay_secret_key;

-- 2. Storage: only people in a workshop may add or remove that workshop's files.
--    The "attachments" bucket let the public role (no login needed) upload files
--    anywhere and delete any file. Paths the app writes:
--      logos/<workshop_id>/<ts>.<ext>  (older logos: logos/<workshop_id>.<ext>)  → the workshop owner
--      photos/<job_id>/<ts>.<ext>, receipts/<job_id>/<ts>.<ext>                 → owner and workers
--    Files left behind by deleted jobs may be removed by any signed-in user: the app
--    deletes the job row first and then tidies its photos. Reading stays public
--    (customers see job photos and logos through public URLs).
CREATE OR REPLACE FUNCTION public.can_write_attachment(object_name text, for_delete boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH p AS (
    SELECT split_part(object_name, '/', 1) AS folder,
           substring(split_part(object_name, '/', 2)
                     FROM '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}') AS id_text
  )
  SELECT coalesce((
    SELECT CASE
      WHEN p.id_text IS NULL THEN false
      WHEN p.folder = 'logos' THEN EXISTS (
        SELECT 1 FROM public.workshops w
        WHERE w.id = p.id_text::uuid AND w.owner_id = (SELECT auth.uid()))
      WHEN p.folder IN ('photos', 'receipts') THEN
        EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = p.id_text::uuid
            AND (EXISTS (SELECT 1 FROM public.workshops w
                         WHERE w.id = j.workshop_id AND w.owner_id = (SELECT auth.uid()))
              OR EXISTS (SELECT 1 FROM public.workshop_members m
                         WHERE m.workshop_id = j.workshop_id AND m.user_id = (SELECT auth.uid()))))
        OR (for_delete AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = p.id_text::uuid))
      ELSE false
    END
    FROM p), false)
$$;
REVOKE ALL ON FUNCTION public.can_write_attachment(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_attachment(text, boolean) TO authenticated;

DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete"  ON storage.objects;
DROP POLICY IF EXISTS "attachments_insert_own_workshop" ON storage.objects;
DROP POLICY IF EXISTS "attachments_delete_own_workshop" ON storage.objects;
CREATE POLICY "attachments_insert_own_workshop" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND public.can_write_attachment(name, false));
CREATE POLICY "attachments_delete_own_workshop" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND public.can_write_attachment(name, true));
-- "Allow public read" (SELECT) is unchanged.
