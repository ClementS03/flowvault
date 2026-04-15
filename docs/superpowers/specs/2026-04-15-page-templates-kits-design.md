# FlowVault — Page Templates & Kits
> Spec approuvée le 2026-04-15

---

## Contexte

FlowVault stocke actuellement des **composants Webflow** individuels (sections isolées : hero, navbar, pricing…). Cette spec ajoute deux nouvelles dimensions :

- **Page Templates** (A) : pages Webflow complètes — même format XscpData, type différent
- **Kits** (B) : collections de composants liés, créées et publiées par un auteur

---

## A — Page Templates

### Principe

Même mécanisme d'upload que les composants (paste XscpData depuis le Webflow Designer). La différence est sémantique : l'utilisateur sélectionne tout le contenu d'une page (`Ctrl+A`) avant de copier. Le JSON est plus gros mais le format est identique.

### Data model

Un seul ajout à la table `components` :

```sql
ALTER TABLE public.components
  ADD COLUMN type text NOT NULL DEFAULT 'component';
  -- valeurs : 'component' | 'page_template'
```

Nouvelles valeurs de catégorie pour les page templates :
`landing` | `pricing-page` | `blog` | `portfolio` | `saas` | `ecommerce` | `other`

Les catégories composants existantes restent inchangées. Le champ `category` est partagé — les catégories sont distinctes par convention de nommage, pas par contrainte DB.

### Upload

La page `/upload` existante est réutilisée sans changement de mécanisme. Ajouts UI :
- Toggle **"Component" / "Page Template"** en haut du formulaire (avant la zone de paste)
- Si "Page Template" sélectionné → les options de catégorie changent dynamiquement
- La limite free (10 items) couvre components + page templates confondus

### Browse

La page `/browse` ajoute trois onglets : **Components** | **Pages** | **Kits**

- L'onglet actif filtre par `type` (et pour Kits, interroge la table `kits`)
- Les filtres catégorie et tri (newest, trending) s'appliquent à chaque onglet indépendamment
- Les cards page templates affichent un badge "Page" distinctif

### Page composant `/c/[slug]`

Aucun changement — le layout fonctionne identiquement pour components et page templates. Le bouton "Copy to Webflow" reste le même mécanisme.

---

## B — Kits

### Principe

Un kit regroupe plusieurs composants publics d'un même auteur sous un nom cohérent. Exemple : "SaaS Starter Kit" = hero + navbar + pricing + footer. L'utilisateur copie chaque composant individuellement depuis la page kit.

### Contraintes

- Un kit ne peut contenir que des composants **publics** appartenant au **même auteur** que le kit
- Minimum 2 composants par kit
- Maximum 20 composants par kit
- Les composants dépubliés restent dans le kit (affichés comme indisponibles) — pas de suppression automatique

### Data model

```sql
-- Kit
CREATE TABLE public.kits (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  slug        text UNIQUE NOT NULL,   -- format : {name-slugifié}-{6 chars}
  is_public   boolean DEFAULT false,
  copy_count  integer DEFAULT 0,      -- total de copies de composants depuis ce kit
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.kits FOR SELECT USING (is_public = true);
CREATE POLICY "Own read"    ON public.kits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own insert"  ON public.kits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own update"  ON public.kits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own delete"  ON public.kits FOR DELETE USING (auth.uid() = user_id);

-- Pivot
CREATE TABLE public.kit_components (
  kit_id       uuid REFERENCES public.kits ON DELETE CASCADE NOT NULL,
  component_id uuid REFERENCES public.components ON DELETE CASCADE NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (kit_id, component_id)
);

ALTER TABLE public.kit_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read kit_components"
  ON public.kit_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.is_public = true
  ));
CREATE POLICY "Own read kit_components"
  ON public.kit_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
CREATE POLICY "Own insert kit_components"
  ON public.kit_components FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
CREATE POLICY "Own delete kit_components"
  ON public.kit_components FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
```

### Routes

| Route | Accès | Description |
|---|---|---|
| `/kit/[slug]` | Public | Page d'un kit — liste les composants + copy buttons |
| `/kit/new` | Auth | Créer un kit |
| `/kit/[slug]/edit` | Auth (auteur) | Modifier un kit |
| `/dashboard/kits` | Auth | Mes kits |

### Page `/kit/[slug]`

- Header : nom, description, auteur (lien profil), badge "X components", copy_count
- Liste ordonnée des composants : nom + catégorie + bouton "Copy"
- Composants dépubliés affichés grisés avec label "Unavailable"
- Chaque "Copy" appelle `/api/components/[id]/copy?kit_id={kit_id}` — le paramètre optionnel `kit_id` déclenche un UPDATE supplémentaire sur `kits.copy_count`
- Pas de "copy all" — impossible techniquement (clipboard = un XscpData à la fois)

### Création de kit `/kit/new`

1. Formulaire : name, description
2. Sélecteur de composants : liste des composants publics de l'utilisateur, checkbox pour chaque
3. Réordonnancement par drag-and-drop (position)
4. Toggle public/privé
5. Server Action : valide (min 2, max 20, tous publics, même auteur) → INSERT kit + kit_components → redirect `/kit/[slug]`

### Dashboard `/dashboard/kits`

Onglet "Kits" dans le dashboard existant (à côté de "Components") :
- Cards kits avec nom, nb composants, copy_count, statut public/privé
- Boutons Edit + Delete
- Bouton "New Kit" → `/kit/new`

---

## Limites & hors-scope

- **Pas de vente** pour cette phase (price, Stripe Connect) — Phase suivante
- **Pas de kits cross-auteur** — tous les composants d'un kit appartiennent au même créateur
- **Pas de page templates dans les kits** — kits = components uniquement pour l'instant
- **Pas de preview screenshot** — hors scope (Phase 4)

---

## Migrations SQL à exécuter dans Supabase

```sql
-- 1. Ajout du type sur components
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'component';

-- 2. Table kits (voir data model ci-dessus)
-- 3. Table kit_components (voir data model ci-dessus)
```

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `app/upload/page.tsx` + Server Action | Toggle type, catégories dynamiques |
| `app/browse/page.tsx` | Onglets Components / Pages / Kits |
| `app/browse/BrowseFilters.tsx` | Catégories filtrées par type actif |
| `app/kit/[slug]/page.tsx` | Nouvelle page (Server Component) |
| `app/kit/new/page.tsx` | Nouvelle page (Client Component) |
| `app/kit/[slug]/edit/page.tsx` | Nouvelle page |
| `app/dashboard/page.tsx` | Onglet Kits |
| `app/actions/createKit.ts` | Nouvelle Server Action |
| `app/actions/updateKit.ts` | Nouvelle Server Action |
| `app/actions/deleteKit.ts` | Nouvelle Server Action |
| `app/api/components/[id]/copy/route.ts` | Accepte `?kit_id=` optionnel → incrémente aussi `kits.copy_count` |
