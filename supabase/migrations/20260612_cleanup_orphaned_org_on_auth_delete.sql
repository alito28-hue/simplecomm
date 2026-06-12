-- Cuando se borra un usuario de Supabase Auth (p.ej. una cuenta de prueba
-- abandonada a mitad de onboarding), borra en cascada su organización si
-- todavía está en TRIAL. Esto libera el CUIT/CUIL para que pueda volver a
-- registrarse sin chocar con "organizations_cuit_key". Las organizaciones
-- ACTIVE (clientes reales) nunca se tocan.

create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from organizations
  where id = old.id::text
    and "subscriptionStatus" = 'TRIAL';
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row
  execute function public.handle_auth_user_deleted();
