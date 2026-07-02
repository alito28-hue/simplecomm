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
  return (user.permissions ?? []).includes(perm);
}
