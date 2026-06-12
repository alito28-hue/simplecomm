# Diseño: Facturas programadas

## Objetivo

Incorporar un módulo de facturas programadas para automatizar facturas mensuales que repiten cliente, datos fiscales, descripción, monto y destinatario.

Cada programación representa como máximo una posible factura por mes. Si una organización necesita emitir dos facturas mensuales al mismo cliente, debe crear dos programaciones independientes con distintas fechas iniciales.

## Alcance inicial

El módulo permite:

- Crear, consultar, editar, pausar, reanudar y cancelar programaciones mensuales.
- Emitir y enviar facturas automáticamente.
- Solicitar confirmación antes de emitir cada factura.
- Notificar solicitudes de confirmación mediante la campana del sistema y el email único de la organización.
- Mostrar el historial completo de facturas emitidas y oportunidades no emitidas.
- Finalizar programaciones sin límite, por cantidad de meses o por cantidad de facturas emitidas.

Quedan fuera del alcance inicial:

- Más de una emisión mensual dentro de una misma programación.
- Ajustes por feriados.
- Confirmaciones agrupadas para varias facturas.
- Recuperar o emitir manualmente oportunidades vencidas.

## Conceptos principales

### Programación

Define la regla mensual y los datos reutilizables para emitir una factura:

- Organización.
- Cliente y datos fiscales.
- Descripción.
- Monto y configuración fiscal.
- Email receptor.
- Primera fecha programada.
- Modalidad de emisión.
- Criterio de finalización.
- Estado y próxima fecha de ejecución.

### Oportunidad mensual

Representa una posible factura concreta correspondiente a un mes calendario.

La oportunidad conserva una copia de los datos de la programación vigentes al momento de generarse. Esto permite auditar cada caso y evita que una edición posterior cambie solicitudes pendientes o registros históricos.

Cada oportunidad tiene una clave idempotente única para impedir emisiones duplicadas ante reintentos.

## Navegación y pantalla principal

Se agrega **Facturas programadas** dentro del menú **Facturación**.

La pantalla principal muestra:

- Cliente.
- Descripción.
- Monto.
- Próxima fecha ajustada de emisión.
- Modalidad: automática o con confirmación.
- Progreso según criterio de finalización.
- Estado: activa, pausada, finalizada o cancelada.
- Acciones para ver detalle, editar, pausar, reanudar o cancelar.

## Creación de una programación

El formulario solicita:

### Cliente

El usuario puede:

- Seleccionar un cliente desde Contactos.
- Buscar datos mediante CUIT y padrón.
- Cargar los datos manualmente.

Los datos mínimos necesarios son nombre o razón social, tipo y número de documento, tratamiento fiscal requerido por la factura y email receptor.

### Factura

- Descripción repetitiva.
- Monto.
- Tipo de factura.
- Alícuota de IVA.
- Concepto.
- Punto de venta.
- Email al que se enviará la factura emitida.

### Programación

- Primera fecha programada.
- Modalidad:
  - Emitir y enviar automáticamente.
  - Solicitar confirmación antes de emitir.
- Fin:
  - Sin fecha límite.
  - Después de X meses.
  - Después de emitir X facturas.

## Regla mensual y ajuste de fechas

La primera fecha define el día modelo de las ejecuciones mensuales posteriores.

Cada programación genera como máximo una oportunidad por mes.

La fecha efectiva se calcula así:

1. Se intenta utilizar el mismo día de la primera fecha en el mes correspondiente.
2. Si ese día no existe, se utiliza el último día disponible del mes.
3. Si la fecha resultante cae sábado o domingo, se adelanta al viernes anterior.

No se contemplan feriados en el alcance inicial.

Ejemplos:

- Una programación iniciada el día 15 continúa el día 15 de cada mes, salvo ajustes de fin de semana.
- Una programación iniciada el día 31 usa el último día disponible en meses más cortos y luego aplica el ajuste de fin de semana.

