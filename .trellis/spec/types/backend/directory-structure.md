# Directory Structure

> How `@zanelab/types` source code is organized.

---

## Overview

`@zanelab/types` uses a **flat `src/` directory** with a single barrel `index.ts`. Every type module lives as a sibling file and is re-exported through the barrel.

---

## Directory Layout

```
packages/types/
├── package.json          # "exports": { ".": "./src/index.ts" }
├── tsconfig.json
└── src/
    ├── index.ts          # barrel export — re-exports everything
    ├── config.ts         # Zod schemas and inferred types for app config
    ├── layout.ts         # Layout-related union types and LayoutCoreProps
    ├── menu.ts           # MenuRecordRaw, MenuProps
    └── sm-crypto.d.ts    # Ambient module declaration
```

---

## Module Organization

| File | Purpose | Examples |
|------|---------|----------|
| `index.ts` | Barrel export; also defines core interfaces | `MenuItem`, `UserInfo`, `LoginResult` |
| `config.ts` | Zod-first config validation schemas | `AppConfigSchema`, `MicroAppConfigSchema`, `IconDataSchema` |
| `layout.ts` | Layout type system (~30 properties) | `LayoutMode` (7 variants), `LayoutCoreProps` |
| `menu.ts` | Menu tree types (recursive) | `MenuRecordRaw` with `children` and `meta` |
| `sm-crypto.d.ts` | Ambient declarations for untyped modules | Declares `sm-crypto` module's SM4 API |

---

## Naming Conventions

- **Schema objects:** PascalCase suffixed with `Schema` — `AppConfigSchema`, `ApiConfigSchema`
- **Inferred types from schemas:** Same PascalCase without suffix — `type AppConfig = z.infer<typeof AppConfigSchema>`
- **Union types:** PascalCase descriptive names — `LayoutMode`, `HeaderMode`, `SidebarTheme`
- **Interface names:** PascalCase, descriptive — `MenuItem`, `UserInfo`, `MenuRecordRaw`
- **Files:** kebab-case for ambient declarations (`sm-crypto.d.ts`), otherwise camelCase
- **Exports:** each file exports its types; `index.ts` uses `export * from './module'`

---

## Adding a New Type Module

1. Create `src/new-module.ts`
2. Define types, interfaces, and/or Zod schemas
3. Add `export * from './new-module';` to `src/index.ts`

---

**Language:** All documentation should be written in **English**.