import Link from 'next/link';

interface BackButtonProps {
  href: string;
  label?: string;
}

export default function BackButton({ href, label = '← Volver' }: BackButtonProps) {
  return (
    <Link href={href} style={{
      fontSize: '0.85rem',
      color: 'var(--blue)',
      fontWeight: 500,
      textDecoration: 'none',
      display: 'inline-block',
      marginBottom: '0.5rem',
    }}>
      {label}
    </Link>
  );
}
