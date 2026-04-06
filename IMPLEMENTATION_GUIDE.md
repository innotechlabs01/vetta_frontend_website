# GUÍA DE IMPLEMENTACIÓN - FASE 0 (CRÍTICA)

## ⏱️ Tiempo Total: 30-45 minutos

Sigue este checklist para arreglar los problemas críticos que impiden que el sistema funcione.

---

## PASO 1: Ejecutar Migraciones SQL (15 minutos)

### 1.1 Acceder a Supabase Dashboard

```bash
# Abrir en navegador:
https://app.supabase.com/

# Selecciona tu proyecto
# Ir a: SQL Editor → New Query
```

### 1.2 Copiar y ejecutar las migraciones

Abre el archivo:
```
MIGRATIONS_CRITICAL.sql
```

Copia TODO el contenido y ejecuta en Supabase SQL Editor.

**Verificación post-ejecución:**
```sql
-- Confirmar que las columnas existen
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'shift_id';
-- Debe retornar: shift_id

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'daily_limit_usd';
-- Debe retornar: daily_limit_usd
```

---

## PASO 2: Cambiar org_id Cookie a httpOnly (5 minutos)

### 2.1 Editar archivo

Abre: `src/app/api/org/select/route.ts`

Busca las líneas con `response.cookies.set`:

```typescript
// ❌ ANTES (líneas 41-46)
response.cookies.set("org_id", orgId, {
  path: "/",
  httpOnly: false,  // ❌ VULNERABLE
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

// ✅ DESPUÉS
response.cookies.set("org_id", orgId, {
  path: "/",
  httpOnly: true,   // ✅ PROTEGIDO
  sameSite: "strict", // ✅ MÁS SEGURO
  secure: true,      // ✅ HTTPS SOLO
  maxAge: 60 * 60 * 24 * 7, // 7 días
});
```

Guarda el archivo.

---

## PASO 3: Remover MOCK_USER_ID de Producción (10 minutos)

### 3.1 Arreglar src/app/actions.ts

Abre: `src/app/actions.ts`

Busca (líneas 10-13):
```typescript
const MOCK_USER_ID = "50205784-0c11-4c8a-8a02-6184607e2a1a";
const MOCK_AUTH_ENABLED = 
  process.env.NODE_ENV !== "production" && 
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";
```

**Reemplaza con:**
```typescript
// ✅ Mock solo en desarrollo, con advertencia clara
const MOCK_USER_ID = "50205784-0c11-4c8a-8a02-6184607e2a1a";
const MOCK_AUTH_ENABLED = 
  process.env.NODE_ENV === "development" && // ✅ EXPLÍCITO
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";

if (MOCK_AUTH_ENABLED) {
  console.warn("[DEVELOPMENT ONLY] Using mock authentication");
}
```

### 3.2 Arreglar src/app/api/org/select/route.ts

Abre: `src/app/api/org/select/route.ts`

Busca (líneas 7-10):
```typescript
const MOCK_USER_ID = "50205784-0c11-4c8a-8a02-6184607e2a1a";
const mockAuth = 
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";
```

**Reemplaza con:**
```typescript
const MOCK_USER_ID = "50205784-0c11-4c8a-8a02-6184607e2a1a";
const mockAuth = 
  process.env.NODE_ENV === "development" && // ✅ EXPLÍCITO
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";

if (mockAuth) {
  console.warn("[DEVELOPMENT ONLY] Mock auth enabled");
}
```

Guarda el archivo.

---

## PASO 4: Desplegar Cambios (5-10 minutos)

### 4.1 Commit y push

```bash
cd /Users/frg/Documents/GreenStudio/cf-re-app

# Agregar cambios
git add -A

# Commit descriptivo
git commit -m "fix(critical): Add missing DB columns and fix security issues

- Add sales.shift_id column (fixes sales module)
- Add customers.daily_limit_usd column (fixes customers module)
- Change org_id cookie to httpOnly: true (IDOR fix)
- Make mock auth development-only (prevent prod bypass)

BREAKING: These changes are required for system operation"

# Push a main/production
git push origin main
```

