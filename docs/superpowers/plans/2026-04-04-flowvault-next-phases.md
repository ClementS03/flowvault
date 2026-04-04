# FlowVault — Plan des prochaines phases

> **État au 2026-04-04** — MVP complet déployé sur https://flowvault-ten.vercel.app/
> **Dernière mise à jour :** 2026-04-04

---

## Ce qui est en production (résumé)

- Auth (Google OAuth + Magic Link)
- Upload JSON Webflow → Storage Supabase + formulaire (nom, desc, catégorie, tags, image, visibilité)
- Username gate : impossible de publier en "Anonymous"
- Dashboard library : ComponentRow avec édition, suppression, toggle public/privé
- `/c/[slug]` : page publique + Copy to Webflow + auteur + "More from @user" + PasswordGate
- `/browse` : marketplace avec filtres catégorie/tag + cards riches avec auteur
- `/u/[username]` : profil public avec composants + avatar + stats
- Landing page : hero + how it works + bottom CTA (statique)
- Sécurité : access control, password hash, signed URLs, defense-in-depth

---

## Phase 3 — Stripe Pro *(priorité suivante)*

ShipFast a déjà tout câblé (checkout, webhook, portail). Ce qui reste :

**Config `config.ts` :**
- Mettre à jour les `priceId` Stripe (mensuel/annuel)
- Adapter les plans Free/Pro aux limites FlowVault

**Vérifier le webhook** `app/api/webhook/stripe/route.ts` :
- Sur `checkout.session.completed` → `profiles.plan = 'pro'` ✅ (déjà présent ShipFast)
- Sur `customer.subscription.deleted` → repasser `plan = 'free'` (vérifier que c'est géré)

**Page pricing** `app/pricing/page.tsx` :
- Adapter le contenu ShipFast au pricing FlowVault
- Free : 10 composants stockés / Pro : illimité

**Enforcement** :
- Limite 10 composants déjà active dans `createComponent` ✅
- Bouton "Upgrade" dans le dashboard quand la limite est atteinte (à ajouter)

**Plans :**
| | Free | Pro |
|---|---|---|
| Composants stockés | 10 | Illimité |
| Copies reçues | ∞ | ∞ |
| Composants publics | ∞ | ∞ |

---

## Pages légales *(à faire avant ou en même temps que Stripe)*

**Obligatoires en France (entreprise) :**

| Page | Obligatoire | Contenu clé |
|---|---|---|
| `/legal/mentions-legales` | ✅ Loi française | Éditeur, hébergeur, SIRET, siège social |
| `/legal/privacy` | ✅ RGPD | Données collectées, finalités, durée conservation, droits utilisateurs |
| `/legal/terms` | ✅ si vente (Stripe) | CGU + CGV, conditions d'abonnement, remboursements |
| `/legal/cookies` | ✅ CNIL | Types de cookies, consentement |

**Implémentation :**
- Pages statiques simples sous `app/legal/[page]/page.tsx` ou fichiers séparés
- Liens dans le Footer (à ajouter)
- Bandeau cookies si analytics/tracking (pas urgent si pas encore de tracking)

**Note :** Le contenu juridique est à rédiger par toi (ou un avocat) — je peux générer des templates mais ils ne constituent pas un conseil juridique.

---

## Phase 4 — Acquisition

Pas de code — actions marketing :

- **Product Hunt** : lancement une fois le Stripe en place
- **Communautés Webflow** : Webflow Forum, Reddit r/webflow, Discord Webflow
- **Twitter/X** : partager des composants, montrer le workflow
- **YouTube** : demo "Comment partager un composant Webflow en 30 secondes"

---

## Phase 2b — Social Graph *(après acquisition)*

À faire quand t'as des utilisateurs actifs. Sans audience, follow/save ne servent à rien.

**Tables DB à créer (quand le moment vient) :**
```sql
CREATE TABLE public.follows (
  follower_id uuid references auth.users NOT NULL,
  following_id uuid references auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE public.saves (
  user_id uuid references auth.users NOT NULL,
  component_id uuid references public.components NOT NULL,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, component_id)
);
```

**Features :**
- Bouton Follow sur `/u/[username]`
- Bouton Save (cœur) sur `/c/[slug]`
- Onglet "Saved" dans le dashboard
- Feed "Following" dans le dashboard

**→ Brainstormer avec `/brainstorming` avant d'implémenter.**

---

## Phase 2a — Recherche full-text *(déprioritisée)*

Les filtres catégorie + tag suffisent pour le MVP. À faire si les utilisateurs le demandent.

---

## Phase 5 — Polish & Growth *(futur)*

- Analytics créateur (vues, copies par composant)
- Collections de composants
- Embed widget `<iframe>`
- Preview visuelle (Phase 6 — R&D XscpData → HTML, très complexe)

---

## Phase 6 — HTML / React / Next.js → Webflow *(R&D, futur lointain)*

**Idée :** Permettre à l'utilisateur de coller du HTML+CSS+JS (ou un composant React/Next.js) et obtenir un composant Webflow (XscpData JSON) prêt à coller dans le Designer.

**Inspiration :** [moden.io](https://moden.io) fait cette conversion côté serveur.

**Deux entrées envisagées :**

### Option A — HTML/CSS/JS → Webflow
- Interface `/convert` avec 3 onglets : HTML · CSS · JavaScript
- L'utilisateur colle son code, un moteur de conversion génère le JSON XscpData
- Résultat copiable directement dans le Webflow Designer

### Option B — React / Next.js → Webflow
- L'utilisateur colle un composant React (JSX + styles)
- Le moteur parse le JSX, mappe les éléments aux types Webflow (`div`, `text`, `image`, `link`…)
- Génère les styles sous forme de classes Webflow
- Construit l'arbre XscpData

**Complexité estimée :**
- Mapping DOM → XscpData : élevée (pas d'API officielle Webflow)
- Gestion des styles CSS → classes Webflow : très élevée
- React JSX → DOM statique : faisable (babel transform)
- Interactions Webflow (animations, tabs) : hors scope initial

**Références :**
- moden.io — convertisseur HTML→Webflow, approche serveur
- Format XscpData : documenté partiellement dans `libs/copyToWebflow.ts`
- Pas d'API officielle Webflow pour la conversion — reverse engineering nécessaire

**Statut :** Idée documentée. Ne pas implémenter avant d'avoir validé la demande utilisateur et fait une R&D sérieuse sur le format XscpData. À brainstormer avec `/brainstorming` quand le moment vient.

---

## Dettes techniques — TOUTES RÉSOLUES ✅

- DB complète, browse fonctionne en prod ✅
- Admin plan 'pro' ✅
- Home page statique sans stats ✅
