# FlowVault Base Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the raw ShipFast boilerplate into a working FlowVault base — design system, navigation, and minimal stub pages for all Phase 1 routes.

**Architecture:** Remove DaisyUI entirely, inject FlowVault design tokens (CSS variables → Tailwind classes), wire Space Grotesk + Inter fonts, rewrite Header/Footer, create stub pages for `/`, `/upload`, `/dashboard`, `/browse`, `/c/[slug]`, and add the Webflow clipboard utility files.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS 3, Supabase Auth helpers, Space Grotesk + Inter (next/font/google)

---

### Task 1: Remove DaisyUI & rename package

**Files:**
- Modify: `package.json`

- [ ] Uninstall daisyui
```bash
npm uninstall daisyui
```
- [ ] Update `package.json` name field to `"flowvault"`
- [ ] Commit
```bash
git add package.json package-lock.json
git commit -m "chore: remove daisyui, rename package to flowvault"
```

---

### Task 2: Update types/config.ts

**Files:**
- Modify: `types/config.ts`

- [ ] Remove `Theme` type (DaisyUI theme names)
- [ ] Remove `theme` from `ConfigProps.colors`, keep only `main: string`
- [ ] Commit

---

### Task 3: Update config.ts — FlowVault branding

**Files:**
- Modify: `config.ts`

- [ ] Remove `import themes from "daisyui/src/theming/themes"`
- [ ] Set `appName: "FlowVault"`, `appDescription`, `domainName: "flowvault.io"`
- [ ] Set `colors.main: "#6366f1"` (accent indigo)
- [ ] Update mailgun fromNoReply / fromAdmin / supportEmail
- [ ] Commit

---

### Task 4: Update tailwind.config.js — FlowVault tokens

**Files:**
- Modify: `tailwind.config.js`

- [ ] Remove `require("daisyui")` from plugins and the `daisyui` config block
- [ ] Set `plugins: []`
- [ ] Add FlowVault color/font/spacing tokens under `theme.extend`
- [ ] Commit

---

### Task 5: Update globals.css — design system

**Files:**
- Modify: `app/globals.css`

- [ ] Remove all DaisyUI class overrides (`.btn`, `.btn-gradient`)
- [ ] Add `:root` CSS variables block (full FlowVault design system)
- [ ] Add base `body` / `h1-h6` font assignments
- [ ] Commit

---

### Task 6: Update layout.tsx — fonts + cleanup

**Files:**
- Modify: `app/layout.tsx`

- [ ] Replace `Inter` only import with `Space_Grotesk` + `Inter`
- [ ] Apply both font CSS variables to `<html>`
- [ ] Remove `data-theme` attribute (DaisyUI)
- [ ] Update `themeColor` to `#6366f1`
- [ ] Commit

---

### Task 7: Rewrite Header.tsx — FlowVault nav

**Files:**
- Modify: `components/Header.tsx`

- [ ] Replace DaisyUI classes with FlowVault design system classes
- [ ] Nav links: Browse (`/browse`), Upload (`/upload`)
- [ ] Right side: Dashboard link (auth) + Sign in button
- [ ] Commit

---

### Task 8: Rewrite Footer.tsx — FlowVault branding

**Files:**
- Modify: `components/Footer.tsx`

- [ ] Replace DaisyUI classes
- [ ] FlowVault branding, links: Browse, Upload, Privacy, ToS
- [ ] Commit

---

### Task 9: Landing page `/`

**Files:**
- Modify: `app/page.tsx`

- [ ] Replace ShipFast content with FlowVault hero section
- [ ] Headline + subline + two CTAs (Browse components / Upload yours)
- [ ] Include Header + Footer
- [ ] Commit

---

### Task 10: /upload stub

**Files:**
- Create: `app/upload/page.tsx`

- [ ] Auth-protected stub with paste zone (shows "Paste your Webflow component here")
- [ ] Redirect to /signin if not logged in (server component)
- [ ] Commit

---

### Task 11: /dashboard stub

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] Replace ShipFast dashboard content with FlowVault "My library" empty state
- [ ] Keep existing auth guard in `app/dashboard/layout.tsx`
- [ ] Commit

---

### Task 12: /browse stub

**Files:**
- Create: `app/browse/page.tsx`

- [ ] Public page, grid layout, empty state "No components yet"
- [ ] Commit

---

### Task 13: /c/[slug] stub

**Files:**
- Create: `app/c/[slug]/page.tsx`

- [ ] Public page, component detail layout stub
- [ ] "Copy to Webflow" button placeholder
- [ ] Commit

---

### Task 14: Create libs/copyToWebflow.ts

**Files:**
- Create: `libs/copyToWebflow.ts`

- [ ] Implement clipboard copy using DataTransfer + execCommand
- [ ] Commit

---

### Task 15: Create components/ClipboardBridge.tsx + wire into layout

**Files:**
- Create: `components/ClipboardBridge.tsx`
- Modify: `app/layout.tsx`

- [ ] Hidden textarea bridge for clipboard operations
- [ ] Add `<ClipboardBridge />` inside `<body>` in layout.tsx
- [ ] Commit
