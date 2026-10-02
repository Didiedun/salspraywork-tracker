-- Logged-out pages show less personal data.
--
-- 1. The customer tracking page (/w/:slug) loads its workshop straight from
--    public.workshops, through a policy that lets anyone read every row: every
--    workshop's name, phone number, address, owner ID and billing dates.
--    workshop_public() returns one workshop, by its exact slug, with only what that
--    page and its printable invoice show (name, logo, contact details, stages).
--    20261002120300_close_public_workshop_reads.sql removes the policy once a
--    frontend that calls this function is live.
--
-- 2. track_jobs() returned the customer's full name to anyone who types the plate
--    number, and a plate is visible to anyone on the road. The page only needs enough
--    for the customer to recognise their own car: the first name and the initial of
--    the next name ("Ahmad Fauzi" -> "Ahmad F.", "Siti binti Ali" -> "Siti A.").
--    The rest of track_jobs() is unchanged from 20260930130000_tracking_lookup.sql.

CREATE OR REPLACE FUNCTION public.workshop_public(p_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'name',      w.name,
    'slug',      w.slug,
    'logo_url',  w.logo_url,
    'phone',     w.phone,
    'address',   w.address,
    'instagram', w.instagram,
    'tiktok',    w.tiktok,
    'stages',    w.stages,
    -- The "Bayar Sekarang" button: live ToyyibPay keys saved. Never the keys themselves.
    'online_payments', coalesce(w.toyyibpay_secret_set, false)
                       AND coalesce(w.toyyibpay_category_code, '') <> ''
                       AND w.toyyibpay_sandbox IS FALSE)
  FROM public.workshops w
  WHERE w.slug = p_slug
$$;
REVOKE ALL ON FUNCTION public.workshop_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workshop_public(text) TO anon, authenticated;

-- First name plus the initial of the next name. Malay and Indian name particles
-- (bin, binti, bt, a/l, a/p, s/o, d/o) are skipped so the initial is the father's name.
CREATE OR REPLACE FUNCTION public.mask_person_name(p_name text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  WITH n AS (
    SELECT regexp_split_to_array(
             btrim(regexp_replace(
               regexp_replace(coalesce(p_name, ''), '(^|\s)(bin|binti|bte|bt|b\.|bt\.|a/l|a/p|s/o|d/o)(?=\s|$)', ' ', 'gi'),
               '\s+', ' ', 'g')),
             ' ') AS parts
  )
  SELECT CASE
    WHEN parts[1] = '' THEN NULL
    WHEN cardinality(parts) = 1 THEN parts[1]
    ELSE parts[1] || ' ' || upper(left(parts[2], 1)) || '.'
  END
  FROM n
$$;
REVOKE ALL ON FUNCTION public.mask_person_name(text) FROM PUBLIC, anon, authenticated;

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
    'owner',          public.mask_person_name(h.owner),
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


