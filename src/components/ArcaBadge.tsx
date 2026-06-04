import styles from './ArcaBadge.module.css';

interface ArcaBadgeProps {
  connected?: boolean;
}

export default function ArcaBadge({ connected = false }: ArcaBadgeProps) {
  return (
    <div className={`${styles.badge} ${connected ? styles.connected : styles.disconnected}`}>
      <span className={styles.dot}></span>
      ARCA {connected ? 'conectado' : 'no conectado'}
    </div>
  );
}
