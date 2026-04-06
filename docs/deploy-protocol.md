# Protocolo de despliegue

Este repositorio despliega a Cloudflare Workers con OpenNext. A fecha de `2026-03-05`:

- El Worker es `cf-re-app`.
- No hay `worker.ts` custom en el repo.
- No hay `triggers.crons` ni `scheduled()` activos.
- El runtime usa variables `NEXT_PUBLIC_*` para Supabase en cliente, así que este proyecto no puede reducirse solo a `SUPABASE_URL` y `SUPABASE_ANON_KEY` sin refactor adicional.

## Archivos que sí forman parte del protocolo

- `.env.production.secrets`
  - Ignorado por Git.
  - Fuente única para `cf:check`, `cf:preview`, `cf:deploy` y `cf:secrets:bulk`.
- `.env.supabase.local`
  - Ignorado por Git.
  - Fuente única para `supabase:status`, `supabase:link`, `supabase:dry-run`, `supabase:push` y `supabase:pull`.
- `supabase/migrations/*.sql`
  - Source of truth del esquema remoto.

## Variables de producción

Obligatorias para este repo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Compatibilidad legacy:

- `SUPABASE_SERVICE_ROLE` sigue siendo aceptada por el código actual como fallback.

Variables necesarias solo si usas mapas/lugares:

```env
GOOGLE_MAPS_API_KEY_SECRET=<server-maps-key>
GOOGLE_PLACES_API_KEY_SECRET=<server-places-key>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-maps-key>
```

Variables que no aplican hoy:

- `WEATHER_*`: no hay cron de clima activo en este repo.
- `NEXTJS_ENV`: no se usa en este proyecto.

## Cloudflare

Autenticación:

```bash
npx wrangler whoami
```

Subir secretos:

```bash
npm run cf:secrets:bulk
```

Fallback compatible con `wrangler 3.107.3` si `secret bulk` falla:

```bash
npm run cf:secrets:sync
```

Notas de runtime:

- `NEXT_PUBLIC_*` se consumen en build y no se intentan re-subir con `cf:secrets:sync`.
- `wrangler.json` usa `keep_vars: true` para no borrar bindings remotos gestionados fuera del archivo.

Chequear build + dry run:

```bash
npm run cf:check
```

Preview local sobre runtime de Cloudflare:

```bash
npm run cf:preview
```

Deploy a producción:

```bash
npm run cf:deploy
```

Verificación posterior:

```bash
npx wrangler secret list
npx wrangler deployments list
```

## Supabase remoto

Estado de acceso y link actual:

```bash
npm run supabase:status
```

Link explícito al proyecto remoto:

```bash
npm run supabase:link
```

Revisar qué migraciones se aplicarían:

```bash
npm run supabase:dry-run
```

Aplicar migraciones a remoto:

```bash
npm run supabase:push
```

Si `db push --dry-run` falla porque el remoto tiene versiones que no existen en `supabase/migrations/`, primero normaliza el baseline:

```bash
npm run supabase:pull
git add supabase/migrations
git commit -m "chore: baseline supabase remote schema"
```

Después de eso, el flujo normal es:

```bash
npx supabase migration new nombre_del_cambio
npm run supabase:dry-run
npm run supabase:push
```
