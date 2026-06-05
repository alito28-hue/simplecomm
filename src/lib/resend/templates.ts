function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function baseEmail({
  title,
  icon,
  iconBg,
  heading,
  body,
  buttonText,
  buttonUrl,
  buttonColor,
  note,
}: {
  title: string;
  icon: string;
  iconBg: string;
  heading: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  buttonColor: string;
  note: string;
}) {
  const safeUrl = escapeHtml(buttonUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f7f9fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="font-size:22px;font-weight:800;line-height:1;color:#0d1c31;">
                Simple<span style="font-weight:500;color:#007aff;">Comm</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px 36px;box-shadow:0 2px 8px rgba(13,28,49,0.08);">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:56px;height:56px;background:${iconBg};border-radius:50%;font-size:24px;line-height:56px;text-align:center;">${icon}</div>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0d1c31;text-align:center;">${escapeHtml(heading)}</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#44474d;line-height:1.6;text-align:center;">${body}</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${safeUrl}" style="display:inline-block;background:${buttonColor};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      ${escapeHtml(buttonText)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:13px;color:#75777d;text-align:center;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
              <p style="margin:8px 0 0;font-size:12px;color:#007aff;line-height:1.5;text-align:center;word-break:break-all;">${safeUrl}</p>
              <p style="margin:20px 0 0;font-size:13px;color:#75777d;text-align:center;">${escapeHtml(note)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#75777d;">© 2026 SimpleComm · Todos los derechos reservados</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function confirmEmailTemplate(confirmUrl: string) {
  return baseEmail({
    title: 'Confirmá tu email — SimpleComm',
    icon: '✓',
    iconBg: '#e8f2ff',
    heading: 'Confirmá tu email',
    body: 'Gracias por crear tu cuenta en <strong>SimpleComm</strong>. Confirmá tu email para activar tu acceso y empezar a configurar tu tienda.',
    buttonText: 'Confirmar email',
    buttonUrl: confirmUrl,
    buttonColor: '#007aff',
    note: 'Si no creaste esta cuenta, podés ignorar este email.',
  });
}

export function resetPasswordTemplate(resetUrl: string) {
  return baseEmail({
    title: 'Recuperar contraseña — SimpleComm',
    icon: '🔐',
    iconBg: '#fff8e8',
    heading: 'Recuperar contraseña',
    body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>SimpleComm</strong>. Hacé clic en el botón de abajo para crear una nueva contraseña.',
    buttonText: 'Crear nueva contraseña',
    buttonUrl: resetUrl,
    buttonColor: '#0d1c31',
    note: 'Si no solicitaste este cambio, podés ignorar este email. Tu contraseña no será modificada.',
  });
}