## Ciclo de emisión automática

En la fecha efectiva:

1. Se genera la oportunidad mensual si todavía no existe.
2. Se solicita la emisión mediante el endpoint existente del gateway.
3. Si la emisión resulta exitosa, se envía el PDF al email receptor.
4. Se registra el resultado en el historial.

Un fallo en el envío de email no cambia una factura emitida a error: la factura permanece emitida y el envío queda marcado como pendiente o fallido.

## Ciclo con solicitud de confirmación

En la fecha efectiva:

1. Se genera una oportunidad mensual pendiente de confirmación.
2. Se crea una notificación en la campana del sistema.
3. Se envía un email al email único de la organización con acceso directo a la solicitud.
4. No se emite ninguna factura hasta que el usuario confirme esa oportunidad específica.

Al confirmar:

1. La oportunidad registra fecha de confirmación y usuario confirmante.
2. La factura se emite inmediatamente.
3. El PDF se envía al email receptor.

Si la oportunidad no se confirma antes de finalizar su mes calendario:

- No se emite la factura.
- La oportunidad pasa definitivamente a **No emitida por falta de confirmación**.
- No se traslada ni acumula en el mes siguiente.
- No puede emitirse manualmente después del vencimiento.
- El próximo mes se genera una nueva oportunidad y una nueva solicitud independiente.

## Criterios de finalización

### Sin fecha límite

La programación continúa hasta que se pause o cancele.

### Después de X meses

Cuenta meses calendario de programación desde el mes de la primera fecha.

Cada mes alcanzado consume uno de los meses definidos, independientemente de que su oportunidad haya sido emitida, haya vencido sin confirmación o haya terminado en error.

La programación finaliza después de procesar su último mes permitido.

### Después de emitir X facturas

Cuenta únicamente facturas emitidas exitosamente.

Las oportunidades pendientes, vencidas sin confirmación, canceladas o con error no consumen el límite. La programación continúa hasta alcanzar la cantidad definida, salvo que sea pausada o cancelada.

## Detalle e historial

La vista de detalle muestra:

- Configuración completa.
- Próxima fecha programada y fecha efectiva ajustada.
- Estado.
- Progreso del criterio de finalización.
- Acciones para editar, pausar, reanudar o cancelar.
- Historial de oportunidades mensuales.

Cada registro del historial muestra:

- Mes correspondiente.
- Fecha originalmente programada.
- Fecha efectiva ajustada.
- Estado.
- Fecha de notificación.
- Fecha y usuario de confirmación, cuando corresponda.
- Número de factura, monto y acceso al PDF, cuando fue emitida.
- Estado del envío al receptor.
- Motivo de error o no emisión.

Estados posibles de una oportunidad:

- Pendiente de confirmación.
- En proceso de emisión.
- Emitida.
- No emitida por falta de confirmación.
- Error.
- Cancelada.

## Edición, pausa y cancelación

- Los cambios realizados en una programación afectan únicamente oportunidades futuras.
- Una oportunidad ya generada conserva la copia de datos tomada al momento de su creación.
- Pausar evita generar nuevas oportunidades y conserva todo el historial.
- Reanudar vuelve a generar oportunidades a partir del siguiente mes aplicable; no recupera meses omitidos durante la pausa.
- Cancelar finaliza permanentemente la programación y conserva su historial.
- Al cancelar la programación, cualquier oportunidad pendiente existente pasa a **Cancelada**, nunca se emite y permanece visible en el historial.

## Arquitectura propuesta

### Entidades

#### `scheduled_invoices`

Almacena la configuración de la programación:

- Identidad y organización.
- Datos del cliente y referencia opcional al contacto.
- Configuración fiscal y comercial.
- Modalidad.
- Primera fecha y día modelo.
- Tipo y valor del criterio de finalización.
- Contadores de meses procesados y facturas emitidas.
- Estado.
- Próxima fecha efectiva.
- Timestamps.

