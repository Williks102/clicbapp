#!/usr/bin/env node
/**
 * Crée ou promeut un compte administrateur.
 *
 * Usage :
 *   node scripts/create-admin.mjs <email> <mot-de-passe> ["Nom complet"]
 *
 * Nécessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 * (chargés depuis .env s'il existe).
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const [email, password, name = 'Administrateur'] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage : node scripts/create-admin.mjs <email> <mot-de-passe> ["Nom"]');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Le mot de passe doit contenir au moins 8 caractères.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies.'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const passwordHash = await bcrypt.hash(password, 12);

const { data: existing, error: readError } = await supabase
  .from('users')
  .select('id, role')
  .eq('email', email)
  .maybeSingle();

if (readError) {
  console.error('❌ Lecture impossible :', readError.message);
  process.exit(1);
}

if (existing) {
  // Le compte existe déjà : on le promeut et on réinitialise son mot de passe.
  const { error } = await supabase
    .from('users')
    .update({ role: 'admin', password_hash: passwordHash, disabled: false, deleted: false })
    .eq('id', existing.id);

  if (error) {
    console.error('❌ Promotion impossible :', error.message);
    process.exit(1);
  }

  console.log(`✅ Compte ${email} promu administrateur (mot de passe réinitialisé).`);
  process.exit(0);
}

const { data: created, error } = await supabase
  .from('users')
  .insert({ name, email, password_hash: passwordHash, role: 'admin' })
  .select('id')
  .single();

if (error) {
  console.error('❌ Création impossible :', error.message);
  process.exit(1);
}

console.log(`✅ Administrateur créé : ${email} (id ${created.id})`);
