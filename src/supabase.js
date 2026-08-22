import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wifsyvutfjlbhogdvrgs.supabase.co'
const SUPABASE_KEY = 'sb_publishable__2Q_mo1gZBsPjQHKtSKtUg_Y1kPbf2T'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)