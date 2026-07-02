'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function GlobalBackBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/dashboard') return null;

  return (
    <button
      onClick={() => router.back()}
      style={{
        fontSize: '0.85rem',
        color: 'var(--blue)',
        fontWeight: 500,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        marginBottom: '0.85rem',
        fontFamily: 'inherit',
      }}
    >
      ← Volver
    </button>
  );
}
