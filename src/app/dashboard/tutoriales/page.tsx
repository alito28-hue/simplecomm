import styles from './tutoriales.module.css';
import Link from 'next/link';

const CATEGORIES = [
  { icon: '🚀', title: 'Getting Started',       desc: 'The fundamentals to get your shop running in minutes.' },
  { icon: '⚡', title: 'Invoice Automation',     desc: 'Setup complex billing cycles and automatic payments.' },
  { icon: '🔗', title: 'Platform Connections',  desc: 'Sync with Shopify, Amazon, and ERP systems.' },
  { icon: '🔧', title: 'Troubleshooting',        desc: 'Resolve common API and integration sync errors.' },
];

const TUTORIALS = [
  {
    tag: 'BEGINNER', tagColor: 'success',
    title: 'Setting Up Your First Merchant Account',
    desc: 'Learn how to configure your bank accounts and verify your identity fo...',
    updated: '2 days ago', views: '1.3k', type: 'video',
  },
  {
    tag: 'INTERMEDIATE', tagColor: 'warning',
    title: 'Advanced Invoicing Logic: Conditional Triggers',
    desc: 'Deep dive into setting up automated triggers based on customer behavio...',
    readTime: '9 min read', type: 'article',
  },
  {
    tag: 'EXPERT', tagColor: 'error',
    title: 'API Sync: Resolving Webhook Latency',
    desc: 'Technical walkthrough on optimizing your API endpoints for real time...',
    updated: 'recent', type: 'video',
  },
];

export default function TutorialesPage() {
  return (
    <div className={styles.page}>
      {/* Search header */}
      <div className={styles.heroSection}>
        <div className={styles.heroSearch}>
          <span className={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Search tutorials, help articles, or videos..."
            className={styles.searchInput} />
        </div>
        <h1 className={styles.heroTitle}>How can we help you scale today?</h1>
        <p className={styles.heroSubtitle}>
          Explore our comprehensive guide of tutorials and documentation designed to
          help you master SimpleComm&apos;s e-commerce operations suite.
        </p>
      </div>

      {/* Categories */}
      <div className={styles.categoriesGrid}>
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className={`card ${styles.catCard}`}>
            <div className={styles.catIcon}>{cat.icon}</div>
            <h3 className={styles.catTitle}>{cat.title}</h3>
            <p className={styles.catDesc}>{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Latest tutorials */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Latest Tutorials</h2>
          <p className={styles.sectionSub}>Curated content to improve your operational efficiency.</p>
        </div>
        <div className={styles.viewToggle}>
          <button className={`${styles.toggleBtn} ${styles.active}`}>Grid</button>
          <button className={styles.toggleBtn}>List</button>
        </div>
      </div>

      <div className={styles.tutGrid}>
        {TUTORIALS.map((tut) => (
          <div key={tut.title} className={`card ${styles.tutCard}`}>
            <div className={`${styles.tutThumb} ${tut.type === 'video' ? styles.videoThumb : styles.articleThumb}`}>
              {tut.type === 'video' && <div className={styles.playBtn}>▶</div>}
              <span className={`badge badge-${tut.tagColor}`}>{tut.tag}</span>
            </div>
            <div className={styles.tutBody}>
              {tut.updated && <span className={styles.tutMeta}>🕐 Updated {tut.updated}</span>}
              {tut.readTime && <span className={styles.tutMeta}>📖 {tut.readTime}</span>}
              <h3 className={styles.tutTitle}>{tut.title}</h3>
              <p className={styles.tutDesc}>{tut.desc}</p>
              <div className={styles.tutActions}>
                {tut.type === 'video'
                  ? <button className="btn btn-outline btn-sm">▶ Watch Tutorial</button>
                  : <button className="btn btn-outline btn-sm">Read Article →</button>
                }
                {tut.views && <span className={styles.tutViews}>👁 {tut.views} views</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-outline">View All 42 Tutorials</button>
      </div>

      {/* Support banner */}
      <div className={`card ${styles.supportBanner}`}>
        <div>
          <h3 className={styles.supportTitle}>Can&apos;t find what you&apos;re looking for?</h3>
          <p className={styles.supportDesc}>
            Our support team is available 24/7 to help you with technical setup, billing
            queries, or feature requests. Join our community forum for developer tips.
          </p>
        </div>
        <div className={styles.supportBtns}>
          <button className="btn btn-navy">Visit Help Center</button>
          <button className="btn btn-outline">Developer Docs</button>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }}>
          💬 Contact Support
        </button>
      </div>
    </div>
  );
}
