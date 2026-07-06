# Simplecomm — Spec de Integraciones, Alertas de Monotributo y Módulo de Rentabilidad

**Versión:** 1.0
**Alcance:** Exclusivo Argentina
**Objetivo del documento:** darle al equipo de desarrollo el criterio de negocio + el flujo técnico de las próximas features, para que no se construyan como checkboxes sueltos sino como un sistema conectado (venta → stock → cobro → envío → impuestos → rentabilidad).

---

## 0. Principio general

Simplecomm hoy factura bien. Lo que falta no es "más features", es cerrar el círculo: que el sistema **se entere solo** de lo que pasó (se vendió algo, se cobró, hay que despacharlo, cuánto costó en ads conseguirlo) en vez de depender de que el usuario cargue todo a mano. Cada feature de este documento se diseña con esa lógica: **mínima carga manual posible, máxima automatización donde exista una API real**, y donde no exista API (Instagram directo, TikTok, ads), carga manual simple y rápida — no fingir una integración que no existe.

---

## 1. Tres casos reales de integración

### Caso 1 — Instagram + Tiendanube + Mercado Pago + Logística

**Perfil:** vende por Instagram como vidriera/contenido, pero el checkout real pasa por su tienda Tiendanube. Cobra con Mercado Pago (nativo de Tiendanube o como medio de pago propio). Despacha por correo.

**Flujo end-to-end deseado:**

1. Cliente compra en la tienda Tiendanube → se dispara webhook `order/paid`.
2. Simplecomm recibe el webhook → matchea o crea el Contacto (nombre, email, dirección de envío).
3. Simplecomm matchea los productos del pedido contra el catálogo local por SKU/código.
   - Si el producto no existe en Simplecomm → se crea automáticamente (nombre, precio) y se marca para revisión.
   - Si existe → se descuenta stock local automáticamente (mismo mecanismo que ya usan en Facturación Rápida).
4. Se emite el comprobante automáticamente, igual que hoy hace el webhook de MP directo, pero ahora disparado por el pedido de la tienda, no por el pago suelto.
5. Con la dirección del pedido, Simplecomm cotiza el envío contra el agregador logístico (ver sección 3) y deja la guía lista para generar con un clic desde la fila de la factura.
6. Estado del pedido (`packed`, `fulfilled`) se refleja como badge en Facturación, igual que hoy "Pendiente / Cobrada".

**Qué es 100% automático:** creación de contacto, descuento de stock, emisión de factura, cotización de envío.
**Qué requiere un clic humano:** confirmar/generar la etiqueta de envío (por control de costos), revisar productos nuevos detectados automáticamente la primera vez.

**Requerimientos técnicos:**
- OAuth con Tiendanube (el usuario "instala" Simplecomm como app desde su panel).
- Suscripción a webhooks: `order/paid`, `order/cancelled`, `order/fulfilled`, `product/updated` (para sync de precios/stock en sentido inverso si el usuario también vende directo por WhatsApp del mismo stock).
- Mapeo de producto Tiendanube ↔ producto Simplecomm por SKU (campo a agregar si no existe).

---

### Caso 2 — Instagram + WhatsApp + Carga manual + Mercado Pago + Logística

**Perfil:** el más chico y el más común al arrancar. No tiene tienda online, todo pasa por DM de Instagram y WhatsApp. Cobra por link de pago o alias de MP. Despacha por correo o moto.

**Realidad técnica:** acá no existe pedido en ningún sistema — no hay API de Instagram DM ni de WhatsApp personal para "leer" una venta. No se puede simular una integración que no existe. Lo que sí se puede es **reducir la fricción de la carga manual a casi cero**, que es donde de verdad se pierde tiempo hoy.

**Flujo propuesto (semi-automatizado):**

1. El vendedor abre "Nueva venta rápida" (evolución de Facturación Rápida ya existente).
2. Elige producto del catálogo → autocompleta precio y descuenta stock preview (igual que hoy).
3. En vez de cobrar por fuera y cargar después, genera desde ahí mismo un **link de pago de Mercado Pago** (Checkout Pro/Preference API) con el monto ya calculado. Se lo copia/comparte por WhatsApp con un botón.
4. Cuando el cliente paga, el webhook de MP (que ya tienen funcionando) confirma el cobro automáticamente y recién ahí se descuenta el stock real y se emite la factura — evitando el caso de "cargué la venta pero el cliente no pagó".
5. Con los datos de envío que el vendedor tipea una vez (nombre, dirección, CP), cotiza y genera guía igual que en el Caso 1.

**Lo que se automatiza vs. hoy:** no cambia que haya carga manual del pedido (es inevitable sin tienda), pero se elimina la doble carga (vender por un lado, facturar por otro, cobrar por un tercer lado) uniendo los tres pasos en una sola pantalla, con el cobro como disparador de confirmación en vez de un dato que hay que ir a chequear a mano en la app de MP.

