# Directory Structure

> How `@zanelab/types` is organized for frontend consumers.

---

## Package Layout

```
packages/types/
├── package.json
└── src/
    ├── index.ts          # barrel: MenuItem, UserInfo, LoginResult + re-exports
    ├── config.ts         # AppConfigSchema + inferred AppConfig, MicroAppConfig, IconData
    ├── layout.ts         # LayoutMode, LayoutCoreProps (~30 layout properties)
    ├── menu.ts           # MenuRecordRaw (recursive tree), MenuProps
    └── sm-crypto.d.ts    # Ambient sm-crypto module declaration
```

---

## Key Files for Frontend Consumers

| File | Key Exports | Used By |
|------|-------------|---------|
| `index.ts` | `MenuItem`, `UserInfo`, `LoginResult` | Auth flows, user menus |
| `menu.ts` | `MenuRecordRaw`, `MenuProps` | Navigation, sidebar, breadcrumbs |
| `layout.ts` | `LayoutMode`, `LayoutCoreProps`, `SidebarTheme`, `BuiltinThemeType` | Layout engine, theme switching |
| `config.ts` | `AppConfigSchema`, `AppConfig`, `MicroAppConfig` | Config loading and validation |

---

## Consumer Pattern

Frontend apps import from this package as a single entry point:

```ts
// types only (zero runtime cost):
import type { MenuRecordRaw, LayoutCoreProps } from '@zanelab/types';

// with runtime validation:
import { AppConfigSchema, type AppConfig } from '@zanelab/types';
```

---

**Language:** All documentation should be written in **English**.