### 4.2 Desplegar a Cloudflare

```bash
# Build
npm run build

# Deploy
npm run deploy
```

O si usas Cloudflare Pages:
```bash
# Solo push a git, Pages despliega automáticamente
```

### 4.3 Esperar a que despliegue

Monitorear en:
- Cloudflare Dashboard
- GitHub Actions (si está configurado)

---

## PASO 5: Verificar que Funciona (5 minutos)

### 5.1 Probar módulo Sales

1. Ir a: https://tuapp.com/dashboard/sales
2. Debe cargar sin error
3. Si hay error: Check BD logs en Supabase

### 5.2 Probar módulo Customers

1. Ir a: https://tuapp.com/dashboard/customers
2. Crear nuevo cliente
3. Debe guardar sin error

### 5.3 Probar POS (crear venta)

1. Ir a: https://tuapp.com/dashboard/pos/new
2. Agregar items al carrito
3. Completar venta
4. Debe guardar sin error

### 5.4 Probar seguridad de cookie

En DevTools Console:
```javascript
// Debe estar VACÍO (httpOnly protection)
console.log(document.cookie);

// No debe mostrar org_id
```

---

## CHECKLIST DE VERIFICACIÓN

```
✅ PASO 1: Migraciones SQL ejecutadas
   └─ [ ] sales.shift_id existe
   └─ [ ] customers.daily_limit_usd existe
   └─ [ ] Índices creados correctamente

✅ PASO 2: Cookie segura
   └─ [ ] httpOnly: true
   └─ [ ] sameSite: strict
   └─ [ ] secure: true

✅ PASO 3: Mock auth seguro
   └─ [ ] NODE_ENV check añadido
   └─ [ ] Cambio en actions.ts
   └─ [ ] Cambio en org/select/route.ts

✅ PASO 4: Despliegue
   └─ [ ] Commit enviado
   └─ [ ] Deploy completado
   └─ [ ] Sin errores en logs

✅ PASO 5: Verificación
   └─ [ ] Sales carga sin error
   └─ [ ] Customers funciona
   └─ [ ] POS crea venta
   └─ [ ] Cookie protegida
```

---

## SIGUIENTES PASOS (Después de Fase 0)

### Fase 1 (Esta Semana):
- [ ] Implementar server-side validation para cálculos financieros
- [ ] Agregar CSRF tokens
- [ ] Proxy Google Maps API

### Fase 2 (Próxima Semana):
- [ ] Optimizar queries N+1
- [ ] Agregar virtualization
- [ ] Agregar error boundaries

### Fase 3 (2-3 Semanas):
- [ ] Refactorizar POS component
- [ ] Implementar Zustand
- [ ] Agregar tests

---

## TROUBLESHOOTING

### Error: "relation \"public.sales\" does not exist"

**Solución:** Las migraciones no se ejecutaron. Volver a Paso 1.

### Error: "column \"shift_id\" of relation \"sales\" already exists"

**Solución:** La columna ya existe. Ignorar el error (IF NOT EXISTS protege).

### El deployment no actualiza

**Solución:**
```bash
# Clear cache y rebuild
rm -rf .next
npm run build
npm run deploy
```

### Cookie sigue sin httpOnly

**Solución:**
1. Verificar que el archivo fue guardado
2. Verificar que el build incluye cambios
3. Hacer hard refresh en navegador (Ctrl+Shift+R)
4. Revisar en DevTools que no hay "org_id" en document.cookie

---

## CONTACTO Y SOPORTE

Si necesitas ayuda:
1. Revisar AUDIT_REPORT.md para análisis detallado
2. Verificar que todos los pasos fueron ejecutados
3. Revisar logs en Supabase y Cloudflare

---

**Estimado de Tiempo Total:** 30-45 minutos
**Riesgo:** Muy Bajo (cambios puntuales y probados)
**Impacto:** Crítico (Sistema no funciona sin estos cambios)
