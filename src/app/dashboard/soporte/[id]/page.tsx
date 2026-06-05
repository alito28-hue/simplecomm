'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './ticket.module.css';

interface Message { id: string; userId: string; isAdmin: boolean; message: string; createdAt: string; }
interface Ticket { id: string; subject: string; status: string; priority: string; createdAt: string; }

export default function UserTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    const d = await fetch(`/api/soporte/tickets/${id}`).then(r => r.json());
    setTicket(d.ticket);
    setMessages(d.messages ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/soporte/tickets/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTicket(d.ticket);
        setMessages(d.messages ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function send() {
    if (!reply.trim() || sending) return;
    setSending(true);
    await fetch(`/api/soporte/tickets/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply }),
    });
    setReply('');
    await load();
    setSending(false);
  }

  if (!ticket) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/soporte" className={styles.back}>← Volver a Soporte</Link>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{ticket.subject}</h1>
          <p className="text-muted text-sm">{new Date(ticket.createdAt).toLocaleDateString('es-AR')}</p>
        </div>
        <span className={`badge ${ticket.status === 'open' ? 'badge-error' : ticket.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>
          {ticket.status === 'open' ? 'Abierto' : ticket.status === 'in_progress' ? 'En trámite' : 'Cerrado'}
        </span>
      </div>

      <div className={`card ${styles.chat}`}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.msg} ${m.isAdmin ? styles.adminMsg : styles.userMsg}`}>
            <div className={styles.msgLabel}>{m.isAdmin ? '👑 Soporte SimpleComm' : '👤 Vos'}</div>
            <div className={styles.msgBubble}>{m.message}</div>
            <div className={styles.msgTime}>{new Date(m.createdAt).toLocaleString('es-AR')}</div>
          </div>
        ))}
        {messages.length === 0 && <p className="text-muted text-sm" style={{ padding: '1rem' }}>Sin mensajes aún.</p>}
      </div>

      {ticket.status !== 'closed' && (
        <div className={`card ${styles.replyCard}`}>
          <textarea className="input" rows={3} value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Escribí tu respuesta o consulta adicional..." />
          <button className="btn btn-primary" onClick={send} disabled={sending || !reply.trim()}>
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  );
}
