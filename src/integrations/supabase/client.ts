import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ozgabrxhdyhfsizprray.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Z2FicnhoZHloZnNpenBycmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMDEwNTAsImV4cCI6MjA4MTc3NzA1MH0.BNwyzUPj86641UlIDaoH7xm0wujBM5ldo0XRpT5awNE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
