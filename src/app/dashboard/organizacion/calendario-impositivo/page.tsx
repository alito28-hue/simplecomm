'use client';

import { useEffect, useState } from 'react';
import styles from '../clientes/clientes.module.css';

const GRUPOS: { digitos: string; label: string }[] = [
  { digitos: '0,1', label: 'Grupo 1' },
  { digitos: '2,3', label: 'Grupo 2' },
  { digitos: '4,5', label: 'Grupo 3' },
  { digitos: '6,7', label: 'Grupo 4' },
  { digitos: '8,9', label: 'Grupo 5' },
];

interface Recordatorio { id: string; texto: string; }
const STORAGE_KEY = 'simplecomm_recordatorios_impositivos';

export default function CalendarioImpositivoPage() {
  const [cuit, setCuit] = useState('');
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(d => setCuit((d?.cuit ?? '').replace(/\D/g, '')))
      .catch(() => {});
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecordatorios(JSON.parse(raw));
    } catch {}
  }, []);

  function save(next: Recordatorio[]) {
    setRecordatorios(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addRecordatorio() {
    if (!texto.trim()) return;
    save([...recordatorios, { id: crypto.randomUUID(), texto: texto.trim() }]);
    setTexto('');
  }

  function removeRecordatorio(id: string) {
    save(recordatorios.filter(r => r.id !== id));
  }

  const lastDigit = cuit ? cuit.slice(-1) : null;
  const grupo = lastDigit ? GRUPOS.find(g => g.digitos.split(',').includes(lastDigit)) : null;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Calendario de Vencimientos</h1>
          <p className={styles.pageSubtitle}>Recordatorios impositivos. Las fechas exactas las define ARCA cada mes según terminación de CUIT.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Tu grupo de vencimiento</h2>
        {lastDigit ? (
          <p className="text-sm">
            Tu CUIT termina en <strong>{lastDigit}</strong> → correspondés al <strong>{grupo?.label}</strong> según la agrupación estándar de ARCA por terminación de CUIT.
          </p>
        ) : (
          <p className="text-sm text-muted">Completá el CUIT de tu empresa en Configuración → Empresa para ver tu grupo.</p>
        )}
        <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
          ⚠️ El día exacto de cada vencimiento (IVA, Monotributo, Ganancias, etc.) varía mes a mes y según el régimen — no lo mostramos acá para evitar errores.
          Consultalo siempre en el calendario oficial de ARCA.
        </p>
        <a
          href="https://www.afip.gob.ar/genericos/guiaDeTramites/calendarioFiscal.asp"
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-sm"
          style={{ marginTop: '0.75rem', display: 'inline-block' }}
        >
          Ver calendario oficial de ARCA ↗
        </a>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Tus recordatorios</h2>
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
          Notas propias para no olvidarte de vencimientos (se guardan solo en este navegador).
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input className="input" value={texto} onChange={e => setTexto(e.target.value)}
            placeholder="Ej: IVA mensual — día 18" style={{ maxWidth: 320 }}
            onKeyDown={e => e.key === 'Enter' && addRecordatorio()} />
          <button className="btn btn-primary btn-sm" onClick={addRecordatorio} disabled={!texto.trim()}>+ Agregar</button>
        </div>
        {recordatorios.length === 0 ? (
          <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Sin recordatorios aún.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {recordatorios.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.7rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <span className="text-sm">🔔 {r.texto}</span>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeRecordatorio(r.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
