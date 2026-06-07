'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './ads.module.css';

const PLATFORMS = [
  { value: 'META', label: 'Meta (Facebook/Instagram)' },
  { value: 'TIKTOK', label: 'TikTok Ads' },
  { value: 'GOOGLE', label: 'Google Ads' },
  { value: 'OTRO', label: 'Otra plataforma' },
];

interface Campaign {
  id: string;
  platform: string;
  name: string;
  startDate: string;
  endDate: string | null;
  spend: number;
  notes: string | null;
}

interface ExternalRevenue {
  id: string;
  periodStart: string;
  periodEnd: string;
  source: string;
  amount: number;
  notes: string | null;
}

interface Resumen {
  from: string;
  to: string;
  totalInvertido: number;
  ingresosFacturados: number;
  ingresosOtrasFuentes: number;
  ingresoTotal: number;
  roas: number | null;
}

function fmt(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function platformLabel(p: string) {
  return PLATFORMS.find(x => x.value === p)?.label ?? p;
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const EMPTY_CAMPAIGN = { platform: 'META', name: '', startDate: '', endDate: '', spend: '', notes: '' };
const EMPTY_REVENUE = { periodStart: '', periodEnd: '', source: '', amount: '', notes: '' };

export default function AdsPage() {
  const [range, setRange] = useState(currentMonthRange);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [resumenLoading, setResumenLoading] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const [revenues, setRevenues] = useState<ExternalRevenue[]>([]);
  const [revenueForm, setRevenueForm] = useState(EMPTY_REVENUE);
  const [revenueFormOpen, setRevenueFormOpen] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);

  const [error, setError] = useState('');

  const fetchResumen = useCallback(async () => {
    setResumenLoading(true);
    try {
      const res = await fetch(`/api/publicidad/resumen?from=${range.from}&to=${range.to}`);
      if (res.ok) setResumen(await res.json());
    } finally {
      setResumenLoading(false);
    }
  }, [range]);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/publicidad/campanas');
    if (res.ok) { const d = await res.json(); setCampaigns(d.campaigns ?? []); }
  }, []);

  const fetchRevenues = useCallback(async () => {
    const res = await fetch('/api/publicidad/ingresos-externos');
    if (res.ok) { const d = await res.json(); setRevenues(d.revenues ?? []); }
  }, []);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);
  useEffect(() => { fetchCampaigns(); fetchRevenues(); }, [fetchCampaigns, fetchRevenues]);

  function openNewCampaign() {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN);
    setCampaignFormOpen(true);
  }

  function openEditCampaign(c: Campaign) {
    setEditingCampaignId(c.id);
    setCampaignForm({
      platform: c.platform, name: c.name, startDate: c.startDate,
      endDate: c.endDate ?? '', spend: String(c.spend), notes: c.notes ?? '',
    });
    setCampaignFormOpen(true);
  }

  async function saveCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!campaignForm.name.trim() || !campaignForm.startDate) {
      setError('Completá nombre y fecha de inicio de la campaña.');
      return;
    }
    setSavingCampaign(true);
    try {
      const payload = {
        platform: campaignForm.platform,
        name: campaignForm.name,
        startDate: campaignForm.startDate,
        endDate: campaignForm.endDate || undefined,
        spend: parseFloat(campaignForm.spend) || 0,
        notes: campaignForm.notes,
      };
      const url = editingCampaignId ? `/api/publicidad/campanas/${editingCampaignId}` : '/api/publicidad/campanas';
      const method = editingCampaignId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error al guardar'); }
      setCampaignFormOpen(false);
      setCampaignForm(EMPTY_CAMPAIGN);
      setEditingCampaignId(null);
      await Promise.all([fetchCampaigns(), fetchResumen()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSavingCampaign(false); }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('¿Eliminar esta campaña?')) return;
    await fetch(`/api/publicidad/campanas/${id}`, { method: 'DELETE' });
    await Promise.all([fetchCampaigns(), fetchResumen()]);
  }

  async function saveRevenue(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!revenueForm.source.trim() || !revenueForm.periodStart || !revenueForm.periodEnd) {
      setError('Completá fuente y período del ingreso.');
      return;
    }
    setSavingRevenue(true);
    try {
      const payload = {
        periodStart: revenueForm.periodStart,
        periodEnd: revenueForm.periodEnd,
        source: revenueForm.source,
        amount: parseFloat(revenueForm.amount) || 0,
        notes: revenueForm.notes,
      };
      const res = await fetch('/api/publicidad/ingresos-externos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error al guardar'); }
      setRevenueFormOpen(false);
      setRevenueForm(EMPTY_REVENUE);
      await Promise.all([fetchRevenues(), fetchResumen()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSavingRevenue(false); }
  }

  async function deleteRevenue(id: string) {
    if (!confirm('¿Eliminar este registro de ingresos?')) return;
    await fetch(`/api/publicidad/ingresos-externos/${id}`, { method: 'DELETE' });
    await Promise.all([fetchRevenues(), fetchResumen()]);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Publicidad e inversión</h1>
          <p className={styles.pageSubtitle}>Registrá tus campañas de Meta/TikTok y comparalas con lo que realmente facturás.</p>
        </div>
        <div className={styles.filterRow}>
          <div className={styles.dateGroup}>
            <label>Desde</label>
            <input type="date" className="input input-sm" value={range.from}
              onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
          </div>
          <div className={styles.dateGroup}>
            <label>Hasta</label>
            <input type="date" className="input input-sm" value={range.to}
              onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Hallazgos clave */}
      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Inversión en publicidad</div>
          <div className={styles.statValue}>${fmt(resumen?.totalInvertido ?? 0)}</div>
          <div className={styles.statDelta}>Campañas iniciadas en el período</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Facturado en SimpleComm</div>
          <div className={styles.statValue}>${fmt(resumen?.ingresosFacturados ?? 0)}</div>
          <div className={styles.statDelta}>Lo que el sistema ve con certeza</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Otras fuentes (manual)</div>
          <div className={styles.statValue}>${fmt(resumen?.ingresosOtrasFuentes ?? 0)}</div>
          <div className={styles.statDelta}>Otras razones sociales / cuentas</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>ROAS real (ingreso total / inversión)</div>
          <div className={styles.statValue}>
            {resumen?.roas != null ? `${resumen.roas.toFixed(2)}x` : '—'}
          </div>
          <div className={styles.statDelta}>
            Ingreso total: ${fmt(resumen?.ingresoTotal ?? 0)}
          </div>
        </div>
      </div>
      {resumenLoading && <p className="text-muted text-sm">Calculando hallazgos del período...</p>}

      {error && <div className="card" style={{ padding: '0.85rem 1.1rem', borderColor: 'var(--error)', color: 'var(--error)' }}>{error}</div>}

      {/* Campañas */}
      <div className="card">
        <div className={styles.tableHeader}>
          <strong>Campañas registradas</strong>
          <button className="btn btn-primary btn-sm" onClick={openNewCampaign}>+ Nueva campaña</button>
        </div>

        {campaignFormOpen && (
          <form onSubmit={saveCampaign} className={styles.inlineForm}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Plataforma</label>
                <select className="select" value={campaignForm.platform} onChange={e => setCampaignForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Nombre de la campaña</label>
                <input className="input" value={campaignForm.name} onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} placeholder="Black Friday 2026" />
              </div>
              <div className={styles.field}>
                <label>Fecha de inicio</label>
                <input type="date" className="input" value={campaignForm.startDate} onChange={e => setCampaignForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Fecha de fin (opcional)</label>
                <input type="date" className="input" value={campaignForm.endDate} onChange={e => setCampaignForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Inversión ($)</label>
                <input type="number" step="0.01" className="input" value={campaignForm.spend} onChange={e => setCampaignForm(f => ({ ...f, spend: e.target.value }))} placeholder="50000" />
              </div>
              <div className={`${styles.field} ${styles.span2}`}>
                <label>Notas (opcional)</label>
                <input className="input" value={campaignForm.notes} onChange={e => setCampaignForm(f => ({ ...f, notes: e.target.value }))} placeholder="Objetivo, segmentación, etc." />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingCampaign}>
                {savingCampaign ? 'Guardando...' : editingCampaignId ? 'Guardar cambios' : 'Registrar campaña'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCampaignFormOpen(false); setEditingCampaignId(null); setCampaignForm(EMPTY_CAMPAIGN); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {campaigns.length === 0 ? (
          <div className={styles.empty}>Todavía no registraste campañas. Usá &ldquo;+ Nueva campaña&rdquo; para empezar.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Plataforma</th><th>Campaña</th><th>Período</th><th>Inversión</th><th>Notas</th><th></th></tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td><span className="badge">{platformLabel(c.platform)}</span></td>
                    <td><strong>{c.name}</strong></td>
                    <td className="text-sm text-muted">
                      {new Date(c.startDate).toLocaleDateString('es-AR')}
                      {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString('es-AR')}` : ''}
                    </td>
                    <td><strong>${fmt(c.spend)}</strong></td>
                    <td className="text-sm text-muted">{c.notes || '—'}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditCampaign(c)}>Editar</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteCampaign(c.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ingresos de otras fuentes */}
      <div className="card">
        <div className={styles.tableHeader}>
          <div>
            <strong>Ingresos de otras fuentes</strong>
            <p className="text-muted text-sm" style={{ marginTop: '0.2rem' }}>
              Si tu negocio cobra a través de otras razones sociales o cuentas que no facturás en SimpleComm,
              sumalas acá para que el ROAS refleje el ingreso real del negocio.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setRevenueFormOpen(o => !o)}>+ Agregar ingreso</button>
        </div>

        {revenueFormOpen && (
          <form onSubmit={saveRevenue} className={styles.inlineForm}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Desde</label>
                <input type="date" className="input" value={revenueForm.periodStart} onChange={e => setRevenueForm(f => ({ ...f, periodStart: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Hasta</label>
                <input type="date" className="input" value={revenueForm.periodEnd} onChange={e => setRevenueForm(f => ({ ...f, periodEnd: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Fuente / razón social</label>
                <input className="input" value={revenueForm.source} onChange={e => setRevenueForm(f => ({ ...f, source: e.target.value }))} placeholder="Alex Smith CUIL / Cuenta personal" />
              </div>
              <div className={styles.field}>
                <label>Monto ($)</label>
                <input type="number" step="0.01" className="input" value={revenueForm.amount} onChange={e => setRevenueForm(f => ({ ...f, amount: e.target.value }))} placeholder="120000" />
              </div>
              <div className={`${styles.field} ${styles.span2}`}>
                <label>Notas (opcional)</label>
                <input className="input" value={revenueForm.notes} onChange={e => setRevenueForm(f => ({ ...f, notes: e.target.value }))} placeholder="Cómo lo calculaste / de dónde sale" />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingRevenue}>
                {savingRevenue ? 'Guardando...' : 'Agregar'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRevenueFormOpen(false); setRevenueForm(EMPTY_REVENUE); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {revenues.length === 0 ? (
          <div className={styles.empty}>No agregaste ingresos de otras fuentes todavía.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Período</th><th>Fuente</th><th>Monto</th><th>Notas</th><th></th></tr>
              </thead>
              <tbody>
                {revenues.map(r => (
                  <tr key={r.id}>
                    <td className="text-sm text-muted">
                      {new Date(r.periodStart).toLocaleDateString('es-AR')} – {new Date(r.periodEnd).toLocaleDateString('es-AR')}
                    </td>
                    <td><strong>{r.source}</strong></td>
                    <td><strong>${fmt(r.amount)}</strong></td>
                    <td className="text-sm text-muted">{r.notes || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteRevenue(r.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.comingSoon} style={{ minHeight: 'auto' }}>
        <div className={styles.comingSoonBox} style={{ maxWidth: '100%' }}>
          <div className={styles.comingSoonIcon}>🔌</div>
          <h2 className={styles.comingSoonTitle}>Próximamente: conexión automática</h2>
          <p className={styles.comingSoonDesc}>
            Estamos trabajando para conectar directamente tus cuentas de Meta Ads y TikTok Ads,
            así la inversión se carga sola y el ROAS se actualiza en tiempo real — sin cargar nada a mano.
          </p>
        </div>
      </div>
    </div>
  );
}
