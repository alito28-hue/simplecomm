# Guion — Video tutorial "Conectá tu empresa con ARCA"

Para el placeholder "Video tutorial próximamente" en `/dashboard/tutoriales/certificado-afip`.

**Duración estimada:** 3:30 – 4:00 min
**Método cubierto:** Delegación (Método 1 — el que recomendamos a la mayoría de los clientes, no requiere generar archivos)
**Tono:** cercano, paso a paso, sin jerga técnica. Hablarle a alguien que nunca entró a ARCA.

---

## ESCENA 1 — Intro (0:00–0:15)
**Visual:** Logo de SimpleComm + título en pantalla: *"Conectá tu empresa con ARCA en 5 minutos"*

**Narración:**
> "Hola! En este video te mostramos cómo autorizar a SimpleComm para emitir tus facturas ante ARCA. Es un trámite que hacés una sola vez, no necesitás instalar nada ni generar archivos, y te lleva menos de diez minutos."

---

## ESCENA 2 — Qué vamos a hacer (0:15–0:35)
**Visual:** Diagrama simple en pantalla: *Vos (tu CUIT) → autorizás → SimpleComm factura en tu nombre*

**Narración:**
> "Le vas a dar permiso al CUIT de SimpleComm para que pueda emitir comprobantes electrónicos en tu nombre dentro de ARCA. Esto se llama 'delegación', y es el método que recomendamos: es el más rápido y no tiene partes técnicas complicadas."

**Texto en pantalla (call-out):** "✅ No subís archivos · ✅ No instalás nada · ✅ Lo hacés una sola vez"

---

## ESCENA 3 — Paso 1: Entrar a ARCA (0:35–1:00)
**Visual:** Grabación de pantalla — abrir `https://auth.afip.gob.ar/contribuyente_/login.xhtml`, ingresar CUIT y Clave Fiscal

**Narración:**
> "Primero, entrá al portal de ARCA con tu Clave Fiscal nivel 3. Si todavía no la tenés, se saca gratis en cualquier oficina de ARCA presentando tu DNI."

**Texto en pantalla:** "Clave Fiscal nivel 3 → trámite gratuito en ARCA"

---

## ESCENA 4 — Paso 2: Buscar "Administrador de Relaciones" (1:00–1:25)
**Visual:** Zoom en el menú principal, buscar y hacer clic en *"Administrador de Relaciones de Clave Fiscal"*

**Narración:**
> "Una vez adentro, buscá la opción 'Administrador de Relaciones de Clave Fiscal'. La encontrás en el menú principal, o podés escribirla directamente en el buscador de arriba."

---

## ESCENA 5 — Paso 3: Crear la nueva relación (1:25–2:10)
**Visual:** Clic en *"Nueva Relación"*, completar el formulario con los dos datos clave (resaltarlos con un recuadro o flecha en edición)

**Narración:**
> "Hacé clic en 'Nueva Relación'. Ahí vas a cargar dos datos: el CUIT de SimpleComm, que es 30-71537162-2, y el servicio 'Facturador Plus - Web Services - W S F E'. Con esto, le estás dando permiso a SimpleComm para usar ese servicio puntual de facturación electrónica en tu nombre — nada más que eso."

**Texto en pantalla (recuadro destacado):**
```
CUIT representante: 30-71537162-2
Servicio: Facturador Plus - Web Services - wsfe
```

---

## ESCENA 6 — Paso 4: Crear el Punto de Venta (2:10–2:55)
**Visual:** Navegar a *"Mis Aplicaciones Web" → "Administración de Puntos de Venta"*, crear uno nuevo tipo "Web Services", mostrar el número asignado

**Narración:**
> "Ahora necesitamos un punto de venta especial para facturar electrónicamente. Andá a 'Mis Aplicaciones Web' y, dentro, a 'Administración de Puntos de Venta'. Creá uno nuevo, elegí el tipo 'Web Services' y ponele el nombre que quieras — por ejemplo, 'SimpleComm'. ARCA te va a asignar un número: anotalo, porque lo vamos a necesitar en el próximo paso."

**Texto en pantalla:** "📝 Anotá el número de punto de venta — lo necesitás en el paso siguiente"

---

## ESCENA 7 — Paso 5: Volver a SimpleComm y finalizar (2:55–3:25)
**Visual:** Cambiar a la pantalla de SimpleComm → onboarding → paso de configuración ARCA, elegir "Delegación", ingresar el número de punto de venta, clic en "Finalizar configuración"

**Narración:**
> "Volvé a SimpleComm, al paso de configuración de ARCA dentro del onboarding. Elegí la opción 'Delegación', ingresá el número de punto de venta que anotaste, y tocá 'Finalizar configuración'. Y listo — ya quedaste habilitado para emitir tus facturas."

---

## ESCENA 8 — Cierre (3:25–3:45)
**Visual:** Pantalla de confirmación / checklist de onboarding completo, logo SimpleComm

**Narración:**
> "Eso es todo. Si te trabás en algún paso, nuestro equipo te ayuda sin costo — solo abrí un ticket de soporte desde el panel y te acompañamos hasta que quede funcionando. ¡Nos vemos en el próximo video!"

**Texto en pantalla (cierre):** "¿Dudas? Soporte SimpleComm — sin costo adicional"

---

## Notas de producción

- **Si el cliente prefiere "Certificado propio"** (Método 2, requiere generar archivos con openssl): no lo cubrimos en este video porque agrega pasos técnicos para un público que mayormente no los necesita. Se puede grabar un segundo video corto más adelante, o derivarlos a la guía escrita + soporte.
- **Grabación de pantalla:** usar resolución 1920x1080, cursor agrandado, zoom/recuadros en los campos clave (CUIT, servicio, número de punto de venta) para que se lean bien en celular.
- **Subtítulos:** agregar subtítulos en español — buena parte de los clientes lo ven en el celular sin audio.
- **Dónde va:** reemplaza el bloque `videoPlaceholder` en [page.tsx](../../src/app/dashboard/tutoriales/certificado-afip/page.tsx#L19-L25) por un `<video>` o embed una vez grabado.
