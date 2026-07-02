export const PERMISSIONS = [
  { key: 'manage_invoices', label: 'Emitir y ver facturas' },
  { key: 'manage_clients',  label: 'Gestionar contactos' },
  { key: 'manage_products', label: 'Gestionar productos, precios y stock' },
  { key: 'view_reports',    label: 'Ver reportes' },
  { key: 'manage_settings', label: 'Configuración de la organización' },
] as const;

export type PermissionKey = typeof PERMISSIONS[number]['key'];

export function hasPermission(user: { role: string; permissions?: string[] | null }, perm: PermissionKey): boolean {
  if (user.role === 'ADMIN') return true;
  const perms = user.permissions ?? [];
  // Sin permisos configurados todavía = acceso completo (compatibilidad con usuarios
  // invitados antes de que existiera este sistema de permisos granulares). Un admin
  // recién restringe el acceso cuando le asigna explícitamente al menos un permiso.
  if (perms.length === 0) return true;
  return perms.includes(perm);
}
