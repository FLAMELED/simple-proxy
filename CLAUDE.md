# simple-proxy

- La raíz es el proxy (Nitro + TypeScript, pnpm).
- `menu-gt/` es la app Mercadito, independiente del proxy. Sus reglas y comandos están en `menu-gt/CLAUDE.md`.
- `talleres-finanzas/` son las presentaciones de la serie «Finanzas del negocio con IA», independientes del proxy. Se editan en `talleres-finanzas/src/` y se generan con `node talleres-finanzas/scripts/build.mjs`; se prueban con `node talleres-finanzas/scripts/verificar.mjs <taller>`. Ver `talleres-finanzas/README.md`.
