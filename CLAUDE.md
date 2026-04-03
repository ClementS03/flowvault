# FlowVault — CLAUDE.md
> Marque : **Vault** · Produit : **FlowVault** · Ancien nom repo : webflow-extractor

---

## Ce qu'est ce projet

**FlowVault** est une marketplace de partage de composants Webflow.
Les utilisateurs stockent leurs composants Webflow (JSON clipboard), les partagent via un lien unique, et la communauté les copie directement dans le Webflow Designer en un clic.

Modèle de référence : copyflow.io
Marque ombrelle : **Vault** (StackVault + FlowVault)

---

## Historique du projet

| Date | Événement |
|---|---|
| Initial | `webflow-extractor` — outil React→Webflow (parsing JSX, génération XscpData) |
| 2026-04-03 | **Pivot complet** → FlowVault (marketplace de partage) |
| 2026-04-03 | Spec Phase 1 approuvée — voir `docs/superpowers/specs/2026-04-03-flowvault-phase1-design.md` |

Le code de l'extracteur est conservé dans ce repo mais n'est plus le produit principal.
Deux fichiers sont réutilisés dans FlowVault :
- `src/lib/copyToWebflow.ts` → mécanisme clipboard
- `src/components/ClipboardBridge.tsx` → textarea bridge

---

## Repo de départ FlowVault

**Fork de :** `ClementS03/ship-fast-ts-supabase` (privé — ShipFast TS + Supabase)

ShipFast fournit d'entrée :
- Auth Supabase (Google OAuth + Magic Link email)
- Stripe (checkout, webhooks, portal client) — utilisé en Phase 3
- Resend (emails transactionnels)
- Middleware de protection des routes
- Landing page, pricing page, dashboard basique
- Table `profiles` + trigger Supabase
- SEO (sitemap, meta, robots)
- Config centrale dans `config.ts`

---

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Next.js | 14 (ShipFast) | Framework (App Router, Server Actions) |
| TypeScript | 5.x | Typage |
| Tailwind CSS | 3.x | Styles (design system custom, PAS DaisyUI) |
| Supabase | — | Auth + PostgreSQL + Storage |
| Stripe | — | Abonnements (Phase 3) |
| Resend | — | Emails (magic links) |
| Vercel | — | Hosting + deploy |
| Space Grotesk | Google Fonts | Font headings |
| Inter | Google Fonts | Font body |

---

## Design system

```css
:root {
  --color-bg:         #ffffff;      /* Fond blanc */
  --color-surface:    #fafafe;      /* Cards, panels */
  --color-border:     #f1f3f8;      /* Bordures légères */
  --color-ink:        #0f172a;      /* Texte primaire */
  --color-ink-2:      #64748b;      /* Texte secondaire */
  --color-ink-3:      #94a3b8;      /* Texte tertiaire */
  --color-accent:     #6366f1;      /* Indigo — CTA, liens actifs */
  --color-accent-h:   #4f46e5;      /* Hover accent */
  --color-accent-bg:  #eef2ff;      /* Background accent léger */
  --font-heading:     'Space Grotesk', sans-serif;
  --font-body:        'Inter', sans-serif;
  --max-width:        1200px;
  --nav-height:       3.5rem;
  --px-site:          clamp(1rem, 4vw, 2.5rem);
}
```

Ambiance : blanc épuré + indigo premium. Vibe Linear/Notion. Épuré, moderne, premium.

**NE PAS** utiliser DaisyUI (présent dans ShipFast — le retirer).
**NE PAS** revenir au dark theme de l'ancien extracteur.

---

## Architecture routes

