# Material para reclamo a ARCA/AFIP — Facturación electrónica delegada rechazada

**Fecha del problema:** desde ~2026-06 hasta la fecha (2026-07-06), persiste sin resolverse.

## 1. Qué estamos tratando de hacer

SimpleComm es un sistema de facturación electrónica. Para nuestros clientes que no
tienen certificado digital propio ante AFIP, facturamos **en su nombre** usando el
certificado digital de un tercero (**Mocla S.A.**, CUIT 30715371622), mediante el
mecanismo estándar de ARCA de **delegación de servicio a través de "Administrador de
Relaciones de Clave Fiscal"**.

Esto es exactamente el mismo modelo que usan otros proveedores de facturación
electrónica del mercado (Facturitas y similares): el cliente delega el servicio
"Facturación Electrónica" a la CUIT del proveedor, el proveedor acepta la designación,
y a partir de ahí el proveedor puede emitir comprobantes en nombre del cliente usando
su propio certificado, indicando el CUIT del cliente en cada llamada.

**CUITs involucrados en este caso de prueba:**
- **Representada / cliente (delegante):** BARBOZA MARIA DE LUJAN — CUIT **27265774747** — Monotributista Categoría C.
- **Representante / proveedor de facturación (delegado):** MOCLA S.A. — CUIT **30715371622**.
- Usuario que opera ARCA en nombre de Mocla S.A.: Alex Smith (CUIT/CUIL 20-27310308-3), Administrador de Relaciones de Mocla S.A.

## 2. Sistemas que conectamos

- **SimpleComm** (aplicación web de facturación, Next.js, alojada en Vercel).
- **Gateway** (servicio propio nuestro, Fastify + Prisma, alojado en Railway) que se
  conecta directamente por SOAP a los webservices de AFIP:
  - **WSAA** (`https://wsaa.afip.gov.ar/ws/services/LoginCms`) — autenticación, obtiene
    el Ticket de Acceso (TA).
  - **WSFEv1** (`https://servicios1.afip.gov.ar/wsfev1/service.asmx`) — facturación
    electrónica (ambiente de **producción**, no homologación).
- El certificado digital utilizado para autenticar contra WSAA es el de Mocla S.A.:
  - Subject del certificado: `CN=clubsorteos, serialNumber=CUIT 30715371622`
  - Emisor: `CN=Computadores, O=AFIP, C=AR`
  - Vigencia: 2026-06-03 a 2028-06-02
  - (El "CN=clubsorteos" es solo un alias interno del certificado, es el mismo CUIT
    30715371622 el que figura en el serialNumber, que es el dato que valida AFIP.)

## 3. Pasos que ya hicimos en el portal de ARCA (confirmados con capturas de pantalla)

1. **Desde la cuenta de María** (CUIT 27265774747), en *Administrador de Relaciones de
   Clave Fiscal* → **Nueva Relación** → Representado: ella misma → Servicio:
   **"Facturación Electrónica (Nivel de seguridad mínimo requerido 3)"** → se delegó el
   WebService a un tercero, CUIT **30715371622 (MOCLA S.A.)** → Confirmar.
2. **Desde la cuenta de Mocla S.A.** (usuario Alex Smith), en *Administrador de
   Relaciones* → **Consultar** → *"Mis Relaciones Pendientes"* → se **aceptó** la
   designación pendiente para el servicio Facturación Electrónica, representado
   27265774747.
3. Se **revocó y volvió a crear** esta relación más de una vez para descartar un estado
   corrupto — la más reciente, **recreada y aceptada el mismo día 2026-07-06**.
4. Confirmado en el listado de *Administrador de Relaciones* (ambos lados, con
   "Consultar") que el estado de la relación es:
   `Representado 27265774747 | Representante 30715371622 | Servicio: Facturación
   Electrónica | Delegable: SI | Aceptada: SI`
5. Confirmado en *Consulta de Usuario* de María (Sistema Registral) que **30-71537162-2
   (Mocla S.A.)** figura listado en "Representantes del Usuario".
6. Confirmado en *Administración de Puntos de Venta y Domicilios* de María que el
   **Punto de Venta N° 2** está dado de alta con:
   - Sistema: **"Factura Electrónica - Monotributo - Web Services"**
   - Domicilio: FISCAL - 0001 - AV. MAYOR IRUSTA 3777 - BELLA VISTA - BUENOS AIRES
   - Estado: habilitado (no dado de baja)

## 4. Qué falla exactamente

