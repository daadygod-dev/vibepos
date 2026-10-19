# vibe-pos

A configurable, multi-business-type POS platform-as-a-service.

## Structure

```
vibe-pos/
├── apps/
│   ├── desktop/        # Tauri desktop POS app (offline-first)
│   └── vendor/         # Vendor Control Panel (web, config management)
├── packages/
│   ├── config-schema/  # Shared TypeScript types (PosConfig, RoleDefinition, Permission)
│   └── ui-kit/         # Shared Tailwind UI components
└── server/             # Hono REST API (config delivery + sync + Stripe billing)
```

## Business Types Supported
- 🍽️ Restaurant / Café
- 🛒 Grocery / Supermarket  
- 🏨 Hotel / Hospitality

## Key Features
- **Dynamic role builder** — define custom roles + permissions per customer
- **Offline-first** — SQLite local DB, works with no internet
- **Smart sync** — triggers on shift close, idle, end-of-day
- **Stripe billing** — monthly subscriptions, auto license enforcement
- **Config hot-reload** — branding, features, roles update live on sync

## Getting Started

```bash
# Install dependencies
npm install

# Start vendor panel
npm run dev:vendor

# Start API server
npm run dev:server

# Start desktop app (requires Rust + Tauri CLI)
cd apps/desktop && npm run tauri dev
```
