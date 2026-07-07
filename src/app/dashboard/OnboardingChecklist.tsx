'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface Step {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [allDone, setAllDone] = useState(true);

  useEffect(() => {
    function load() {
      fetch('/api/dashboard/onboarding')
        .then(r => r.json())
        .then(data => {
          setSteps(data.steps ?? []);
          setAllDone(data.allDone ?? true);
        })
        .catch(() => {});
    }
    load();
    window.addEventListener('onboarding:refresh', load);
    return () => window.removeEventListener('onboarding:refresh', load);
  }, []);

  if (allDone || steps.length === 0) return null;

  return (
    <div className={`card ${styles.onboardingCard}`}>
      <div className={styles.onboardingHeader}>
        <span className={styles.onboardingTitle}>🚀 Primeros pasos</span>
        <span className={styles.onboardingProgress}>
          {steps.filter(s => s.done).length}/{steps.length} completados
        </span>
      </div>
      <div className={styles.onboardingSteps}>
        {steps.map(step => (
          <div key={step.id} className={`${styles.onboardingStep} ${step.done ? styles.stepDone : ''}`}>
            <span className={styles.stepCheck}>{step.done ? '✓' : '○'}</span>
            <span className={styles.stepLabel}>{step.label}</span>
            {!step.done && (
              <Link href={step.href} className={styles.stepLink}>
                {step.id === 'factura' ? 'Emitir →' : step.id === 'importar-arca' ? 'Importar →' : 'Configurar →'}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
