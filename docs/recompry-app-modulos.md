# Recompry App - Modulos y Areas

## 1) Vision general

Recompry App es el centro de operaciones de:

- La tienda online.
- El POS (Punto de Venta).
- Funciones conectadas a fidelizacion, integraciones y configuracion operativa.

La app combina:

- Funciones web/online (Next.js + Supabase).
- Funciones de escritorio (Electron bridge) para hardware local como impresoras y apertura de caja.

## 2) Arquitectura funcional

### 2.1 Capa online (web)

- Frontend y rutas: Next.js App Router.
- Datos: Supabase (auth, tablas operativas, storage).
- Contexto de organizacion activa: `org_id` en cookie + `getEnvironment()`.

Archivos clave:

- `src/lib/get-env.ts`
- `src/app/(dashboard)/layout.tsx`
- `src/context/EnvironmentContext.tsx`

### 2.2 Capa escritorio (Electron)

Cuando existe bridge de Electron (`window.electron`), la app habilita:

- Listado y seleccion de impresoras.
- Impresion de documentos POS (comanda, precuenta, factura/ticket).
- Apertura de caja.

Si no existe bridge, la app mantiene funcionamiento online y algunas pantallas pasan a modo manual.

Archivos clave:

- `src/context/PrinterContext.tsx`
- `src/utils/printer.ts`
- `src/app/(dashboard)/pos/new/page.tsx`
- `src/app/(dashboard)/settings/print-zones/page.tsx`

## 3) Multitenant y cambio de entorno

Recompry App es multitenant. La organizacion activa define los datos visibles y operables en cada modulo.

### 3.1 Como se determina la organizacion actual

- Se usa cookie `org_id`.
- `getEnvironment()` carga:
  - `org` actual.
  - `memberRole`.
  - `profile`.
  - `user`.
- Si no hay org valida, dashboard redirige a selector de organizacion.

Archivos clave:

- `src/app/page.tsx`
- `src/app/org/select/page.tsx`
- `src/app/api/org/select/route.ts`
- `src/components/sidebar.tsx`
- `src/components/OrgSync.tsx`

### 3.2 Flujo de switch de organizacion

1. Usuario cambia organizacion desde sidebar.
2. Se llama `POST /api/org/select`.
3. Se persiste `org_id`.
4. Se emite evento cross-tab con `localStorage` (`org:changed`).
5. Se refresca/recarga la UI para rehidratar el entorno nuevo.

### 3.3 Regla operativa critica

Toda consulta de negocio debe depender de `organization_id` (y cuando aplique `location_id`) para no mezclar datos entre tenants.

## 4) Modulos operativos principales

### 4.1 Inicio (dashboard)

- Resumen de ventas, clientes, tickets y rendimiento por rango de fechas.
- Consume datos transaccionales filtrados por la organizacion activa.

Archivo clave:

- `src/app/(dashboard)/home/page.tsx`

### 4.2 Punto de Venta (POS)

- Flujo principal de venta/compra.
- Carrito, cliente, metodos de pago, propina sugerida.
- Impresion de comanda, precuenta y ticket final.
- Apertura de caja desde bridge Electron cuando esta disponible.

Archivo clave:

- `src/app/(dashboard)/pos/new/page.tsx`

### 4.3 Pedidos

- Gestion de pedidos/ventas registradas.
- Incluye reimpresion de documentos en entorno con bridge.

Archivo clave:

- `src/app/(dashboard)/sales/page.tsx`

### 4.4 Inventario

- Productos, categorias, opciones, modificadores, bodegas y demas estructuras del catalogo.

Rutas base:

- `/items`
- `/items/categories`
- `/items/modifiers`
- `/items/options`
- `/items/warehouse`

### 4.5 Clientes

- Base de clientes y segmentacion.
- Relacion con historial de compra y componentes de fidelizacion.

Rutas base:

- `/customers`
- `/customers/segments`

### 4.6 Online

Incluye 2 bloques:

- Configuracion de marca online:
  - Banner, logos, descripcion, colores y redes.
  - Slug de organizacion para presencia online.
- QR Codes:
  - Creacion/edicion de contextos QR por sucursal y modo.
  - Activacion/pausa.
  - Metricas de visitas.

Archivos clave:

- `src/app/(dashboard)/online/OnlineModule.tsx`
- `src/app/(dashboard)/online/qr-codes/page.tsx`
- `src/app/(dashboard)/online/QrCodesModule.tsx`
- `src/app/(dashboard)/online/actions.ts`

### 4.7 Fidelizacion

- Gestion de recompensas, condiciones, beneficios, vigencias y productos asociados.

Archivos clave:

- `src/app/(dashboard)/loyalty/page.tsx`
- `src/app/(dashboard)/loyalty/LoyaltyModule.tsx`
- `src/app/actions.ts` (`getLoyaltyRewardsAction`, `createLoyaltyRewardAction`, `updateLoyaltyRewardAction`)