| Route | Accès | Description |
|---|---|---|
| `/` | Public | Landing page FlowVault |
| `/browse` | Public | Marketplace — composants publics |
| `/c/[slug]` | Public | Page d'un composant (Copy to Webflow) |
| `/dashboard` | Auth | Ma bibliothèque (mes composants) |
| `/upload` | Auth | Zone de paste + formulaire |
| `/signin` | Public | Auth Supabase (ShipFast) |
| `/api/components` | Auth | CRUD composants |
| `/api/components/[id]/copy` | Public | Track les copies + retourne JSON signé |
| `/api/stripe/*` | — | ShipFast inchangé |

---

## Schéma base de données

### Table `components` (nouvelle)
```sql
id          uuid PK
user_id     uuid → auth.users
name        text NOT NULL
description text
category    text  -- 'hero' | 'navbar' | 'pricing' | 'footer' | 'feature' | 'other'
tags        text[]
slug        text UNIQUE  -- URL : /c/[slug]
json_path   text  -- Supabase Storage path
is_public   boolean DEFAULT false
copy_count  integer DEFAULT 0
created_at  timestamptz
updated_at  timestamptz
```

### Table `copies` (nouvelle)
```sql
id            uuid PK
component_id  uuid → components
user_id       uuid → auth.users (nullable)
copied_at     timestamptz
```

### Table `profiles` (ShipFast — ajouts)
```sql
-- Colonnes ajoutées :
component_count  integer DEFAULT 0
plan             text DEFAULT 'free'  -- 'free' | 'pro'
```

### Storage Supabase
```
bucket: components-json (private)
  └── {user_id}/{component_id}.json
```

---

## Flux clés

### Upload (Ctrl+C depuis Webflow → Ctrl+V dans FlowVault)
```
/upload → zone de paste → paste event
→ clipboardData.getData('application/json')
→ validation XscpData (@webflow/XscpData)
→ formulaire (name, description, category, tags, is_public)
→ Server Action :
  1. génère slug unique
  2. upload JSON → Supabase Storage
  3. INSERT components
  4. UPDATE profiles.component_count
→ redirect /c/[slug]
```

### Copy to Webflow (depuis /c/[slug])
```
Bouton "Copy to Webflow"
→ fetch JSON depuis Supabase Storage (signed URL)
→ execCommand('copy') + clipboardData.setData('application/json', json)
→ POST /api/components/[id]/copy (incrémente copy_count)
→ feedback "Copied! Paste in Webflow Designer (Ctrl+V)"
```

---

## Limites freemium

| | Free | Pro |
|---|---|---|
| Composants stockés | 10 | Illimité |
| Copies reçues | Illimitées | Illimitées |
| Composants publics | Illimités | Illimités |

Vérification dans Server Action upload :
```typescript
if (profile.plan === 'free' && profile.component_count >= 10) {
  throw new Error('Free plan limit reached.')
}
```

---

## Roadmap phases

### Phase 1 — MVP ✅ Spec approuvée
Auth + Upload + Stockage + Lien de partage + Copy to Webflow + Dashboard basique

### Phase 2 — Marketplace & Discovery
Browse complet · Recherche full-text · Filtres (catégorie, tags) · Tri (trending, newest) · Favoris

### Phase 3 — Abonnement
Stripe Pro illimité · Enforcement limites free · Upgrade flow · Portail facturation (ShipFast déjà câblé)

### Phase 4 — Polish & Growth
Preview visuel des composants · Collections · Analytics créateur · Embed widget · API publique

### Phase 5 — Rewards
Système de récompenses : badges créateur · Commissions sur copies · Limites boostées pour contributeurs actifs

---

## Points de vigilance

### Clipboard — mécanisme de copie
Le JSON Webflow se lit ET s'écrit uniquement via `DataTransfer.setData/getData('application/json')` dans un copy/paste event synchrone. `navigator.clipboard.write/read()` ne supporte pas ce type MIME.

**Upload (Webflow → FlowVault) :**
```typescript
element.addEventListener('paste', (e) => {
  const json = e.clipboardData?.getData('application/json')
  if (!json) return
  const data = JSON.parse(json)
  if (data.type !== '@webflow/XscpData') return
  // proceed...
})
```

