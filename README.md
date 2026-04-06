# Recompry App

Repositorio principal de la app de Recompry.

## Intro general

Este proyecto es una aplicacion multitenant y multinegocio.

- Cada usuario puede pertenecer a una o varias organizaciones.
- La organizacion activa define los datos visibles, el alcance operativo y los permisos.
- El sistema usa un centralizador/orquestador de negocio (organizacion actual) como base para:
  - consultas,
  - contexto operativo,
  - control de acceso.

En terminos practicos, toda operacion depende del entorno activo (`org_id`) y de la membresia/rol del usuario en esa organizacion.

## Stack

- Next.js (App Router)
- Supabase (Auth, DB, Storage)
- Cloudflare Workers (deploy)
- Electron bridge para funciones locales de POS (impresion y hardware)

## Documentacion funcional

Documentacion disponible en `docs/`:

- [Modulos y areas de Recompry App](./docs/recompry-app-modulos.md)
- [Protocolo de despliegue](./docs/deploy-protocol.md)

## Setup local

Instalacion:

```bash
npm install
```

Configurar variables locales segun el flujo que vayas a usar:

- Deploy y preview de Cloudflare: crea `.env.production.secrets` desde `.env.production.secrets.example`.
- CLI remoto de Supabase: crea `.env.supabase.local` desde `.env.supabase.local.example`.
- Desarrollo con `npm run dev`: si lo necesitas, crea tu `.env.development.local` manualmente usando las mismas variables publicas de Supabase/Maps.

Ejecutar en desarrollo:

```bash
npm run dev
```

## Deploy

```bash
npm run preview
npm run deploy
```

Para el flujo completo de producción y migraciones remotas, usa [docs/deploy-protocol.md](./docs/deploy-protocol.md).

# vetta_frontend_website