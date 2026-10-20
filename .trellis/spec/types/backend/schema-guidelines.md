# Schema Guidelines

> How to write Zod schemas for validation in `@zanelab/types`.

---

## Overview

All runtime validation in this package uses **Zod** (v4.x). Schemas are defined in `packages/types/src/config.ts` and exported for consumption by other packages.

---

## Schema Definition Pattern

### Basic Structure

Every schema is an `export const` of a `z.object()` call. Each field declares its type, defaults, and constraints inline.

**From `packages/types/src/config.ts`:**

```ts
export const RouteConfigSchema = z.object({
  homePath: z.string(),
  forbiddenPath: z.string(),
  notFoundPath: z.string(),
});
```

### With Defaults

Use `.default()` for optional fields that have a sensible fallback:

```ts
export const ApiConfigSchema = z.object({
  baseURL: z.string(),
  menusEndpoint: z.string(),
  userInfoEndpoint: z.string(),
  loginEndpoint: z.string(),
  logoutEndpoint: z.string().optional(),
  useMock: z.boolean().default(false),
  agentBaseURL: z.string().default('/agent/api/v1'),
  userPerEndpoint: z.string().default('/home/user/getUserPer'),
});
```

**Rules:**
- `.optional()` — field may be absent (produces `T | undefined`)
- `.default(value)` — field is always present at parse time with fallback
- Prefer `.default()` for config fields with known defaults
- Use `.optional()` for genuinely missing data

---

## Nested Schemas

Compose schemas by referencing other schemas as field types:

```ts
export const AppConfigSchema = z.object({
  version: z.string(),
  system: SystemConfigSchema,        // nested object schema
  auth: AuthConfigSchema,
  api: ApiConfigSchema,
  route: RouteConfigSchema,
  layout: LayoutConfigSchema,
  preferences: PreferencesConfigSchema,
  session: SessionConfigSchema,
});
```

---

## Record Types

Use `z.record()` for string-keyed dictionaries:

```ts
export const MicroAppConfigSchema = z.object({
  name: z.string(),
  entry: z.string(),
  container: z.string(),
  activeRule: z.string(),
  props: z.record(z.string(), z.unknown()).default({}),
  prefetch: z.boolean().default(false),
});

// In AppConfigSchema:
microApps: z.record(z.string(), MicroAppConfigSchema).default({}),
icons: z.record(z.string(), IconDataSchema).default({}),
```

---

## Enum Types

Use `z.enum()` for constrained string sets:

```ts
export const LayoutConfigSchema = z.object({
  theme: z.enum(['light', 'dark']),
  layout: z.enum([
    'sidebar-nav',
    'mixed-nav',
    'sidebar-mixed-nav',
    'header-nav',
    'full-content',
    'header-mixed-nav',
    'header-sidebar-nav',
  ]).default('sidebar-nav'),
  authPageLayout: z.enum(['panel-center', 'panel-left', 'panel-right'])
    .default('panel-right'),
  fixedHeader: z.boolean(),
  showBreadcrumb: z.boolean(),
});
```

---

## Complex Defaults

For object fields with many defaults, use `.default()` with the full object value:

```ts
export const AuthConfigSchema = z.object({
  loginChannel: z.string().default('passport'),
  loginWithSm4: z.boolean().default(false),
  emailSuffix: z.string().default(''),
  loginOptions: z.object({
    showCodeLogin: z.boolean(),
    showQrcodeLogin: z.boolean(),
    showThirdPartyLogin: z.boolean(),
    showRegister: z.boolean(),
    showForgetPassword: z.boolean(),
    showRememberMe: z.boolean(),
    showColorToggle: z.boolean().default(true),
    showLayoutToggle: z.boolean().default(true),
  }).default({
    showCodeLogin: true,
    showQrcodeLogin: true,
    showThirdPartyLogin: true,
    showRegister: true,
    showForgetPassword: true,
    showRememberMe: true,
    showColorToggle: true,
    showLayoutToggle: true,
  }),
});
```

---

## Type Inference

Always derive the TypeScript type from the schema:

```ts
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type MicroAppConfig = z.infer<typeof MicroAppConfigSchema>;
export type IconData = z.infer<typeof IconDataSchema>;
```

**Rules:**
- Type name matches schema name without `Schema` suffix
- Always `export type` (not just `type`)
- Place type inference immediately after its schema definition

---

## Schema File Structure

All schemas live in `packages/types/src/config.ts`. Group by concern:

1. Sub-schemas: `SystemConfigSchema`, `AuthConfigSchema`, etc.
2. Record schemas: `MicroAppConfigSchema`, `IconDataSchema`
3. Root schema: `AppConfigSchema` — composes all sub-schemas
4. Inferred types: after each schema

---

## Forbidden Patterns

- **`z.any()`** — never use; always specify a concrete type
- **`z.object({}).passthrough()`** — explicitly define every field
- **Mixing `.optional()` and `.default()`** — pick one; they serve different purposes
- **Exporting schemas without corresponding inferred types** — always pair them

---

**Language:** All documentation should be written in **English**.