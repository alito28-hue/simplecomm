import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64, 'Debe ser 32 bytes en hex (64 caracteres)'),
  AFIP_ENV: z.enum(['production', 'homologation']).default('production'),
  AFIP_CERT_BASE64: z.string().min(1),
  AFIP_KEY_BASE64: z.string().min(1),
  AFIP_CHAIN_BASE64: z.string().min(1),
  AFIP_CUIT: z.string().min(1),
  GATEWAY_ADMIN_SECRET: z.string().min(16).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

// Endpoints AFIP por ambiente
export const AFIP_ENDPOINTS = {
  production: {
    wsaa:   'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    wsfe:   'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
    padron: 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5',
  },
  homologation: {
    wsaa:   'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsfe:   'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    padron: 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5',
  },
} as const;

export const endpoints = AFIP_ENDPOINTS[config.AFIP_ENV];

// Credenciales del certificado Mocla SA (cargadas al iniciar)
export const masterCredentials = {
  certPem: Buffer.from(config.AFIP_CERT_BASE64, 'base64').toString('utf8'),
  keyPem: Buffer.from(config.AFIP_KEY_BASE64, 'base64').toString('utf8'),
  chainPem: Buffer.from(config.AFIP_CHAIN_BASE64, 'base64').toString('utf8'),
  cuit: config.AFIP_CUIT,
};
