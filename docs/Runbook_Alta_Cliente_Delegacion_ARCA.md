# Runbook — Alta de cliente por delegación ARCA

Qué hacer, en orden, cada vez que un cliente nuevo elige facturar por delegación
(usando el certificado de Mocla S.A.) en vez de subir su propio certificado.

## 1. El cliente completa el onboarding

Cuando el cliente termina el paso de "Configurar ARCA" en `/onboarding` eligiendo
delegación, el sistema:
- Registra el tenant en el Gateway.
- Te manda un mail automático a vos (admin) avisando que hay una delegación pendiente,
  con el CUIT y nombre del cliente. **Este mail ya trae escritos los dos pasos del punto 2** —
  no hace falta memorizarlos.

Si no te llegó el mail, revisá `ADMIN_EMAIL` en las variables de entorno de Vercel y que
Resend esté funcionando.

## 2. Vos (admin), en el portal de ARCA

Entrá a [mi.afip.gov.ar](https://auth.afip.gob.ar/contribuyente_/login.xhtml) con el CUIT
de **Mocla S.A. (30715371622)**.

### 2.a — Aceptar la delegación

Administrador de Relaciones de Clave Fiscal → **"Consultar"** (la cuarta opción, la de
"Autorizaciones pendientes de Aceptación") → buscá la relación del cliente nuevo → **Aceptar**.

Esto deja la relación en estado "Aceptada: SI" — pero **no alcanza solo con esto**. El
cliente todavía no puede facturar en este punto, aunque la pantalla lo muestre como aceptado.

### 2.b — Vincular el Computador Fiscal (el paso que faltaba y rompía todo)

Sin este paso, WSFE rechaza cualquier factura con error 600
`No aparecio CUIT en lista de relaciones`, **incluso con la relación ya aceptada**. Costó
varias semanas encontrarlo — no te lo saltees.

En el mismo Administrador de Relaciones, esta vez usar **"Nueva Relación"** (el segundo
botón, no "Consultar"):

1. Representado: elegir al cliente nuevo (ya debería aparecer en el desplegable, porque la
   designación ya fue aceptada en el paso 2.a).
2. Servicio: **Facturación Electrónica**.
3. En la pantalla "Selección del Representante a autorizar": ahí aparece un desplegable de
   **Computador Fiscal** — elegir el que ya tiene Mocla registrado (no cargar ningún CUIT en
   el otro campo, ese es para el caso contrario).
4. Confirmar. El sistema emite la constancia F.3283/E.

Recién en este momento el servicio queda realmente disponible para que Mocla facture en
nombre del cliente.

## 3. Verificar y avisar al cliente

Volvé al panel: `/mayor/clientes/[id]` del cliente → botón **"Verificar relación ahora"**.

Esto consulta a ARCA de verdad (no es solo un check visual) y, si sale bien:
- Marca `afipRelationVerifiedAt` en la base.
- **La primera vez que sale bien, le manda un mail automático al cliente** avisándole que
  ya puede facturar, con un link directo a Facturación Rápida.

Si reintentás "Verificar" después de la primera vez (por ejemplo para confirmar que sigue
andando), no se vuelve a mandar el mail al cliente — solo la primera vez.

Si el botón da error, repasar el punto 2.b — lo más probable es que el Computador Fiscal
no se haya vinculado bien o falte tiempo de propagación (probar de nuevo en unas horas).

## Referencia técnica

Ver [[project_simplecomm]] y [[project_arca_gateway]] para el contexto completo del bug
original (reclamo ARCA RS-546110) y la arquitectura del Gateway.
