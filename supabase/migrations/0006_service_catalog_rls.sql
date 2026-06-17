-- ============================================================================
-- SECURITY: enable RLS on the service catalog tables (flagged by Supabase as
-- rls_disabled_in_public — anyone with the anon key could read/write/delete them).
-- The catalog is owner-managed in the Dashboard; scope each table to the owner's
-- workshop. categories/items carry workshop_id; variants are scoped via item_id.
-- Idempotent — safe to run once.
-- ============================================================================

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_service_categories" ON service_categories
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_service_items" ON service_items
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE service_variants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_service_variants" ON service_variants
    FOR ALL USING (
      item_id IN (
        SELECT id FROM service_items
        WHERE workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
