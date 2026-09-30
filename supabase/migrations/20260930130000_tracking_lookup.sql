-- Customer tracking page (/w/:slug) and landing page counters, without table access.
--
-- Both pages run logged out and used to read public.jobs and public.job_attachments
-- directly, through policies that let anyone list every active job of every
-- workshop: customer names, phone numbers, plates, amounts, notes and staff emails.
-- These two functions return only what those pages show. The next migration
-- (20260930130100_close_public_job_reads.sql) removes the old policies once a
-- frontend that calls these functions is live.

-- One workshop, and only exact matches: the full plate (spacing and case ignored),
-- or the full phone number in any common format (012-345 6789, +6012 345 6789 and
-- 60123456789 all compare as 123456789). A plate returns that car's latest active
-- job; a phone number can return a few cars. Archived jobs never come back.
-- The customer's phone number is masked, and only photos are returned (payment
-- receipts and staff fields stay private).
CREATE OR REPLACE FUNCTION public.track_jobs(p_slug text, p_plate text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH q AS (
    SELECT nullif(upper(regexp_replace(coalesce(p_plate, ''), '\s', '', 'g')), '') AS plate,
           nullif(regexp_replace(regexp_replace(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '^60', ''), '^0+', ''), '') AS phone
  ),
  hits AS (
    SELECT j.*
    FROM public.jobs j
    JOIN public.workshops w ON w.id = j.workshop_id
    CROSS JOIN q
    WHERE w.slug = p_slug
      AND j.archived = false
      AND CASE
            WHEN q.plate IS NOT NULL THEN upper(regexp_replace(j.plate, '\s', '', 'g')) = q.plate
            WHEN length(q.phone) >= 8 THEN
              regexp_replace(regexp_replace(regexp_replace(coalesce(j.phone, ''), '\D', '', 'g'), '^60', ''), '^0+', '') = q.phone
            ELSE false
          END
    ORDER BY j.created_at DESC
    LIMIT CASE WHEN regexp_replace(coalesce(p_plate, ''), '\s', '', 'g') <> '' THEN 1 ELSE 20 END
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',             h.id,
    'plate',          h.plate,
    'car',            h.car,
    'owner',          h.owner,
    'phone',          CASE WHEN length(regexp_replace(coalesce(h.phone, ''), '\D', '', 'g')) >= 4
                           THEN '•••• ' || right(regexp_replace(h.phone, '\D', '', 'g'), 4) END,
    'type',           h.type,
    'stage',          h.stage,
    'date_in',        h.date_in,
    'est_completion', h.est_completion,
    'created_at',     h.created_at,
    'updated_at',     h.updated_at,
    'total_amount',   h.total_amount,
    'discount',       h.discount,
    'downpayment',    h.downpayment,
    'paid',           h.paid,
    'notes',          h.notes,
    'services', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'description',   s.item -> 'description',
               'category_name', s.item -> 'category_name',
               'qty',           s.item -> 'qty',
               'unit_price',    s.item -> 'unit_price',
               'amount',        s.item -> 'amount') ORDER BY s.n), '[]'::jsonb)
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.services) = 'array' THEN h.services ELSE '[]'::jsonb END)
           WITH ORDINALITY AS s(item, n)),
    'job_attachments', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'id', a.id, 'type', a.type, 'url', a.url, 'stage', a.stage, 'caption', a.caption, 'created_at', a.created_at)
               ORDER BY a.created_at), '[]'::jsonb)
      FROM public.job_attachments a
      WHERE a.job_id = h.id AND a.type = 'photo')
  ) ORDER BY h.created_at DESC), '[]'::jsonb)
  FROM hits h
$$;
REVOKE ALL ON FUNCTION public.track_jobs(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_jobs(text, text, text) TO anon, authenticated;

-- Totals for the landing page ("kenderaan direkod", "invois diselesaikan", ...).
CREATE OR REPLACE FUNCTION public.platform_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'workshops', (SELECT count(*) FROM public.workshops),
    'jobs',      (SELECT count(*) FROM public.jobs),
    'paid',      (SELECT count(*) FROM public.jobs WHERE paid),
    'photos',    (SELECT count(*) FROM public.job_attachments WHERE type = 'photo'))
$$;
REVOKE ALL ON FUNCTION public.platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_stats() TO anon, authenticated;
