import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit (y su dependencia fontkit) no son compatibles con el bundler de Turbopack — se
  // rompe con un error de exports de @swc/helpers. Excluirlos del bundle y cargarlos como
  // require() nativo de Node en runtime resuelve el conflicto.
  serverExternalPackages: ['pdfkit', 'fontkit'],
};

export default nextConfig;
