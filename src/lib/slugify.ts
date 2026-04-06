// lib/slugify.ts
export function slugify(input: string) {
  return input
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'org';
}