**Mejora futura (no v1):** catálogo de WhatsApp Business API para leer pedidos armados por el cliente en el catálogo — hoy es una integración cara y compleja (requiere WhatsApp Business Platform, no la app gratuita), se deja fuera de este alcance.

---

### Caso 3 — TikTok + Tiendanube/Shopify + Mercado Pago + Logística

**Aclaración importante:** TikTok Shop **no tiene checkout nativo activo en Argentina** todavía (a julio 2026) — TikTok funciona acá como canal de contenido/tráfico, no como marketplace con pedidos propios. No hay integración de "pedidos de TikTok" para construir hoy. El caso real es: **TikTok como canal de adquisición que empuja tráfico a una tienda Tiendanube o Shopify**, donde el checkout y el pedido ya están cubiertos por el Caso 1 (Tiendanube) o su equivalente en Shopify.

**Flujo end-to-end deseado:**

1. Igual al Caso 1, pero con Shopify como alternativa de tienda: webhook `orders/paid` de Shopify → mismo pipeline (crear contacto, descontar stock, facturar, cotizar envío).
2. Lo único específico de "TikTok" que sí importa para este negocio no es logístico, es de **rentabilidad**: cuánto gastó en TikTok Ads para generar esas ventas. Eso se resuelve con el módulo de la sección 4, no con una integración de pedidos.

**Conclusión práctica:** no desarrollar "integración con TikTok" como tal. Desarrollar Shopify como segunda plataforma de tienda (mismo patrón que Tiendanube) y darle a TikTok su lugar como una plataforma de ads más dentro del módulo de rentabilidad.

---

## 2. Prioridad de desarrollo de integraciones de tienda

1. **Tiendanube** — líder en Argentina en este segmento, API abierta y gratuita, webhooks granulares (`order/created`, `order/paid`, `order/packed`, `order/fulfilled`, `order/cancelled`, `order/pending`, `order/voided`).
2. **Shopify** — mismo patrón (Orders API + webhooks `orders/paid`, `orders/fulfilled`), cubre al segmento un poco más grande/internacional.
3. **MercadoLibre** (marketplace, no "tienda") — API de ventas y stock propia, importante porque muchos usuarios venden ahí en paralelo a su tienda o directamente sin tienda propia. Se evalúa después de las dos anteriores.

---

## 3. Logística: integrar un agregador, no cada correo

**Decisión de arquitectura recomendada:** no construir integraciones directas contra Andreani, OCA, Correo Argentino por separado. Cada uno tiene su propia API, su propia fórmula de peso aforado (peso vs. volumen) y sus propios estados de tracking — mantenerlas todas es un costo de desarrollo que no se justifica para un equipo chico.

Existen agregadores logísticos argentinos pensados exactamente para este problema:

- **Envíopack**: una sola integración cotiza y genera guías contra múltiples correos (Andreani, OCA, Correo Argentino, etc.), resolviendo el cálculo de peso aforado por vos. Tiene integraciones ya armadas con marketplaces, tiendas online y ERPs, más soporte para integraciones a medida vía API. Incluye logística inversa (cambios/devoluciones).
- **Moova**: más orientado a última milla urbana (moto/bici/auto) en CABA y GBA, útil como alternativa para envíos same-day en zona metropolitana.

**Recomendación:** integrar Envíopack como capa única de logística. Con eso se resuelve, en un solo desarrollo: cotización en el momento de facturar, generación de guía con un clic, y actualización de estado de envío reflejada como badge en Facturación (mismo patrón visual que ya existe para "Pendiente / Cobrada").

**Requerimientos técnicos:**
- Cuenta Envíopack + `access_token`.
- Los productos necesitan peso y dimensiones cargados (agregar estos campos al maestro de Productos si no existen — sin esto la cotización no funciona).
- Endpoint de cotización por CP (a domicilio y a sucursal) + endpoint de generación de guía + webhook o polling de estado.

---

## 4. Alertas de recategorización de Monotributo (feature diferencial)

**Por qué importa:** el Monotributo se recategoriza en base a los ingresos brutos de los últimos 12 meses, dos veces al año (ventanas de enero y julio). Con inflación, es habitual superar el tope de la categoría sin que el negocio haya crecido realmente, y si no se recategoriza a tiempo, la AFIP/ARCA lo hace de oficio — con el problema de fondo que eso genera. Simplecomm ya tiene el dato clave (todo lo que el negocio facturó), así que este cálculo no requiere ninguna integración externa, solo lógica sobre datos propios.

### 4.1 Fuente del dato de facturación real: reutilizar "IVA Ventas" / "Comprobantes Emitidos"

