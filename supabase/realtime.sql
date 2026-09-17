-- LimeLeaf / Green Restaurants - Supabase Realtime setup
-- Run once in Supabase SQL Editor.
-- This only adds existing tables to the built-in supabase_realtime publication.

DO $$
DECLARE
    table_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RAISE EXCEPTION 'Publication supabase_realtime was not found';
    END IF;

    FOREACH table_name IN ARRAY ARRAY['orders', 'order_items', 'deliveries', 'tracking_events']
    LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL
           AND NOT EXISTS (
               SELECT 1
               FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime'
                 AND schemaname = 'public'
                 AND tablename = table_name
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
        END IF;
    END LOOP;
END $$;

-- Verify enabled tables.
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('orders', 'order_items', 'deliveries', 'tracking_events')
ORDER BY tablename;

-- Check whether RLS is enabled. If RLS is ON, the frontend anon/publishable key
-- must have a suitable SELECT policy to receive Postgres Changes.
-- Do NOT create a broad public SELECT policy for customer/order data just to make
-- Realtime work; use an authorization design appropriate for production.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('orders', 'order_items', 'deliveries', 'tracking_events')
ORDER BY c.relname;