**Copy (FlowVault → Webflow) :** voir `src/lib/copyToWebflow.ts` (réutilisé)

### DaisyUI — à retirer
ShipFast inclut DaisyUI. **Le retirer** et remplacer par le design system custom.
```bash
npm uninstall daisyui
# Retirer de tailwind.config.js : plugins: []
```

### Supabase Storage — accès privé
Bucket `components-json` = **privé**. Accès via signed URLs générées côté serveur uniquement.
Ne jamais exposer la service role key côté client.

### Slug de partage
Format : `{name-slugifié}-{6 chars aléatoires}` → ex: `hero-section-a3f8x2`
Garantit l'unicité sans exposer l'UUID interne.

### RLS obligatoire
Toutes les tables ont RLS activé. Ne jamais bypasser avec la service role key côté client.

---

## Commandes (repo FlowVault)

```bash
npm run dev      # Dev server (localhost:3000)
npm run build    # Build production
npm run lint     # ESLint
npx tsc --noEmit # Typecheck
```

---

## Spec complète Phase 1
`docs/superpowers/specs/2026-04-03-flowvault-phase1-design.md`

---

## Premier démarrage dans le repo FlowVault (ShipFast)

**Contexte :** Le repo de départ est `ClementS03/ship-fast-ts-supabase` (privé).
Il contient du code générique ShipFast qui doit être adapté à FlowVault.
Faire ces étapes dans l'ordre avant d'ajouter des features.

### 1. Retirer DaisyUI — PRIORITÉ 1
ShipFast inclut DaisyUI par défaut. Il faut le retirer complètement.
```bash
npm uninstall daisyui
```
Dans `tailwind.config.js` : supprimer `require('daisyui')` des plugins.
Dans tous les composants : remplacer les classes DaisyUI (`btn`, `card`, `modal`…) par le design system custom.

### 2. Mettre à jour `config.ts`
Fichier central ShipFast — tout y passer en revue :
```typescript
// Adapter ces champs :
appName: "FlowVault"
appDescription: "Store, share and copy Webflow components in one click"
domainName: "flowvault.io"  // ou le domaine réel
// Stripe plans : adapter les price IDs et les limites free/pro
// Crisp ID : garder ou remplacer par un autre support chat
```

### 3. Installer les fonts FlowVault
```typescript
// Dans layout.tsx (next/font/google) :
import { Space_Grotesk, Inter } from 'next/font/google'
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
```

### 4. Remplacer le design system dans `globals.css`
Supprimer les variables DaisyUI/ShipFast, injecter le design system FlowVault :
```css
:root {
  --color-bg: #ffffff;
  --color-surface: #fafafe;
  --color-border: #f1f3f8;
  --color-ink: #0f172a;
  --color-ink-2: #64748b;
  --color-ink-3: #94a3b8;
  --color-accent: #6366f1;
  --color-accent-h: #4f46e5;
  --color-accent-bg: #eef2ff;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --max-width: 1200px;
  --nav-height: 3.5rem;
  --px-site: clamp(1rem, 4vw, 2.5rem);
}
```

### 5. Mettre à jour `tailwind.config.js`
Mapper les tokens CSS → classes Tailwind (retirer DaisyUI) :
```javascript
theme: {
  extend: {
    colors: {
      bg: 'var(--color-bg)',
      surface: 'var(--color-surface)',
      border: 'var(--color-border)',
      ink: 'var(--color-ink)',
      'ink-2': 'var(--color-ink-2)',
      'ink-3': 'var(--color-ink-3)',
      accent: 'var(--color-accent)',
      'accent-h': 'var(--color-accent-h)',
      'accent-bg': 'var(--color-accent-bg)',
    },
    fontFamily: {
      heading: 'var(--font-heading)',
      body: 'var(--font-body)',
    },
    maxWidth: { site: 'var(--max-width)' },
    spacing: { nav: 'var(--nav-height)', site: 'var(--px-site)' },
  },
  plugins: [],  // PAS de DaisyUI
}
```

