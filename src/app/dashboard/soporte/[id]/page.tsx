'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './ticket.module.css';

interface Message { id: string; userId: string; isAdmin: boolean; message: string; createdAt: string; }
interface Ticket { id: string; subject: string; status: string; priority: string; createdAt: string; }

function statusLabel(s: string) {
  if (s === 'open') return 'Abierto';
  if (s === 'in_progress') return 'En trámite';
  return 'Cerrado';
}

function statusBadge(s: string) {
  if (s === 'open') return 'badge-error';
  if (s === 'in_progress') return 'badge-warning';
  return 'badge-success';
}

export default function UserTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 50);
  }

  async function load() {
    const d = await fetch(`/api/soporte/tickets/${id}`).then(r => r.json());
    setTicket(d.ticket);
    setMessages(d.messages ?? []);
    scrollToBottom();
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/soporte/tickets/${id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setTicket(d.ticket);
        setMessages(d.messages ?? []);
        scrollToBottom();
      });
    return () => { cancelled = true; };
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  }

  if (!ticket) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/soporte" className={styles.back}>← Volver a Soporte</Link>

      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{ticket.subject}</h1>
          <p className={styles.meta}>
            Creado el {new Date(ticket.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`badge ${statusBadge(ticket.status)}`}>
          {statusLabel(ticket.status)}
        </span>
      </div>

      <div className={`card ${styles.chat}`} ref={chatRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>Sin mensajes aún.</div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`${styles.msg} ${m.isAdmin ? styles.adminMsg : styles.userMsg}`}>
            <div className={styles.msgLabel}>
              {m.isAdmin ? '👑 Soporte SimpleComm' : '👤 Vos'}
            </div>
            <div className={styles.msgBubble}>{m.message}</div>
            <div className={styles.msgTime}>
              {new Date(m.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' ? (
        <div className={`card ${styles.replyCard}`}>
          <textarea
            className="input"
            rows={3}
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu respuesta... (Ctrl+Enter para enviar)"
          />
          <div className={styles.replyActions}>
            <button className="btn btn-primary" onClick={send} disabled={sending || !reply.trim()}>
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`card ${styles.replyCard}`}>
          <p className={styles.closedNotice}>Este ticket está cerrado. Si necesitás más ayuda, abrí uno nuevo.</p>
        </div>
      )}
    </div>
  );
}
