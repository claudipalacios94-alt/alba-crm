// ══════════════════════════════════════════════════════════════
// ALBA CRM — Cliente Supabase
// Un solo cliente compartido por todos los hooks
// ══════════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