### 6. Ajouter les tables Supabase
Exécuter dans le SQL Editor Supabase (dashboard) :
```sql
-- Table components
create table public.components (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  category text,
  tags text[] default '{}',
  slug text unique not null,
  json_path text not null,
  is_public boolean default false,
  copy_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.components enable row level security;
create policy "Public read" on public.components for select using (is_public = true);
create policy "Own read" on public.components for select using (auth.uid() = user_id);
create policy "Own insert" on public.components for insert with check (auth.uid() = user_id);
create policy "Own update" on public.components for update using (auth.uid() = user_id);
create policy "Own delete" on public.components for delete using (auth.uid() = user_id);

-- Table copies
create table public.copies (
  id uuid default gen_random_uuid() primary key,
  component_id uuid references public.components on delete cascade not null,
  user_id uuid references auth.users on delete set null,
  copied_at timestamptz default now()
);
alter table public.copies enable row level security;
create policy "Anyone can insert copy" on public.copies for insert with check (true);

-- Ajouts à profiles
alter table public.profiles add column if not exists component_count integer default 0;
alter table public.profiles add column if not exists plan text default 'free';

-- Bucket Storage (faire dans le dashboard Supabase → Storage)
-- Créer bucket: components-json, Private
```

### 7. Créer le bucket Supabase Storage
Dans le dashboard Supabase → Storage → New bucket :
- Nom : `components-json`
- Public : **NON** (private)

### 8. Copier les fichiers depuis `_reuse/`
Depuis le repo `webflow-extractor` :
- `_reuse/copyToWebflow.ts` → `libs/copyToWebflow.ts`
- `_reuse/ClipboardBridge.tsx` → `components/ClipboardBridge.tsx`
- Ajouter `<ClipboardBridge />` dans `app/layout.tsx`

### 9. Vérifier les variables d'environnement
ShipFast nécessite ces `.env.local` — vérifier qu'elles sont toutes renseignées :
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=           # peut attendre Phase 3
STRIPE_WEBHOOK_SECRET=       # peut attendre Phase 3
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # peut attendre Phase 3
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 10. Pages à créer (Phase 1)
Une fois le setup fait, créer dans l'ordre :
1. `/upload` — zone de paste + formulaire (Server Action)
2. `/dashboard` — ma bibliothèque (remplace le dashboard ShipFast générique)
3. `/c/[slug]` — page publique d'un composant + Copy button
4. `/browse` — marketplace publique (grille de composants)
5. Refonte `/` — landing page FlowVault (remplace la landing ShipFast)

### 11. Pages ShipFast à conserver (ne pas toucher)
- `/signin` — auth Supabase (Google + Magic Link), fonctionnel as-is
- `/api/auth/callback` — callback OAuth, ne pas modifier
- `/api/stripe/*` — garder en l'état pour Phase 3
- `/api/lead` — email capture, peut servir pour une waitlist

---

## Fichiers ShipFast à adapter (pas créer from scratch)

| Fichier | Ce qui change |
|---|---|
| `config.ts` | appName, appDescription, domainName, Stripe plans |
| `app/layout.tsx` | Fonts FlowVault, ajouter ClipboardBridge |
| `app/globals.css` | Design system FlowVault (tokens CSS) |
| `tailwind.config.js` | Tokens → classes Tailwind, retirer DaisyUI |
| `app/page.tsx` | Landing page FlowVault (remplacer contenu ShipFast) |
| `app/dashboard/page.tsx` | Transformer en "Ma bibliothèque" |
| `components/Header.tsx` | Nav FlowVault (Browse, Upload, Dashboard) |
| `components/Footer.tsx` | Branding FlowVault |
| `libs/supabase.ts` | Vérifier config, ne pas modifier la logique |
