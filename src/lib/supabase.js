import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://nociphzezdjzumznesya.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY2lwaHplemRqenVtem5lc3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzM4MjAsImV4cCI6MjA5MTQwOTgyMH0.0WZxfZE8I2cZHAG55N2XMxdxYTpsh06yqtcpBxB5RIQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