#### `scheduled_invoice_occurrences`

Almacena cada oportunidad mensual:

- Referencia a la programación y organización.
- Mes calendario.
- Fecha originalmente programada y fecha efectiva.
- Copia de datos de emisión y destinatario.
- Estado de confirmación y emisión.
- Clave idempotente.
- Referencia o identificador de factura emitida.
- Estado de email al receptor.
- Fechas de notificación, confirmación, emisión y vencimiento.
- Usuario confirmante.
- Mensajes de error.

Debe existir una restricción única por programación y mes calendario.

### Responsabilidades

- La aplicación principal administra programaciones, oportunidades, confirmaciones y notificaciones.
- El gateway existente continúa siendo responsable de emitir en ARCA, generar el PDF y garantizar idempotencia de emisión.
- Resend continúa siendo responsable de los emails.
- La campana existente muestra solicitudes pendientes, errores y resultados relevantes.

## Proceso programado

Un proceso diario idempotente ejecuta, en este orden:

1. Marca como no emitidas las solicitudes pendientes pertenecientes a meses anteriores.
2. Evalúa y finaliza programaciones que alcanzaron su criterio de fin.
3. Genera las oportunidades correspondientes a la fecha efectiva actual.
4. Emite oportunidades automáticas.
5. Crea y notifica solicitudes que requieren confirmación.
6. Actualiza contadores, próxima fecha y estado de las programaciones.

El proceso puede ejecutarse varias veces el mismo día sin duplicar oportunidades, notificaciones ni facturas.

La zona horaria operativa es `America/Argentina/Buenos_Aires`.

## Errores y reintentos

- Si falla una emisión automática, la oportunidad queda en **Error** y se notifica a la organización.
- Si falla una emisión después de confirmar, la confirmación se conserva y la emisión puede reintentarse.
- Los reintentos usan la misma clave idempotente.
- Si la factura fue emitida pero falla el email receptor, la oportunidad continúa como **Emitida** y permite reintentar solamente el envío.
- Ningún reintento puede generar una segunda factura para la misma oportunidad.

## Seguridad y permisos

- Todas las programaciones y oportunidades están aisladas por organización.
- Solo usuarios autenticados de la organización pueden consultar o modificar sus programaciones.
- Cualquier usuario autorizado de la organización puede confirmar una solicitud.
- La confirmación registra al usuario que realizó la acción.
- Los enlaces enviados por email requieren una sesión autenticada antes de permitir la confirmación.

## Pruebas requeridas

### Fechas

- Día existente entre semana.
- Día existente que cae sábado o domingo.
- Día inexistente en el mes.
- Día inexistente cuyo último día también cae fin de semana.
- Cambio de año.

### Confirmación

- No emitir antes de confirmar.
- Emitir inmediatamente al confirmar.
- Solicitud independiente por oportunidad.
- Vencer al finalizar el mes.
- No recuperar oportunidades vencidas.

### Finalización

- Sin límite.
- Límite por meses incluyendo oportunidades no emitidas.
- Límite por facturas contando solo emisiones exitosas.

### Operación

- Ediciones aplicadas solo al futuro.
- Pausa y reanudación sin recuperar meses omitidos.
- Cancelación.
- Idempotencia del proceso diario.
- Idempotencia de emisión.
- Reintentos por error de ARCA.
- Reintentos independientes del email receptor.

## Criterios de aceptación

- Una programación activa genera como máximo una oportunidad por mes.
- Una oportunidad con confirmación nunca emite antes de ser confirmada.
- Una oportunidad no confirmada vence al terminar su mes y nunca se emite después.
- Las fechas de fin de semana o inexistentes se adelantan al viernes anterior.
- El historial distingue claramente facturas emitidas y oportunidades no emitidas.
- Los límites por meses y por facturas respetan sus reglas específicas.
- Reejecutar procesos o reintentos no produce facturas duplicadas.
