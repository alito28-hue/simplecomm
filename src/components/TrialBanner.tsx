import Link from 'next/link';
import styles from './TrialBanner.module.css';

interface TrialBannerProps {
  daysLeft: number;
}

export default function TrialBanner({ daysLeft }: TrialBannerProps) {
  if (daysLeft <= 0) return null;

  return (
    <div className={styles.banner}>
      Estás usando tu período de prueba gratuito. Te quedan {daysLeft} días{' '}
      <Link href="/dashboard/suscripcion" className={styles.btn}>
        Suscribite
      </Link>
    </div>
  );
}