Al intentar facturar (llamada real a producción, hoy 2026-07-06), el primer método
WSFE que se invoca (`FECompUltimoAutorizado`, que solo consulta el último número de
comprobante autorizado — ni siquiera llega a pedir el CAE) devuelve:

```
WSFE FECompUltimoAutorizado error 600: ValidacionDeToken: No aparecio CUIT en lista de relaciones: 27265774747
```

Esto ocurre de manera consistente y repetida, en producción, en múltiples intentos a
lo largo de varios días.

## 5. La evidencia técnica clave: el Ticket de Acceso (TA) real no refleja la relación

Para descartar cualquier problema de caché o de nuestro código, pedimos un **Ticket de
Acceso nuevo, en el momento**, directamente a WSAA de AFIP, con el certificado de
Mocla S.A., para el servicio `wsfe`, el 2026-07-06. Este es el TA real que AFIP emitió
(no es una respuesta simulada ni cacheada de otro momento):

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sso version="2.0">
    <id src="CN=wsaa, O=AFIP, C=AR, SERIALNUMBER=CUIT 33693450239" dst="CN=wsfe, O=AFIP, C=AR"
        unique_id="..." gen_time="..." exp_time="..."/>
    <operation type="login" value="granted">
        <login entity="33693450239" service="wsfe"
               uid="SERIALNUMBER=CUIT 30715371622, CN=clubsorteos"
               authmethod="cms" regmethod="22">
            <relations>
                <relation key="30715371622" reltype="4"/>
            </relations>
        </login>
    </operation>
</sso>
```

**El punto crítico:** dentro de `<relations>`, el TA solo trae la relación de Mocla
consigo mismo (`key="30715371622" reltype="4"`, autorrepresentación). **No aparece
ninguna entrada para el CUIT delegante 27265774747 (María)**, a pesar de que el
Administrador de Relaciones muestra esa delegación específica como "Aceptada: SI".

Esto demuestra que hay una **inconsistencia entre lo que muestra el portal web
"Administrador de Relaciones" y lo que efectivamente autoriza el servicio WSAA al
emitir el Ticket de Acceso real** — que es, en definitiva, la fuente de verdad que usa
WSFE para validar cada llamada.

## 6. Lo que ya descartamos de nuestro lado (para que no se vuelva a pedir verificar)

- ✅ Certificado digital correcto, CUIT 30715371622 coincide con Mocla S.A.
- ✅ Login WSAA exitoso, sin errores.
- ✅ `Auth.Cuit` enviado en cada llamada WSFE es exactamente `27265774747` (11
  caracteres, sin espacios ni prefijos).
- ✅ Servicio solicitado es exactamente `wsfe` (no wsfe homologación, no otro).
- ✅ Ambiente: producción, no homologación.
- ✅ Relación aceptada, verificada desde ambos lados (María y Mocla) y también desde
  Consulta de Usuario / Sistema Registral.
- ✅ Punto de venta de María dado de alta correctamente como Web Services.
- ✅ Probado también revocando y recreando la relación de cero, más de una vez.

## 7. Preguntas concretas para hacerle a ARCA

1. ¿Por qué el Ticket de Acceso (TA) que emite WSAA para el servicio "Facturación
   Electrónica" con el certificado de Mocla S.A. (CUIT 30715371622) **no incluye** la
   relación de delegación con CUIT 27265774747, si el Administrador de Relaciones
   muestra esa delegación como "Aceptada: SI"?
2. ¿Cuánto tiempo puede tardar en propagarse una aceptación de delegación desde el
   portal de Administrador de Relaciones hasta que WSAA la refleje en los TAs que
   emite? (Ya pasaron varios días desde la primera aceptación, y horas desde la
   recreación más reciente del 2026-07-06.)
3. ¿Existe algún paso de configuración adicional — más allá de "Nueva Relación" +
   "Aceptación de Designación" en Administrador de Relaciones, y el alta del Punto de
   Venta tipo Web Services — necesario para que un tercero facture electrónicamente en
   nombre de un Monotributista?
4. ¿El `reltype="4"` es el tipo de relación correcto que debería aparecer para este
   tipo de delegación de terceros, o debería ser otro valor?

## 8. Si piden reproducir el error

Podemos repetir la llamada real a WSFE en cualquier momento y volver a capturar tanto
la respuesta de error como el TA fresco correspondiente, para confrontarlo en el
momento con soporte de ARCA si hiciera falta.
