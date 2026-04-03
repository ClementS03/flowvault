# FlowVault — Plan des prochaines phases

> **État au 2026-04-04** — MVP complet déployé sur https://flowvault-ten.vercel.app/

---

## Ce qui est en production (résumé)

- Auth (Google OAuth + Magic Link)
- Upload JSON Webflow → Storage Supabase + formulaire (nom, desc, catégorie, tags, image, visibilité)
- Username gate : impossible de publier en "Anonymous"
- Dashboard library : ComponentRow avec édition, suppression, toggle public/privé
- `/c/[slug]` : page publique + Copy to Webflow + auteur + "More from @user" + PasswordGate
- `/browse` : marketplace avec filtres catégorie/tag + cards riches avec auteur
- `/u/[username]` : profil public avec composants + avatar + stats
- Landing page : hero + stats live + how it works + bottom CTA
- Sécurité : access control, password hash, signed URLs, defense-in-depth

---

## Phase 2 — Social & Discovery

### 2a — Recherche full-text *(priorité haute)*

**Pourquoi :** Les filtres actuels (catégorie + tag exact) sont limités. La recherche textuelle sur le nom/description est attendue.

**Fichiers à toucher :**
- `app/browse/page.tsx` — ajouter le paramètre `q` (searchParams)
- `app/browse/BrowseFilters.tsx` — ajouter un champ de recherche
- Supabase : activer `pg_trgm` + index GIN ou utiliser `.ilike()` sur name + description

**Implémentation Supabase :**
```sql
-- Option simple (ilike, pas besoin d'extension) :
.or(`name.ilike.%${q}%,description.ilike.%${q}%`)

-- Option avancée (full-text search) :
ALTER TABLE components ADD COLUMN search_vector tsvector;
-- Trigger pour maintenir le vecteur automatiquement
```

**UX :** Barre de recherche dans le header de Browse, au-dessus des filtres catégorie.

---

### 2b — Social Graph (follow/unfollow + saves) *(à brainstormer)*

**Pourquoi :** Créer de l'engagement et fidéliser les créateurs. Les "saves" permettent aux users de constituer leur bibliothèque de composants favoris.

**Tables DB à créer :**
```sql
-- Follows
CREATE TABLE public.follows (
  follower_id uuid references auth.users NOT NULL,
  following_id uuid references auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Saves (composants favoris)
CREATE TABLE public.saves (
  user_id uuid references auth.users NOT NULL,
  component_id uuid references public.components NOT NULL,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, component_id)
);
```

**Fichiers à créer :**
- `app/actions/followUser.ts` — follow/unfollow toggle
- `app/actions/saveComponent.ts` — save/unsave toggle
- `components/FollowButton.tsx` — bouton follow sur `/u/[username]`
- `components/SaveButton.tsx` — bouton save sur `/c/[slug]`
- `app/dashboard/saved/page.tsx` — onglet "Saved" dans le dashboard

**Affectations UI :**
- `/u/[username]` : bouton Follow + compteurs followers/following
- `/c/[slug]` : bouton Save (cœur) + compteur saves
- Dashboard : onglet "Saved" listant les composants sauvegardés

**Note :** À brainstormer avec le skill `brainstorming` avant d'implémenter — il y a des questions de vie privée (profils privés vs publics, visibilité des follows).

---

### 2c — Trending / Sort options *(priorité moyenne)*

**Pourquoi :** "Les plus populaires" c'est bien, mais "les plus récents" ou "trending cette semaine" donnent de la diversité.

**Implémentation :**
- Ajouter `sort` dans les searchParams de Browse (`newest`, `popular`, `trending`)
- `BrowseFilters.tsx` : select ou pills de tri
- "Trending" = copy_count des 7 derniers jours → nécessite un champ `copies.copied_at` (déjà prévu dans le schéma)

---

## Phase 3 — Stripe Pro *(après social graph)*

**Pourquoi :** Monétisation. Le freemium est en place (limite 10 composants), Stripe est déjà câblé par ShipFast.

**Ce qui reste à faire :**
- Configurer les `price IDs` Stripe dans `config.ts`
- Vérifier le webhook Stripe → `profiles.plan = 'pro'` (logique déjà présente dans ShipFast)
- Enforcement en prod : la limite 10 est déjà active dans `createComponent`
- Page pricing : adapter la page ShipFast aux plans FlowVault
- Portail facturation : ShipFast fournit `/api/stripe/create-portal-link`

**Plans envisagés :**
| | Free | Pro |
|---|---|---|
| Composants stockés | 10 | Illimité |
| Copies reçues | Illimitées | Illimitées |
| Composants publics | Illimités | Illimités |

---

## Phase 4 — Polish & Growth

### Analytics créateur
- Sur `/u/[username]` et le dashboard : vues, copies par composant, évolution dans le temps
- Utiliser la table `copies` (déjà créée) pour les stats

### Preview visuelle des composants
- **Non faisable** sans R&D significative : XscpData → HTML nécessite de réimplémenter le renderer Webflow (comme moden.io). Projet Phase 6.
- Alternative court terme : encourager l'upload d'une image de preview (déjà en place)

### Collections
- Grouper plusieurs composants dans une collection (ex: "Landing page kit")
- Table `collections` + `collection_components`

### Embed widget
- `<iframe src="flowvault.io/embed/c/[slug]">` avec juste le bouton Copy

---

## Phase 6 — Convertisseur HTML/CSS/JS → Webflow *(futur lointain)*

Voir `CLAUDE.md` section Phase 6. Nécessite une R&D approfondie sur le format XscpData.

---

## Prochaine action recommandée

**Phase 2b — Social Graph** avec `/brainstorming` avant d'implémenter (questions de vie privée, UX à valider).
Ou **Phase 3 — Stripe Pro** si la monétisation est prioritaire.

**Phase 2a (recherche full-text)** : déprioritisée — les filtres catégorie + tag suffisent pour le MVP. À faire plus tard si les utilisateurs le demandent.

---

## Dettes techniques — RÉSOLUES ✅

- ~~Browse "Something went wrong"~~ → DB complète, browse fonctionne en prod ✅
- ~~Admin plan 'pro'~~ → fait manuellement dans Supabase ✅
- ~~Colonnes is_temporary / expires_at / password_hash~~ → existent en prod ✅
- ~~Table copies~~ → existe en prod (stats home affichées) ✅
