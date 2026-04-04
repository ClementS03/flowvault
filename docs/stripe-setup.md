# Stripe Setup — FlowVault

## Vue d'ensemble

```
Stripe Dashboard (test/live)
  └── Product "FlowVault Pro"  ($9/mo)
        ├── Price ID test  → price_1TITMnIEMd7KisSxfevrBgcs  (config.ts dev)
        └── Price ID live  → price_1TIQydIEMd7KisSxLz3c1CnH  (config.ts prod)

Variables d'environnement
  ├── Local (.env.local)        → clés TEST
  └── Vercel (env vars)         → clés TEST maintenant, LIVE quand prêt
```

---

## 1. Variables d'environnement

### Noms exacts attendus par le code

| Variable | Où | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Serveur uniquement | `sk_test_xxx` ou `sk_live_xxx` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client + Serveur | `pk_test_xxx` ou `pk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Serveur uniquement | `whsec_xxx` (différent local/Vercel) |

> ⚠️ `STRIPE_PUBLIC_KEY` dans Vercel est **inutilisé** — le code cherche `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
> Tu peux supprimer `STRIPE_PUBLIC_KEY` de Vercel.

### Où trouver les clés dans Stripe

- **Stripe Dashboard → Developers → API keys**
  - Publishable key → `pk_test_xxx` / `pk_live_xxx`
  - Secret key → `sk_test_xxx` / `sk_live_xxx`

---

## 2. config.ts — Price IDs

```ts
// config.ts
priceId: process.env.NODE_ENV === "development"
  ? "price_1TITMnIEMd7KisSxfevrBgcs"   // ← Price ID TEST (mode test Stripe)
  : "price_1TIQydIEMd7KisSxLz3c1CnH",  // ← Price ID LIVE (mode live Stripe)
```

**Important :** `prod_xxx` = Product ID (l'objet produit), `price_xxx` = Price ID (le tarif).
Le checkout Stripe a besoin du **Price ID**, pas du Product ID.

Pour retrouver tes Price IDs :
- Stripe Dashboard → Products → FlowVault Pro → copie l'ID sous le prix (commence par `price_`)

---

## 3. Webhook

Le webhook permet à Stripe de notifier FlowVault quand :
- Un paiement réussit → `plan = 'pro'`
- Un abonnement est annulé → `plan = 'free'`
- Un paiement échoue → `plan = 'free'`

### Webhook local (pour tester en localhost)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# → affiche un whsec_xxx LOCAL, différent du webhook Vercel
```

Colle ce `whsec_xxx` dans `.env.local` → `STRIPE_WEBHOOK_SECRET=whsec_xxx`

### Webhook Vercel (production/test en ligne)

1. Stripe Dashboard (mode **test**) → Developers → Webhooks → **Add endpoint**
2. URL : `https://flowvault.vercel.app/api/stripe/webhook`
3. Events à écouter :
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Save → copie le **Signing secret** (`whsec_xxx`)
5. Vercel → Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET` → colle la valeur

> ⚠️ Le `whsec_xxx` du CLI local et celui du webhook Vercel sont **différents**.
> `.env.local` a son propre secret, Vercel a le sien.

---

## 4. Tester sans payer (cartes de test Stripe)

| Carte | Résultat |
|---|---|
| `4242 4242 4242 4242` | Paiement accepté ✓ |
| `4000 0000 0000 9995` | Paiement refusé ✗ |
| `4000 0025 0000 3155` | Authentification 3DS requise |

- Date : n'importe quelle date future (ex: `12/29`)
- CVC : n'importe quoi (`123`)
- Email : ton email de compte FlowVault

### Tester en local

```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Navigateur → localhost:3000/pricing → Upgrade → carte 4242...
```

### Tester sur Vercel (sans payer)

Les clés `sk_test_` / `pk_test_` dans les env vars Vercel = mode test.
Le checkout accepte les cartes de test, aucun débit réel.

1. Vercel → Settings → Env vars → vérifie que `STRIPE_SECRET_KEY` commence par `sk_test_`
2. Va sur `https://flowvault.vercel.app/pricing` → Upgrade → carte `4242 4242 4242 4242`
3. Vérifie dans Supabase :
   ```sql
   SELECT plan, customer_id FROM profiles WHERE email = 'ton@email.com';
   -- Attendu : plan = 'pro', customer_id = 'cus_xxx'
   ```

---

## 5. Passer en production (quand prêt)

1. Dans Vercel, remplacer les valeurs :
   - `STRIPE_SECRET_KEY` : `sk_test_xxx` → `sk_live_xxx`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : `pk_test_xxx` → `pk_live_xxx`

2. Créer un **nouveau webhook** en mode **Live** dans Stripe :
   - Même URL : `https://flowvault.vercel.app/api/stripe/webhook`
   - Copier le nouveau `whsec_xxx` live
   - Remplacer `STRIPE_WEBHOOK_SECRET` dans Vercel

3. Redéployer sur Vercel (push un commit ou redeploy manuel).

---

## 6. Vérifier que tout fonctionne

```sql
-- Après un test de paiement réussi
SELECT id, plan, customer_id, component_count
FROM profiles
WHERE email = 'ton@email.com';

-- Résultat attendu
-- plan        = 'pro'
-- customer_id = 'cus_xxxxxx'
```

Dans le Stripe Dashboard (mode test) → Customers → tu dois voir ton compte avec un abonnement actif.
