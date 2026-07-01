'use client';

import { useState } from 'react';

export default function VerificarArcaButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function verificar() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/organizaciones/${orgId}/verificar-afip`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
      if (data.ok) setTimeout(() => window.location.reload(), 1200);
    } catch {
      setResult({ ok: false, error: 'Error de red' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button type="button" className="btn btn-outline btn-sm" onClick={verificar} disabled={loading}>
        {loading ? 'Consultando ARCA...' : 'Verificar relación ahora'}
      </button>
      {result && (
        <p className="text-sm" style={{ marginTop: '0.5rem', color: result.ok ? 'var(--success)' : 'var(--error)' }}>
          {result.ok ? '✅ ARCA reconoce la relación. Ya puede facturar.' : `❌ ${result.error}`}
        </p>
      )}
    </div>
  );
}