### 4.8 Informes

- Modulo de reportes de transacciones y balance.
- En sidebar puede condicionarse por entorno (ejemplo: visible en no-produccion).

Rutas base:

- `/reports`
- `/reports/transactions`
- `/reports/balance`

## 5) Modulos de configuracion (Settings)

### 5.1 General

- Datos del negocio, categoria, propina sugerida, branding y seleccion de impresora activa.

Archivos clave:

- `src/app/(dashboard)/settings/general/page.tsx`
- `src/app/(dashboard)/settings/general/Orgsettings.tsx`

### 5.2 Sucursales

- CRUD de sucursales.
- Direccion, horarios, estado, cobertura y configuracion operativa local.

Archivo clave:

- `src/app/(dashboard)/settings/locations/page.tsx`

### 5.3 POS Terminales

- Registro y administracion de terminales POS por organizacion/sucursal.
- Estado activo, metadatos y control operativo.

Archivo clave:

- `src/app/(dashboard)/settings/pos-terminals/page.tsx`

### 5.4 Zonas de impresion

- Asignacion de impresoras por zona (ejemplo: cocina, barra).
- Soporta seleccion desde lista de impresoras si hay bridge.
- Fallback manual de nombre de impresora si no hay bridge de escritorio.

Archivo clave:

- `src/app/(dashboard)/settings/print-zones/page.tsx`

### 5.5 Pagos

- Vista informativa de proveedores/metodos habilitados y canal de contacto para habilitaciones.

Archivo clave:

- `src/app/(dashboard)/settings/payments/page.tsx`

### 5.6 Integraciones

Actualmente el modulo permite conectar/configurar:

- Alegra.
- Siigo.
- Wompi.
- WhatsApp.

Patron de persistencia:

- Tabla `integrations`.
- `upsert` por `organization_id + provider`.
- `auth_method`, `encrypted_credentials`, `credentials_metadata`.

Archivo clave:

- `src/app/(dashboard)/settings/integrations/page.tsx`

### 5.7 Usuarios

- Listado, busqueda y eliminacion de miembros de la organizacion.
- Alta de usuarios con rol y asignacion de sucursales segun rol.

Archivos clave:

- `src/app/(dashboard)/settings/users/page.tsx`
- `src/app/(dashboard)/settings/users/createuser.tsx`
- `src/app/api/admin/org-users/route.ts`
- `src/app/actions.ts` (`createOrgUserAction`)

## 6) Impresion y bridge Electron (detalle)

La capa de impresion funciona mediante `window.electron` con capacidades:

- `listPrinters()`
- `getSelectedPrinter()`
- `setSelectedPrinter()`
- `printDocument()`
- `openDrawer()`

Comportamiento:

- `PrinterContext` detecta bridge y sincroniza impresora seleccionada.
- La seleccion se guarda en `localStorage` (`recompry.pos.printer`).
- POS usa `printDocument` para cocina/precuenta/factura.
- Zonas de impresion reutilizan la misma base de impresoras.

## 7) Integraciones (detalle funcional)

Cada proveedor tiene formulario especifico y validaciones basicas de campos:

- Alegra: `username + api_token`.
- Siigo: `username + token`.
- Wompi: `private_key + integrity_secret`.
- WhatsApp: `phone_number_id + access_token`.

Estado de conexion:

- Se considera conectado cuando existe registro del proveedor en tabla `integrations` para la organizacion actual.

## 8) Usuarios, roles y ACL

### 8.1 Roles actuales

Roles presentes en codigo:

- `owner`
- `admin`
- `manager`
- `member`
- `viewer` (tipado en entorno, no expuesto en formulario actual)

Nota:

- De momento los roles son genericos y no existe una matriz granular completa por modulo/accion.

### 8.2 Estado actual del control de acceso

- `EnvironmentContext` expone `isAdmin` y `hasPermission`.
- `hasPermission` hoy retorna acceso total para `owner/admin` y restringe los demas, pero no implementa una matriz fina por permiso.
- En backend hay validaciones puntuales por membresia y por rol en ciertas acciones criticas.

Conclusiones de estado actual:

- ACL funcional pero basica/generica.
- Recomendado evolucionar a permisos por capacidad (ejemplo: `users.read`, `users.manage`, `pos.refund`, `settings.integrations.write`).

## 9) Convenciones operativas recomendadas

- Siempre leer `org` actual desde `getEnvironment()` o `useEnvironment()`.
- No ejecutar consultas de negocio sin filtro de organizacion.
- Para roles no administrativos, validar alcance por sucursal (`location_members`) en servicios sensibles.
- Mantener separadas:
  - configuracion online.
  - configuracion POS/hardware.
  - configuracion de seguridad/usuarios.
