interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

const sizes = {
  sm: { width: 120, height: 30 },
  md: { width: 160, height: 40 },
  lg: { width: 200, height: 50 },
};

export default function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const { width, height } = sizes[size];

  if (variant === 'icon') {
    return (
      <svg viewBox="0 0 60 60" width={height} height={height} xmlns="http://www.w3.org/2000/svg">
        <path d="M30 15 L40 5 L50 15 M40 5 L40 35 M30 25 L40 35 L50 25"
          stroke="#007AFF" strokeWidth="4" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 22 Q22 22 22 28 L22 45 Q22 50 28 50 L52 50"
          stroke="#0d1c31" strokeWidth="4" fill="none"
          strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 60" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <path d="M30 20 L40 10 L50 20 M40 10 L40 40 M30 30 L40 40 L50 30"
        stroke="#007AFF" strokeWidth="4" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 25 Q25 25 25 30 L25 45 Q25 50 30 50 L50 50"
        stroke="#0d1c31" strokeWidth="4" fill="none"
        strokeLinecap="round" />
      <text x="65" y="38"
        fontFamily="Hanken Grotesk, sans-serif"
        fontWeight="800" fontSize="24" fill="#0d1c31">Simple</text>
      <text x="143" y="38"
        fontFamily="Hanken Grotesk, sans-serif"
        fontWeight="400" fontSize="24" fill="#007AFF">Comm</text>
    </svg>
  );
}

export function LogoWhite({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { width, height } = sizes[size];
  return (
    <svg viewBox="0 0 240 60" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <path d="M30 20 L40 10 L50 20 M40 10 L40 40 M30 30 L40 40 L50 30"
        stroke="#60aeff" strokeWidth="4" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 25 Q25 25 25 30 L25 45 Q25 50 30 50 L50 50"
        stroke="rgba(255,255,255,0.7)" strokeWidth="4" fill="none"
        strokeLinecap="round" />
      <text x="65" y="38"
        fontFamily="Hanken Grotesk, sans-serif"
        fontWeight="800" fontSize="24" fill="#ffffff">Simple</text>
      <text x="143" y="38"
        fontFamily="Hanken Grotesk, sans-serif"
        fontWeight="400" fontSize="24" fill="#60aeff">Comm</text>
    </svg>
  );
}
