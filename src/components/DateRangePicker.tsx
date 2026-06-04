'use client';

import styles from './DateRangePicker.module.css';

export default function DateRangePicker() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(today.getMonth() - 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>📅</span>
      <span className={styles.label}>{fmt(monthAgo)} - {fmt(today)}</span>
      <span className={styles.chevron}>▾</span>
    </div>
  );
}
