'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './ticket.module.css';

interface Message { id: string; userId: string; isAdmin: boolean; message: string; createdAt: string; }
interface Ticket { id: string; subject: string; status: string; priority: string; createdAt: string; organizationId: string; }

export default function AdminTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tickets/${id}`)
      .then(r => r.json())
      .then(d => { setTicket(d.ticket); setMessages(d.messages); });
  }, [id]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    await fetch(`/api/admin/tickets/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply }),
    });
    setReply('');
    const d = await fetch(`/api/admin/tickets/${id}`).then(r => r.json());
    setMessages(d.messages);
    setSending(false);
  }

  async function changeStatus(status: string) {
    await fetch(`/api/admin/tickets/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setTicket(t => t ? { ...t, status } : t);
  }

  if (!ticket) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <Link href="/mayor/tickets" className={styles.back}>← Volver a Tickets</Link>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{ticket.subject}</h1>
          <p className="text-muted text-sm">{new Date(ticket.createdAt).toLocaleDateString('es-AR')}</p>
        </div>
        <div className={styles.actions}>
          <span className={`badge ${ticket.status === 'open' ? 'badge-error' : ticket.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>
            {ticket.status === 'open' ? 'Abierto' : ticket.status === 'in_progress' ? 'En trámite' : 'Cerrado'}
          </span>
          {ticket.status !== 'in_progress' && <button className="btn btn-outline btn-sm" onClick={() => changeStatus('in_progress')}>Marcar en trámite</button>}
          {ticket.status !== 'closed' && <button className="btn btn-ghost btn-sm" onClick={() => changeStatus('closed')}>Cerrar</button>}
          {ticket.status === 'closed' && <button className="btn btn-primary btn-sm" onClick={() => changeStatus('open')}>Reabrir</button>}
        </div>
      </div>

      <div className={`card ${styles.chat}`}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.msg} ${m.isAdmin ? styles.adminMsg : styles.userMsg}`}>
            <div className={styles.msgLabel}>{m.isAdmin ? '👑 Admin' : '👤 Cliente'}</div>
            <div className={styles.msgBubble}>{m.message}</div>
            <div className={styles.msgTime}>{new Date(m.createdAt).toLocaleString('es-AR')}</div>
          </div>
        ))}
        {messages.length === 0 && <p className="text-muted text-sm" style={{ padding: '1rem' }}>Sin mensajes aún.</p>}
      </div>

      <div className={`card ${styles.replyCard}`}>
        <textarea className="input" rows={4} value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Escribí tu respuesta..." />
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? 'Enviando...' : 'Enviar respuesta'}
        </button>
      </div>
    </div>
  );
}
