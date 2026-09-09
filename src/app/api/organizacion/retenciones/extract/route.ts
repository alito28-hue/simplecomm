import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgUsage } from '@/lib/usage';
import { GoogleGenAI } from '@google/genai';

// gemini-3.8-flash: modelo estable y recomendado por Google al momento de escribir esto
// (no un "preview", para no quedar pegados a un modelo que se dé de baja de golpe — ya nos
// pasó con la familia Gemini 2.5, que Google discontinúa en octubre 2026).
const GEMINI_MODEL = 'gemini-3.8-flash';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    titulo: {
      type: 'string',
      description: 'Título/encabezado del comprobante tal cual aparece impreso (ej. "Retención de Ganancias", "Retención/Percepción de Ingresos Brutos"). Vacío si no es legible.',
    },
    codigo_impuesto_afip: {
      type: ['number', 'null'],
      description: 'Código numérico del campo "Impuesto" (tabla SICORE, RG AFIP 2233/2007 Anexo III) — ej. 217 = Impuesto a las Ganancias. null si el comprobante no tiene ese campo o no es legible.',
    },
    codigo_regimen_afip: {
      type: ['number', 'null'],
      description: 'Código numérico del campo "Régimen" — ej. 94 = Locaciones de Obra y/o Servicios. null si no aplica o no es legible.',
    },
    cuit_agente_retencion: {
      type: 'string',
      description: 'CUIT de quien practicó la retención/percepción (el "Agente de Retención"), solo dígitos, 11 caracteres. Vacío si no es legible.',
    },
    nro_ib_presente: {
      type: 'boolean',
      description: 'true si el comprobante tiene un campo "Nro. I.B." (Ingresos Brutos) completado con un número — false si está vacío o no existe ese campo.',
    },
    importe_operacion_base: {
      type: ['number', 'null'],
      description: 'Importe de la Operación — la base sobre la que se calculó la retención/percepción (antes de aplicar la alícuota). null si no es legible.',
    },
    alicuota: {
      type: ['number', 'null'],
      description: 'Alícuota aplicada, como fracción decimal (ej. 2,00% del comprobante → 0.02). null si no es legible.',
    },
    importe_retenido: {
      type: 'number',
      description: 'Importe Retenido/Percibido — el monto final de la retención o percepción, siempre positivo (ignorar el signo negativo si el comprobante lo imprime así). Este es el dato más importante — extraelo con precisión.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: '"low" si la imagen está borrosa o el código de Impuesto no se pudo leer con certeza.',
    },
    notes: {
      type: 'string',
      description: 'Aclaraciones breves: campos no legibles, inconsistencias detectadas.',
    },
  },
  required: [
    'titulo', 'codigo_impuesto_afip', 'codigo_regimen_afip', 'cuit_agente_retencion',
    'nro_ib_presente', 'importe_operacion_base', 'alicuota', 'importe_retenido', 'confidence', 'notes',
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Sos un asistente experto en comprobantes fiscales argentinos. Tu tarea es extraer datos estructurados de un COMPROBANTE DE RETENCIÓN O PERCEPCIÓN (el papel que un cliente/agente de retención le entrega a un contribuyente cuando le retuvo o percibió un impuesto al pagarle) — no es una factura.

Reglas importantes:
- El "Importe Retenido" (o "Importe Percibido") es el dato más importante — extraelo con precisión, siempre como número positivo aunque el comprobante lo imprima con signo negativo.
- El campo "Impuesto" es un código numérico de la tabla SICORE (ej. 217 = Ganancias) — es DISTINTO del campo "Régimen" (ej. 94), que es solo informativo sobre el tipo de operación. Prestale especial atención al campo "Impuesto": es el dato que determina a qué impuesto corresponde la retención.
- Si el comprobante tiene un campo "Nro. I.B." (Ingresos Brutos) completado con un número, marcá nro_ib_presente en true.
- Si algún dato no es legible, dejalo vacío/null y bajá "confidence", explicando qué faltó en "notes".
- Respondé únicamente con los datos extraídos de ESTE comprobante — no inventes datos que no estén presentes en la imagen.`;

// Clasificación server-side (nunca confiar en que el modelo adivine el impuesto): el único
// campo confiable es el código "Impuesto" de la tabla SICORE. 217 = Ganancias está confirmado
// con comprobantes reales. El resto son heurísticas más débiles (título, Nro. I.B. presente),
// así que ante cualquier ambigüedad se deja SIN_CLASIFICAR en vez de adivinar.
function classifyTipoImpuesto(data: {
  codigo_impuesto_afip: number | null;
  titulo: string;
  nro_ib_presente: boolean;
}): 'GANANCIAS' | 'IVA' | 'IIBB' | 'SIN_CLASIFICAR' {
  if (data.codigo_impuesto_afip === 217) return 'GANANCIAS';
  const t = (data.titulo || '').toLowerCase();
  if (data.nro_ib_presente || t.includes('ingresos brutos') || t.includes('iibb')) return 'IIBB';
  if (t.includes('ganancias')) return 'GANANCIAS';
  if (t.includes('iva')) return 'IVA';
  return 'SIN_CLASIFICAR';
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'La extracción automática no está configurada (falta GEMINI_API_KEY). Podés cargar los datos manualmente.' },
      { status: 503 },
    );
  }

  const usage = await getOrgUsage(user.id);
  if (!usage?.isSubscribed) {
    return NextResponse.json(
      { error: 'La extracción automática con IA es una función paga. Suscribite a un plan pago para usarla, o cargá los datos manualmente.', requiresUpgrade: true },
      { status: 402 },
    );
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file requerido' }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 });
  }
  const mediaType = file.type || 'application/octet-stream';
  if (!ACCEPTED_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: 'Formato no soportado. Usá una foto (JPG/PNG/WEBP/HEIC) o un PDF.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString('base64');

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const filePart = mediaType === 'application/pdf'
    ? { type: 'document' as const, data: base64, mime_type: 'application/pdf' }
    : { type: 'image' as const, data: base64, mime_type: mediaType };

  try {
    const interaction = await client.interactions.create({
      model: GEMINI_MODEL,
      system_instruction: SYSTEM_PROMPT,
      input: [
        filePart,
        { type: 'text', text: 'Extraé los datos de este comprobante de retención/percepción.' },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: EXTRACTION_SCHEMA,
      },
    });

    if (!interaction.output_text) {
      return NextResponse.json({ error: 'La extracción no devolvió resultados. Cargá los datos manualmente.' }, { status: 422 });
    }

    const extracted = JSON.parse(interaction.output_text) as {
      titulo: string;
      codigo_impuesto_afip: number | null;
      codigo_regimen_afip: number | null;
      cuit_agente_retencion: string;
      nro_ib_presente: boolean;
      importe_operacion_base: number | null;
      alicuota: number | null;
      importe_retenido: number;
      confidence: string;
      notes: string;
    };

    const tipoImpuesto = classifyTipoImpuesto(extracted);

    return NextResponse.json({
      titulo: extracted.titulo,
      codigo_impuesto_afip: extracted.codigo_impuesto_afip,
      codigo_regimen_afip: extracted.codigo_regimen_afip,
      cuit_agente_retencion: (extracted.cuit_agente_retencion || '').replace(/[^0-9]/g, ''),
      importe_operacion_base: extracted.importe_operacion_base,
      alicuota: extracted.alicuota,
      importe_retenido: Math.abs(Math.round((extracted.importe_retenido || 0) * 100) / 100),
      tipo_impuesto: tipoImpuesto,
      confidence: tipoImpuesto === 'SIN_CLASIFICAR' && extracted.confidence === 'high' ? 'medium' : extracted.confidence,
      notes: extracted.notes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error extrayendo comprobante de retención:', message);
    return NextResponse.json({ error: 'No se pudo extraer los datos automáticamente. Cargá los datos manualmente.' }, { status: 502 });
  }
}
