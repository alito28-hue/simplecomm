import { createClient } from '@supabase/supabase-js';

const EMAIL = 'blootienda.ar@gmail.com';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function main() {
  const user = await findUserByEmail(EMAIL);

  if (!user) {
    console.log(`No se encontró ningún usuario con el email ${EMAIL}.`);
    return;
  }

  console.log(`Usuario encontrado: ${user.id} (${user.email})`);

  const { data: org } = await supabase
    .from('organizations')
    .select('name, cuit')
    .eq('id', user.id)
    .maybeSingle();

  if (org) {
    console.log(`⚠️  Esta cuenta tiene una organización asociada: "${org.name}" (CUIT: ${org.cuit ?? '—'}).`);
    console.log('   Al borrar el usuario, ese registro y todo lo vinculado a él se eliminan en cascada.');
  } else {
    console.log('No tiene organización asociada todavía — se puede borrar sin pérdida de datos.');
  }

  const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
  if (delError) throw delError;

  console.log(`✅ Usuario ${EMAIL} eliminado. Ya podés registrarte de nuevo con el email correcto.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