Simplecomm ya tiene una función que hoy se usa para calcular IVA de los usuarios que son empresa (Responsable Inscripto): permite tanto tomar las facturas emitidas dentro del propio sistema, como **importar los comprobantes emitidos directamente desde la web de ARCA** ("IVA Ventas" / "Mis Comprobantes"). Para el caso de un monotributista, esa misma función hay que reutilizarla pero con otro propósito: en vez de calcular débito fiscal de IVA, sirve para reconstruir **la facturación real total** de los últimos 12 meses, que es la base del cálculo de recategorización.

Esto es clave porque no se puede asumir que todo lo que el usuario facturó pasó por Simplecomm. Hay que contemplar los tres escenarios:

- **Todo emitido desde Simplecomm** → caso simple, se suma directamente lo emitido en el sistema.
- **Todo importado desde ARCA** (el usuario factura desde otro lado o migró recientemente) → se toma como fuente el import de comprobantes.
- **Combinado** (parte emitida en Simplecomm, parte en otro sistema o antes de migrar) → hay que deduplicar por número de comprobante/CAE para no contar dos veces lo que se emitió en Simplecomm y después también aparece en el import de ARCA, y sumar el resto como complemento.

El cálculo de "facturación acumulada de los últimos 12 meses" para las alertas de la sección 4.4 tiene que construirse siempre sobre este dato consolidado (Simplecomm + import ARCA deduplicado), nunca solo sobre lo emitido en el sistema, para que el número contra el que se compara el tope de categoría sea el real.

### 4.2 Categoría de Monotributo en el onboarding

Al dar de alta la cuenta (o en un paso de configuración fiscal obligatorio si ya es un usuario existente), el sistema tiene que preguntar y guardar la **categoría actual de Monotributo** del usuario. Sin este dato de partida, el sistema no tiene con qué comparar la facturación acumulada real (sección 4.1) y no puede calcular:

- si está dentro de su categoría actual,
- si va camino a superar el tope y va a tener que recategorizarse en la próxima ventana (enero/julio),
- o si ya superó el tope de forma tal que corresponde no seguir facturando dentro de esa categoría durante el período en curso (caso límite que hay que marcar como alerta crítica, no resolver automáticamente — ver nota de producto en 4.4).

Este campo se guarda en la configuración de cuenta y debe poder editarse manualmente cuando el usuario se recategoriza (ya sea porque el sistema se lo indicó o porque lo hizo por su cuenta).

### 4.3 Tabla de categorías vigentes — fuente oficial única

La tabla de montos tope por categoría **siempre debe obtenerse de la fuente oficial de ARCA**: https://www.afip.gob.ar/monotributo/categorias.asp (esta es la única fuente válida, no calcular ni estimar valores por otro medio).

A modo de referencia, la tabla vigente desde el 1/02/2026 tiene 11 categorías (A a K), cada una con su tope de ingresos brutos anuales — por ejemplo Categoría A hasta $10.277.988,13 y Categoría K hasta $108.357.084,05 de ingresos brutos anuales (además de otros parámetros como superficie afectada, energía consumida y alquileres devengados, que no aplican para el cálculo de facturación pero sí forman parte de la tabla completa).

**Proceso operativo (no automatizado, por baja frecuencia):**

1. Cada vez que ARCA actualiza la escala (históricamente en las ventanas de enero y julio), un miembro del equipo entra a la fuente oficial y carga los nuevos valores en el panel de administración interno ("mayor" / admin), en la tabla `categorias_monotributo_vigentes` mencionada en la sección 7.
2. Cada registro de categoría debe guardarse con su **fecha de vigencia desde**, para que el sistema pueda calcular correctamente incluso si un usuario está mirando datos de un período anterior a la última actualización (no sobreescribir la tabla, versionar por fecha).
3. El cálculo de las alertas de la sección 4.4 siempre debe cruzar contra la versión de la tabla vigente al momento correspondiente, tomada de esta carga interna — nunca hardcodeada en el código de la aplicación.

### 4.4 Lógica de alertas

1. Con la categoría actual del usuario (4.2), la facturación acumulada real de los últimos 12 meses (4.1) y el tope vigente de esa categoría (4.3), se calcula el porcentaje de uso del tope de forma corrida (rolling 12 meses).
2. Umbrales de alerta sugeridos:
   - **80% del tope de su categoría actual** → aviso amarillo: "vas acercándote al límite de tu categoría, revisá tu proyección".
   - **95-100% del tope** → aviso rojo: "vas a necesitar recategorizarte a la categoría [X] en la próxima ventana".
   - **Superó el tope de la categoría K**, o superó el tope de su categoría actual de forma tal que la normativa exige dejar de facturar en esas condiciones durante el período → alerta crítica, señalando la situación con claridad para que el usuario actúe (ver nota de producto abajo).
