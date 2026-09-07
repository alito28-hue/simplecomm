'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export interface PlanCard {
  name: string;
  eyebrow: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

const ANNUAL_DISCOUNT = 0.2;

export default function PricingSection({ plans }: { plans: PlanCard[] }) {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className={styles.billingToggle}>
        <button
          type="button"
          className={`${styles.billingBtn} ${!annual ? styles.billingBtnActive : ''}`}
          onClick={() => setAnnual(false)}
        >
          Pago mensual
        </button>
        <button
          type="button"
          className={`${styles.billingBtn} ${annual ? styles.billingBtnActive : ''}`}
          onClick={() => setAnnual(true)}
        >
          Pago anual
        </button>
        <span className={styles.billingBadge}>Ahorrá {ANNUAL_DISCOUNT * 100}%</span>
      </div>

      <div className={styles.plans}>
        {plans.map((plan) => {
          const price = plan.monthlyPrice === 0
            ? 0
            : annual
              ? Math.round(plan.monthlyPrice * (1 - ANNUAL_DISCOUNT))
              : plan.monthlyPrice;

          return (
            <article
              className={`${styles.planCard} ${plan.highlighted ? styles.planHighlighted : ''}`}
              key={plan.name}
            >
              {plan.badge && (
                <div className={`${styles.planBadge} ${plan.name === 'Gratis' ? styles.planBadgeFree : ''}`}>
                  {plan.badge}
                </div>
              )}

              <p className={styles.planEyebrow}>{plan.eyebrow}</p>
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planDesc}>{plan.description}</p>

              <div className={styles.priceWrap}>
                <span className={styles.price}>{money(price)}</span>
                <span className={styles.period}>/mes{annual && plan.monthlyPrice > 0 ? ', pago anual' : ''}</span>
              </div>

              <ul className={styles.planFeatures}>
                {plan.features.map((feature) => (
                  <li key={feature}><span>✓</span>{feature}</li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-outline'} ${styles.planCta}`}
              >
                {plan.cta}
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
