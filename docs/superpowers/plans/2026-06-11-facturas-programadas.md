# Facturas Programadas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo completo de programaciones mensuales, confirmaciones, historial, notificaciones y ejecución automática.

**Architecture:** La aplicación Next.js administra programaciones y oportunidades en Supabase. Un motor puro calcula fechas y estados; un endpoint cron idempotente genera/v vence oportunidades y emite mediante el gateway existente. Las páginas y APIs autenticadas permiten administrar y confirmar oportunidades.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, Resend, Node test runner, gateway ARCA existente.

---

### Task 1: Modelo de datos y motor mensual

**Files:**
- Create: `supabase/migrations/20260611_scheduled_invoices.sql`
- Create: `src/lib/scheduled-invoices/types.ts`
- Create: `src/lib/scheduled-invoices/schedule.ts`
- Create: `src/lib/scheduled-invoices/schedule.test.ts`
- Modify: `package.json`

- [ ] Escribir pruebas fallidas para ajuste de fines de semana, días inexistentes, vencimiento y límites.
- [ ] Ejecutar `npm run test:scheduled` y comprobar que falla por funciones ausentes.
- [ ] Implementar funciones puras de calendario y decisión de finalización.
- [ ] Ejecutar `npm run test:scheduled` y comprobar que pasa.
- [ ] Crear migración con `scheduled_invoices`, `scheduled_invoice_occurrences`, índices y RLS.

### Task 2: Servicio de emisión y proceso diario

**Files:**
- Create: `src/lib/scheduled-invoices/issue.ts`
- Create: `src/lib/scheduled-invoices/notifications.ts`
- Create: `src/lib/scheduled-invoices/runner.ts`
- Create: `src/app/api/cron/facturas-programadas/route.ts`
- Modify: `src/app/api/invoices/issue/route.ts`

- [ ] Extraer una función reutilizable para emitir y enviar facturas con clave idempotente.
- [ ] Implementar notificaciones de campana y email de organización.
- [ ] Implementar proceso idempotente para vencer, generar, notificar y emitir oportunidades.
- [ ] Proteger el endpoint cron con `CRON_SECRET`.
- [ ] Verificar tipos y lint de los archivos.

### Task 3: APIs de administración y confirmación

**Files:**
- Create: `src/app/api/facturas-programadas/route.ts`
- Create: `src/app/api/facturas-programadas/[id]/route.ts`
- Create: `src/app/api/facturas-programadas/[id]/estado/route.ts`
- Create: `src/app/api/facturas-programadas/oportunidades/[id]/confirmar/route.ts`
- Create: `src/app/api/facturas-programadas/oportunidades/[id]/reintentar/route.ts`

- [ ] Implementar listado y creación con validación.
- [ ] Implementar detalle y edición limitada a futuras oportunidades.
- [ ] Implementar pausa, reanudación y cancelación.
- [ ] Implementar confirmación y reintentos idempotentes.
- [ ] Verificar autorización por organización en todas las rutas.

### Task 4: Interfaz del módulo

**Files:**
- Create: `src/app/dashboard/facturacion/programadas/page.tsx`
- Create: `src/app/dashboard/facturacion/programadas/[id]/page.tsx`
- Create: `src/app/dashboard/facturacion/programadas/programadas.module.css`
- Modify: `src/components/Sidebar.tsx`

- [ ] Crear listado con estados, progreso, próxima fecha y acciones.
- [ ] Crear formulario de alta con contacto, datos fiscales, monto, modalidad y fin.
- [ ] Crear detalle con configuración, controles e historial de oportunidades.
- [ ] Agregar acceso en el menú Facturación.
- [ ] Verificar diseño responsive.

### Task 5: Verificación integral

**Files:**
- Modify: `docs/superpowers/plans/2026-06-11-facturas-programadas.md`

- [ ] Ejecutar `npm run test:scheduled`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build`.
- [ ] Revisar `git diff --check` y el estado del repositorio.
- [ ] Confirmar cobertura de todos los criterios de aceptación sin realizar deploy.