3. Estas alertas se integran al Calendario de Vencimientos ya existente, como un recordatorio automático adicional a los que ya se cargan manualmente — no reemplaza el sistema actual, lo alimenta.

**Nota de producto:** Simplecomm no debe dar asesoramiento impositivo (no es AFIP ni un contador) — el copy de las alertas tiene que ser informativo/proyectivo ("vas camino a superar el tope", "tu facturación de los últimos 12 meses ya está en la categoría X"), nunca una afirmación categórica de la nueva categoría que le corresponde ni una instrucción de dejar de facturar por cuenta propia del sistema. Frente a los casos límite (superó el tope máximo, o tendría que discontinuar facturación en el período) siempre recomendar consultar con su contador o gestor.

---

## 5. Módulo de rentabilidad: gasto en Ads por plataforma (carga manual v1)

**Por qué es clave:** casi todo ecommerce chico vive de pauta paga (Meta Ads, Google Ads, TikTok Ads, etc.). Hoy Simplecomm sabe cuánto vendió, pero no cuánto costó conseguir esa venta — sin ese dato, "cuánto gané este mes" es una cifra incompleta y el usuario no puede tomar decisiones reales (ej: "¿me conviene seguir pautando en TikTok o no?").

**Alcance v1 (carga manual, sin integración):**

1. Nueva sección "Inversión en Publicidad" dentro de Reportes/Configuración.
2. El usuario carga, por mes y por plataforma, el monto gastado:
   - Meta Ads (Instagram/Facebook)
   - Google Ads
   - TikTok Ads
   - Otro (campo libre, para influencers, promos puntuales, etc.)
3. Estructura de datos sugerida (para que ya quede lista si en el futuro se automatiza vía API de cada plataforma):

   ```
   ad_spend
   ---------
   id
   user_id / cuenta
   plataforma        (enum: meta, google, tiktok, otro)
   mes               (YYYY-MM)
   monto
   moneda            (ARS / USD, reusar el mismo componente multimoneda que ya existe en Facturación)
   nota              (texto libre opcional)
   ```

4. **Dashboard de rentabilidad** (vista nueva o ampliación del dashboard actual) que cruza:
   - Ventas facturadas del mes (dato que ya existe)
   - Gasto en ads del mes, total y desglosado por plataforma (dato nuevo de este módulo)
   - Métricas derivadas: % de las ventas que "se fue" en publicidad, y si se quiere ir un paso más allá, costo de adquisición aproximado si se cruza con cantidad de pedidos del mes.

**Fuera de alcance v1, pero dejar la puerta abierta:** integración directa con Meta Ads API / Google Ads API / TikTok Ads API para traer el gasto automáticamente. Es viable a futuro (todas tienen API con reporting), pero cada una requiere OAuth propio y mantenimiento — no es prioridad mientras la carga manual (3 campos por mes) resuelve el 90% del valor con mucho menos esfuerzo de desarrollo.

---

## 6. Orden de implementación sugerido

1. Listas de precios conectadas a facturación automática (ya está casi resuelto, cerrar el último cable).
2. Módulo de gasto en Ads (carga manual) + dashboard de rentabilidad — bajo esfuerzo, altísimo valor percibido, no depende de ninguna API externa.
3. Alertas de recategorización de Monotributo — bajo esfuerzo (es lógica sobre datos propios), timing perfecto por las ventanas de recategorización.
4. Integración Tiendanube (Caso 1) — pedido pagado → factura + stock automático.
5. Integración Envíopack — cotización + guía desde la factura.
6. Mejora del flujo de Venta Rápida con link de pago MP embebido (Caso 2).
7. Shopify (mismo patrón que Tiendanube).
8. MercadoLibre.

---

## 7. Modelo de datos — campos nuevos a agregar (resumen técnico)

- **Producto:** `sku`, `peso_kg`, `alto_cm`, `ancho_cm`, `profundidad_cm` (necesarios para cotizar envío).
- **Contacto/Pedido:** vínculo a `external_order_id` + `external_platform` (tiendanube/shopify/manual) para evitar duplicar pedidos si llega el mismo evento dos veces (idempotencia — los webhooks pueden reenviarse).
- **Configuración de cuenta:** `categoria_monotributo_actual`, `condicion_fiscal`.
- **Nueva tabla:** `ad_spend` (ver sección 5).
- **Nueva tabla o config:** `categorias_monotributo_vigentes` (categoría, tope de ingresos brutos, **fecha de vigencia desde**, cargada manualmente por el equipo en el panel admin/mayor cada vez que ARCA actualiza la escala — fuente única: https://www.afip.gob.ar/monotributo/categorias.asp).

---

*Documento vivo — actualizar a medida que se validen supuestos con desarrollo o cambien las APIs de terceros (especialmente Tiendanube, que versiona su API, y las escalas de Monotributo, que se actualizan cada 6 meses).*
