import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgUsage } from '@/lib/usage';
import Anthropic from '@anthropic-ai/sdk';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

// Letra + tipo → código de comprobante AFIP (para matchear con lo importado de ARCA).
const LETTER_KIND_TO_TIPO: Record<string, Record<string, number>> = {
  A: { FACTURA: 1, NOTA_DEBITO: 2, NOTA_CREDITO: 3 },
  B: { FACTURA: 6, NOTA_DEBITO: 7, NOTA_CREDITO: 8 },
  C: { FACTURA: 11, NOTA_DEBITO: 12, NOTA_CREDITO: 13 },
  M: { FACTURA: 51, NOTA_DEBITO: 52, NOTA_CREDITO: 53 },
};

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    issuer_name: {
      type: 'string',
      description: 'Razón social o nombre del emisor de la factura/tique/recibo. Vacío si no es legible.',
    },
    issuer_cuit: {
      type: 'string',
      description: 'CUIT del emisor, solo dígitos (11 caracteres), sin guiones ni espacios. Vacío si no aparece o no es legible.',
    },
    invoice_letter: {
      type: 'string',
      enum: ['A', 'B', 'C', 'T', 'M', 'E', 'X', 'OTRO', 'DESCONOCIDO'],
      description: 'Letra del comprobante (A/B/C/T/M/E/X). Si es un tique sin letra visible o no aplica, usar OTRO. Si no se puede determinar, DESCONOCIDO.',
    },
    comprobante_kind: {
      type: 'string',
      enum: ['FACTURA', 'NOTA_DEBITO', 'NOTA_CREDITO'],
      description: 'Tipo de comprobante. La gran mayoría de las compras son FACTURA — usar NOTA_DEBITO o NOTA_CREDITO solo si el comprobante lo dice explícitamente impreso en el encabezado.',
    },
    punto_venta: {
      type: 'string',
      description: 'Punto de venta, la primera parte del número impreso (ej. en "0004-00012345" es "0004"). Solo dígitos, sin ceros a la izquierda. Vacío si no es legible.',
    },
    invoice_number: {
      type: 'string',
      description: 'Número de comprobante SIN el punto de venta (ej. en "0004-00012345" es "12345"). Solo dígitos, sin ceros a la izquierda. Vacío si no es legible.',
    },
    issue_date: {
      type: 'string',
      description: 'Fecha de emisión en formato YYYY-MM-DD. Vacío si no es legible.',
    },
    net_amount: {
      type: 'number',
      description: 'Monto neto gravado (sin IVA). Si el comprobante no discrimina IVA (ej. tique de consumidor final), calcular neto = total / (1 + tasa), asumiendo tasa 21% salvo que el rubro sugiera otra tasa (ej. 10.5%).',
    },
    iva_amount: {
      type: 'number',
      description: 'Monto de IVA, discriminado en el comprobante o calculado como total - neto si no está discriminado.',
    },
    total_amount: {
      type: 'number',
      description: 'Monto total del comprobante, incluyendo IVA. Este es casi siempre legible con certeza.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'Confianza general de la extracción. "low" si la imagen está borrosa o hubo que asumir datos (ej. tasa de IVA, CUIT no legible).',
    },
    notes: {
      type: 'string',
      description: 'Aclaraciones breves: campos no legibles, supuestos usados (ej. "se asumió IVA 21% porque el tique no lo discrimina"), inconsistencias detectadas.',
    },
  },
  required: [
    'issuer_name', 'issuer_cuit', 'invoice_letter', 'comprobante_kind', 'punto_venta', 'invoice_number', 'issue_date',
    'net_amount', 'iva_amount', 'total_amount', 'confidence', 'notes',
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Sos un asistente experto en comprobantes fiscales argentinos (facturas A/B/C, tiques, recibos). Tu tarea es extraer datos estructurados de una imagen o PDF de un comprobante de COMPRA (un gasto que la empresa recibió, no una venta propia).

Reglas importantes:
- El monto total (total_amount) es el dato más confiable — casi siempre está impreso claramente. Extraelo con precisión, sin inventar decimales.
- Todo comprobante lleva IVA, se discrimine o no por separado. Si no está discriminado (tiques de kiosco, combustible, consumidor final), calculalo asumiendo 21% salvo evidencia de otra tasa, y decilo en "notes".
- Verificá que neto + IVA = total antes de responder. Si no cierra, ajustá el neto o el IVA (nunca el total, que es el dato impreso) y explicá el ajuste en "notes".
- El CUIT del emisor, el punto de venta y el número de comprobante son OBLIGATORIOS para poder guardar el registro (se usan para no duplicar comprobantes ya cargados a mano o importados de ARCA) — prestales especial atención y sacá el máximo esfuerzo en leerlos, aunque el resto de la imagen esté borroso.
- El número impreso suele tener el formato "punto de venta - número" (ej. "0004-00012345"): separalos en punto_venta ("0004") e invoice_number ("00012345"), cada uno sin ceros a la izquierda.
- Si algún dato no es legible (CUIT borroso, número cortado), dejalo vacío ("") y bajá "confidence" a "low" o "medium" según corresponda, explicando qué faltó — el usuario va a tener que completarlo a mano antes de guardar.
- Respondé únicamente con los datos extraídos de ESTE comprobante — no inventes datos que no estén presentes en la imagen.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'La extracción automática no está configurada (falta ANTHROPIC_API_KEY). Podés cargar los datos manualmente.' },
      { status: 503 },
    );
  }

  // La extracción con IA tiene costo por llamada — es una función paga, no del plan gratuito.
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

  const client = new Anthropic();

  const contentBlock = mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } };

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        effort: 'high',
        format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: 'Extraé los datos de este comprobante de compra.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'No se pudo procesar la imagen (rechazada por el modelo). Cargá los datos manualmente.' }, { status: 422 });
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      return NextResponse.json({ error: 'La extracción no devolvió resultados. Cargá los datos manualmente.' }, { status: 422 });
    }

    const extracted = JSON.parse(textBlock.text) as {
      issuer_name: string;
      issuer_cuit: string;
      invoice_letter: string;
      comprobante_kind: string;
      punto_venta: string;
      invoice_number: string;
      issue_date: string;
      net_amount: number;
      iva_amount: number;
      total_amount: number;
      confidence: string;
      notes: string;
    };

    // Verificación de consistencia matemática server-side: nunca confiar ciegamente
    // en la suma del modelo. El total impreso es el dato más confiable; si neto + iva
    // no cierra contra el total, recalculamos el iva a partir del total y el neto.
    const notesExtra: string[] = [];
    const roundedTotal = Math.round(extracted.total_amount * 100) / 100;
    const sum = Math.round((extracted.net_amount + extracted.iva_amount) * 100) / 100;
    let ivaAmount = extracted.iva_amount;
    let netAmount = extracted.net_amount;
    if (roundedTotal > 0 && Math.abs(sum - roundedTotal) > 0.5) {
      if (netAmount > 0) {
        ivaAmount = Math.round((roundedTotal - netAmount) * 100) / 100;
      } else {
        netAmount = Math.round((roundedTotal / 1.21) * 100) / 100;
        ivaAmount = Math.round((roundedTotal - netAmount) * 100) / 100;
      }
      notesExtra.push('Se recalculó el IVA/neto para que la suma cierre con el total impreso.');
    }

    const tipoComprobante = LETTER_KIND_TO_TIPO[extracted.invoice_letter]?.[extracted.comprobante_kind] ?? null;

    return NextResponse.json({
      issuer_name: extracted.issuer_name,
      issuer_cuit: extracted.issuer_cuit.replace(/[^0-9]/g, ''),
      invoice_letter: extracted.invoice_letter,
      comprobante_kind: extracted.comprobante_kind,
      tipo_comprobante: tipoComprobante,
      punto_venta: extracted.punto_venta.replace(/[^0-9]/g, ''),
      invoice_number: extracted.invoice_number.replace(/[^0-9]/g, ''),
      issue_date: extracted.issue_date || null,
      net_amount: netAmount,
      iva_amount: ivaAmount,
      total_amount: roundedTotal,
      confidence: extracted.confidence,
      notes: [extracted.notes, ...notesExtra].filter(Boolean).join(' '),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error extrayendo factura de compra:', message);
    return NextResponse.json({ error: 'No se pudo extraer los datos automáticamente. Cargá los datos manualmente.' }, { status: 502 });
  }
}
