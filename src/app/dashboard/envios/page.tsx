'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../organizacion/clientes/clientes.module.css';

interface Client {
  id: string;
  businessName: string;
  docNumber: string;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingFloor: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingZipCode: string | null;
}

interface Shipment {
  id: string;
  enviopackEnvioId: string;
  trackingNumber: string | null;
  estado: string;
  costoEnvio: number | null;
  createdAt: string;
}

interface Cotizacion {
  correo: string;
  valor: number;
  horasEntrega: number | null;
  servicio: string;
  modalidad: 'D' | 'S';
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'badge-warning',
  B: 'badge-warning',
  C: 'badge-blue',
  E: 'badge-success',
  P: 'badge-error',
};

export default function EnviosPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [destinatario, setDestinatario] = useState({ calle: '', numero: '', piso: '', codigoPostal: '', provinciaId: '', localidadId: '' });
  const [paquete, setPaquete] = useState({ pesoKg: '', altoCm: '', anchoCm: '', profundidadCm: '' });
  const [cotizando, setCotizando] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<{ aDomicilio: Cotizacion[]; aSucursal: Cotizacion[] } | null>(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  function loadShipments() {
    fetch('/api/envios').then(r => r.json()).then(d => setShipments(Array.isArray(d) ? d : [])).catch(() => {});
  }

  useEffect(() => {
    fetch('/api/integraciones/enviopack/status').then(r => r.json()).then(d => setConnected(!!d.connected)).catch(() => setConnected(false));
    loadShipments();
  }, []);

  useEffect(() => {
    if (clientQuery.length < 2) return;
    fetch(`/api/clientes?q=${encodeURIComponent(clientQuery)}`).then(r => r.json()).then(setClients).catch(() => {});
  }, [clientQuery]);

  function pickClient(c: Client) {
    setSelectedClient(c);
    setClientQuery(c.businessName);
    setClients([]);
    setDestinatario(d => ({
      ...d,
      calle: c.shippingStreet ?? '',
      numero: c.shippingNumber ?? '',
      piso: c.shippingFloor ?? '',
      codigoPostal: c.shippingZipCode ?? '',
    }));
    setCotizaciones(null);
  }

  async function cotizar() {
    setError(''); setCotizaciones(null);
    if (!destinatario.provinciaId || !destinatario.codigoPostal) {
      setError('Falta el ID de provincia (Envíopack) y el código postal.');
      return;
    }
    if (!paquete.pesoKg || !paquete.altoCm || !paquete.anchoCm || !paquete.profundidadCm) {
      setError('Completá peso y dimensiones del paquete.');
      return;
    }
    setCotizando(true);
    try {
      const res = await fetch('/api/envios/cotizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provinciaId: destinatario.provinciaId,
          codigoPostal: destinatario.codigoPostal,
          localidadId: destinatario.localidadId || undefined,
          paquetes: [{
            pesoKg: parseFloat(paquete.pesoKg), altoCm: parseFloat(paquete.altoCm),
            anchoCm: parseFloat(paquete.anchoCm), profundidadCm: parseFloat(paquete.profundidadCm),
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCotizaciones(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cotizar');
    } finally {
      setCotizando(false);
    }
  }

  async function generarGuia(cot: Cotizacion, correoId: string) {
    if (!selectedClient && !destinatario.calle) { setError('Elegí un cliente o completá la dirección.'); return; }
    setError(''); setCreando(true);
    try {
      const res = await fetch('/api/envios/crear', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          destinatario: {
            nombre: selectedClient?.businessName ?? clientQuery,
            calle: destinatario.calle,
            numero: destinatario.numero,
            piso: destinatario.piso || undefined,
            codigoPostal: destinatario.codigoPostal,
            provinciaId: destinatario.provinciaId,
            localidadId: destinatario.localidadId,
          },
          paquetes: [{
            pesoKg: parseFloat(paquete.pesoKg), altoCm: parseFloat(paquete.altoCm),
            anchoCm: parseFloat(paquete.anchoCm), profundidadCm: parseFloat(paquete.profundidadCm),
          }],
          servicio: cot.servicio,
          correoId,
          modalidad: cot.modalidad,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Envío creado. Tracking: ${data.trackingNumber ?? data.envioId}`);
      setCotizaciones(null);
      loadShipments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar la guía');
    } finally {
      setCreando(false);
    }
  }

  async function verEtiqueta(shipmentId: string) {
    const res = await fetch(`/api/envios/${shipmentId}/etiqueta`);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
    else alert(data.error ?? 'No se pudo obtener la etiqueta');
  }

  if (connected === false) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Envíos</h1>
            <p className={styles.pageSubtitle}>Conectá Envíopack para cotizar y generar guías.</p>
          </div>
        </div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>Todavía no conectaste Envíopack.</p>
          <Link href="/dashboard/integraciones/enviopack" className="btn btn-primary">Conectar Envíopack →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Envíos</h1>
          <p className={styles.pageSubtitle}>Cotizá y generá guías de envío con Envíopack.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>Nuevo envío</h2>
        {error && <p className="text-sm" style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ position: 'relative', maxWidth: 320, marginBottom: '0.75rem' }}>
          <label className="text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cliente</label>
          <input className="input" value={clientQuery} onChange={e => { setClientQuery(e.target.value); setSelectedClient(null); }} placeholder="Buscar cliente..." />
          {clientQuery.length >= 2 && clients.length > 0 && (
            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
              {clients.map(c => (
                <button key={c.id} onClick={() => pickClient(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>
                  {c.businessName} <span className="text-sm text-muted">{c.docNumber}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div><label className="text-sm">Calle</label><input className="input" value={destinatario.calle} onChange={e => setDestinatario(d => ({ ...d, calle: e.target.value }))} /></div>
          <div><label className="text-sm">Número</label><input className="input" value={destinatario.numero} onChange={e => setDestinatario(d => ({ ...d, numero: e.target.value }))} /></div>
          <div><label className="text-sm">Piso/Depto</label><input className="input" value={destinatario.piso} onChange={e => setDestinatario(d => ({ ...d, piso: e.target.value }))} /></div>
          <div><label className="text-sm">Código Postal</label><input className="input" value={destinatario.codigoPostal} onChange={e => setDestinatario(d => ({ ...d, codigoPostal: e.target.value }))} /></div>
          <div>
            <label className="text-sm">ID Provincia (Envíopack)</label>
            <input className="input" value={destinatario.provinciaId} onChange={e => setDestinatario(d => ({ ...d, provinciaId: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm">ID Localidad (opcional, para sucursal)</label>
            <input className="input" value={destinatario.localidadId} onChange={e => setDestinatario(d => ({ ...d, localidadId: e.target.value }))} />
          </div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
          Los IDs de provincia/localidad son los que usa Envíopack internamente (no el nombre) — se pueden consultar vía <code>/api/envios/provincias</code> una vez conectada la cuenta.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
          <div><label className="text-sm">Peso (kg)</label><input className="input" type="number" step="0.01" value={paquete.pesoKg} onChange={e => setPaquete(p => ({ ...p, pesoKg: e.target.value }))} /></div>
          <div><label className="text-sm">Alto (cm)</label><input className="input" type="number" step="0.1" value={paquete.altoCm} onChange={e => setPaquete(p => ({ ...p, altoCm: e.target.value }))} /></div>
          <div><label className="text-sm">Ancho (cm)</label><input className="input" type="number" step="0.1" value={paquete.anchoCm} onChange={e => setPaquete(p => ({ ...p, anchoCm: e.target.value }))} /></div>
          <div><label className="text-sm">Profundidad (cm)</label><input className="input" type="number" step="0.1" value={paquete.profundidadCm} onChange={e => setPaquete(p => ({ ...p, profundidadCm: e.target.value }))} /></div>
        </div>

        <button className="btn btn-primary btn-sm" onClick={cotizar} disabled={cotizando}>{cotizando ? 'Cotizando...' : 'Cotizar envío'}</button>

        {cotizaciones && (
          <div style={{ marginTop: '1rem' }}>
            {[...cotizaciones.aDomicilio, ...cotizaciones.aSucursal].length === 0 ? (
              <p className="text-sm text-muted">Sin cotizaciones disponibles para ese destino.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Correo</th><th>Modalidad</th><th>Valor</th><th>Entrega</th><th></th></tr></thead>
                  <tbody>
                    {[...cotizaciones.aDomicilio, ...cotizaciones.aSucursal].map((c, i) => (
                      <tr key={i}>
                        <td>{c.correo}</td>
                        <td>{c.modalidad === 'D' ? 'A domicilio' : 'A sucursal'}</td>
                        <td><strong>{money(c.valor)}</strong></td>
                        <td className="text-sm text-muted">{c.horasEntrega ? `${c.horasEntrega}hs` : '—'}</td>
                        <td><button className="btn btn-primary btn-sm" onClick={() => generarGuia(c, c.correo)} disabled={creando}>Generar guía</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Envío Envíopack</th><th>Tracking</th><th>Estado</th><th>Costo</th><th></th></tr></thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin envíos generados todavía.</td></tr>
              ) : shipments.map(s => (
                <tr key={s.id}>
                  <td className="text-sm text-muted">{new Date(s.createdAt).toLocaleDateString('es-AR')}</td>
                  <td className="mono text-sm">{s.enviopackEnvioId}</td>
                  <td className="text-sm">{s.trackingNumber ?? '—'}</td>
                  <td><span className={`badge ${ESTADO_BADGE[s.estado] ?? 'badge-gray'}`}>{s.estado}</span></td>
                  <td>{s.costoEnvio != null ? money(s.costoEnvio) : '—'}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => verEtiqueta(s.id)}>📄 Etiqueta</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
