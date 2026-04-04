# FlowVault — Stripe Phase 3 Design Spec

**Date:** 2026-04-04
**Branch:** feature/stripe
**Status:** Approved
**Language:** All UI text in English

---

## Overview

Add Stripe subscriptions to FlowVault. Free users can store up to 10 components. Pro users ($9/month) get unlimited components. ShipFast already provides the checkout and portal infrastructure — what's missing is the webhook, the pricing page, the upgrade CTA, and the enforcement wiring.

---

## What ShipFast already provides (don't rewrite)

- `libs/stripe.ts` — `createCheckout`, `createCustomerPortal`, `findCheckoutSession`
- `app/api/stripe/create-checkout/route.ts` — POST endpoint, auth-gated
- `app/api/stripe/create-portal/route.ts` — POST endpoint, auth-gated
- `components/ButtonCheckout.tsx` — calls create-checkout, redirects to Stripe
- `components/ButtonAccount.tsx` — has billing portal link built in
- `profiles` table already has `plan text DEFAULT 'free'` and will need `customer_id text`

---

## Architecture — 3 blocs

### Bloc 1 — Webhook (pièce centrale)

**Route:** `app/api/stripe/webhook/route.ts`

Reçoit les events Stripe via POST. Vérifie la signature avec `STRIPE_WEBHOOK_SECRET`. Gère 3 events :

| Event | Action |
|---|---|
| `checkout.session.completed` | `profiles.plan = 'pro'` + `profiles.customer_id = customerId` |
| `customer.subscription.deleted` | `profiles.plan = 'free'` |
| `invoice.payment_failed` | `profiles.plan = 'free'` |

Le `clientReferenceId` dans la session Stripe = `user.id` Supabase → permet de retrouver le profil.
Utilise `supabaseAdmin` (service role) pour les updates DB — pas de session auth dans le webhook.
La route doit être `export const dynamic = 'force-dynamic'` et lire le body en raw (`req.text()`) pour la vérification de signature Stripe.

### Bloc 2 — Pricing page + Upgrade flow

**Page `/pricing`**
- Layout 2 colonnes : Free | Pro
- Free : liste des limites (10 components, etc.)
- Pro : liste des avantages + `ButtonCheckout` avec `priceId` depuis `config.ts` + `mode="subscription"`
- Accessible depuis le header (lien "Pricing") et le dashboard

**Modal d'upgrade inline**
- Déclenché dans `UploadSlideOver` quand `plan === 'free'` et `component_count >= 10`
- Simple overlay avec message + bouton "Upgrade to Pro" → redirect `/pricing`
- Pas de checkout direct depuis le modal (évite la complexité)

**Bannière dashboard**
- Affichée dans `/dashboard` si `plan === 'free'` et `component_count >= 8`
- Message : "You're using X/10 free components. Upgrade for unlimited."
- CTA → `/pricing`

### Bloc 3 — Enforcement Server Action

Dans `createComponent` (déjà partiellement implémenté) :

```typescript
if (profile.plan === 'free' && profile.component_count >= 10) {
  throw new Error('FREE_LIMIT_REACHED')
}
```

L'`UploadSlideOver` catch cette erreur et affiche le modal d'upgrade au lieu d'un toast d'erreur générique.

---

## Database — colonne manquante

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS customer_id text;
```

À exécuter dans le SQL Editor Supabase avant de tester.

---

## Config Stripe

Dans `config.ts`, le `priceId` est déjà structuré (env-aware dev/prod). Il faut juste mettre les vrais IDs une fois le produit créé dans Stripe Dashboard.

```typescript
priceId: process.env.NODE_ENV === "development"
  ? "price_xxxxx_test"   // Stripe test mode price ID
  : "price_xxxxx_live"   // Stripe live mode price ID
```

---

## Variables d'environnement requises

| Variable | Où la trouver |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → signing secret |

En local, utiliser le Stripe CLI pour forwarder les webhooks :
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Le CLI donne un `whsec_...` temporaire à mettre dans `.env.local`.

---

## Flux complet

```
User clique "Upgrade to Pro"
→ /pricing page
→ ButtonCheckout (priceId, mode="subscription")
→ POST /api/stripe/create-checkout
  → createCheckout() → Stripe Checkout Session URL
→ redirect Stripe Checkout
→ User paie
→ Stripe envoie checkout.session.completed au webhook
→ /api/stripe/webhook
  → vérifie signature
  → retrouve user via clientReferenceId
  → UPDATE profiles SET plan='pro', customer_id=xxx
→ User revient sur /dashboard (successUrl)
→ plan='pro' → limite levée → upload illimité
```

```
User annule son abo
→ Stripe envoie customer.subscription.deleted
→ webhook → UPDATE profiles SET plan='free'
→ User limité à 10 components (ceux existants restent, upload bloqué au-delà)
```

---

## UI — pages et composants à créer/modifier

| Fichier | Action |
|---|---|
| `app/api/stripe/webhook/route.ts` | **Créer** — webhook handler |
| `app/pricing/page.tsx` | **Créer** — pricing page Free vs Pro |
| `components/UpgradeModal.tsx` | **Créer** — modal affiché quand limite atteinte |
| `components/UpgradeBanner.tsx` | **Créer** — bannière dashboard 8+/10 |
| `app/dashboard/page.tsx` | **Modifier** — afficher bannière si proche limite |
| `components/UploadSlideOver.tsx` | **Modifier** — catch FREE_LIMIT_REACHED, afficher UpgradeModal |
| `components/Header.tsx` | **Modifier** — ajouter lien "Pricing" |
| `components/ButtonCheckout.tsx` | **Modifier** — remplacer classes DaisyUI par design system |

---

## Ce qui n'est PAS dans ce scope

- Stripe Connect (partage de revenus avec créateurs) — Phase 5
- Coupons / codes promo — peut être activé dans Stripe Dashboard sans code
- Essai gratuit (trial) — pas prévu pour le MVP Pro
- Annual billing — peut être ajouté plus tard comme second plan

---

## Test checklist (local)

- [ ] `stripe listen --forward-to localhost:3000/api/stripe/webhook` actif
- [ ] Checkout avec carte test `4242 4242 4242 4242`
- [ ] Vérifier `profiles.plan = 'pro'` dans Supabase après paiement
- [ ] Vérifier que l'upload fonctionne sans limite après upgrade
- [ ] Annuler l'abo dans Stripe Dashboard → vérifier `plan = 'free'`
- [ ] Vérifier blocage upload à 10 components en mode free
- [ ] Tester le Customer Portal (annulation, update carte)
