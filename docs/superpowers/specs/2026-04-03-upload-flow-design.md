# FlowVault — Upload Flow Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## Vue d'ensemble

Le flow upload est le cœur de FlowVault. Il permet à n'importe qui (connecté ou non) de coller un composant Webflow, de le configurer, et d'obtenir immédiatement un lien de partage + bouton "Copy to Webflow" — sans friction. La connexion est proposée ensuite pour stocker le composant de façon permanente.

---

## Flow complet

```
/upload
  └─ Paste détecté (event paste, MIME application/json, type @webflow/XscpData)
       └─ Slide-over s'ouvre (form de configuration)
            └─ Submit form
                 ├─ [non connecté] → crée un composant temporaire (DB, expires 24h)
                 │                  → redirect /upload/result?slug=xxx
                 │                      Page résultat :
                 │                        [card composant] | OR | [form sign-in]
                 │                        Si sign-in réussi → composant associé à l'user
                 │                                          → redirect /dashboard
                 └─ [connecté]     → crée composant permanent en DB
                                   → redirect /c/[slug]
```

---

## Étape 1 — Zone de paste (`/upload`)

### Comportement
- Page protégée côté client (non serveur) : accessible sans auth, mais le form est disponible à tout le monde pour tester.
- La zone de paste écoute l'événement `paste` sur `window` (pas uniquement sur le div).
- Validation : `clipboardData.getData('application/json')` → parse JSON → vérifie `data.type === '@webflow/XscpData'`.
- Si invalide : toast d'erreur "Ce n'est pas un composant Webflow valide".
- Si valide : ouvre le slide-over avec le JSON stocké dans le state React.

### UI
- Zone de paste centrée, border dashed, hover state indigo.
- Texte : "Copie un composant depuis Webflow Designer (Ctrl+C) puis colle-le ici (Ctrl+V)"
- Indicateur animé quand le paste est détecté.

---

## Étape 2 — Slide-over de configuration

### Comportement
- S'ouvre depuis la droite sur desktop (width ~480px), plein écran sur mobile.
- Fond de page assombri (overlay semi-transparent, click outside = ferme + reset).
- Fermeture = perte du JSON (l'user doit recoller).

### Champs du formulaire

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `name` | text | Oui | max 60 chars |
| `description` | textarea | Non | max 200 chars |
| `category` | select | Non | hero, navbar, pricing, footer, feature, card, other |
| `tags` | text (séparés par virgule) | Non | max 5 tags |
| `preview_image` | file upload | Non | JPEG/PNG, max 2MB, preview immédiate |
| `is_public` | toggle switch | Oui | défaut: true |
| `password` | text (conditionnel) | Non | visible si is_public = false |

### Submit
- Bouton "Publier le composant"
- Si is_public = false et password renseigné : le mot de passe est hashé (bcrypt) côté serveur avant stockage.
- Server Action : `createComponent(formData, json, userId | null)`

---

## Étape 3 — Stockage temporaire (utilisateur non connecté)

### DB
Ajout de deux colonnes à la table `components` :
```sql
is_temporary  boolean  default false
expires_at    timestamptz  nullable
```

### Logique Server Action
```
if (userId) {
  INSERT components { user_id, ..., is_temporary: false, expires_at: null }
  redirect /c/[slug]
} else {
  INSERT components { user_id: null, ..., is_temporary: true, expires_at: now + 24h }
  redirect /upload/result?slug=[slug]
}
```

### RLS
- Policy "Anyone can insert" : `with check (true)` — permet les inserts sans auth.
- Policy "Public read temp" : `using (is_public = true OR expires_at > now())`.
- Policy "Own read" : `using (auth.uid() = user_id)`.

### Cleanup
- Un job Supabase (pg_cron) supprime les composants temporaires expirés toutes les heures :
  ```sql
  DELETE FROM components WHERE is_temporary = true AND expires_at < now();
  ```

---

## Étape 4 — Page résultat (`/upload/result?slug=xxx`)

### Layout desktop
```
┌─────────────────────┬────┬─────────────────────┐
│   Card composant    │ OR │   Form sign-in       │
│                     │    │                      │
│  [Preview image]    │    │  • Google button     │
│  Nom du composant   │    │  • ─── ou ───        │
│  [Lien de partage]  │    │  • Email magic link  │
│  [Copy to Webflow]  │    │                      │
│  ⚠ Expire dans 24h  │    │  Avantages connexion │
└─────────────────────┴────┴─────────────────────┘
```

### Layout mobile
- Card composant en haut.
- Divider "— OU —" horizontal.
- Form sign-in en bas.

### Card composant
- Preview image (si fournie) ou placeholder générique.
- Nom + catégorie.
- Champ "Lien de partage" avec bouton copy-to-clipboard.
- Bouton "Copy to Webflow" (fonctionnel, utilise `copyToWebflow.ts`).
- Badge / texte discret : "Lien temporaire — expire dans ~24h. Connecte-toi pour le stocker."

### Après sign-in sur cette page
- Le callback auth (`/api/auth/callback`) reçoit le slug en query param via `redirectTo`.
- Après échange de code, Server Action `claimComponent(slug, userId)` :
  - `UPDATE components SET user_id = userId, is_temporary = false, expires_at = null WHERE slug = slug AND user_id IS NULL`
- Redirect `/dashboard`.

---

## Étape 5 — Utilisateur déjà connecté

- Le slide-over détecte la session (client-side via `useSession`).
- Le bouton submit dit "Publier" (pas "Tester sans compte").
- Après submit → redirect direct vers `/c/[slug]` (page publique du composant).
- Pas de page résultat intermédiaire.

---

## Composants et fichiers à créer/modifier

| Fichier | Rôle |
|---|---|
| `app/upload/page.tsx` | Zone de paste (client component), écoute paste event |
| `components/UploadSlideOver.tsx` | Slide-over avec form + preview image |
| `app/upload/result/page.tsx` | Page résultat (card + OR + signin) |
| `app/actions/createComponent.ts` | Server Action : validation, storage, insert DB |
| `app/actions/claimComponent.ts` | Server Action : associer composant temp à user |
| `app/api/auth/callback/route.ts` | Modifier pour passer le slug si présent en param |
| `libs/slugify.ts` | Génère `{name-slug}-{6chars}` |
| `libs/hashPassword.ts` | bcrypt hash du mot de passe |

---

## Schéma DB (delta)

```sql
-- Ajout colonnes components
ALTER TABLE public.components
  ADD COLUMN is_temporary boolean DEFAULT false,
  ADD COLUMN expires_at timestamptz;

-- Policy insert anonymous
CREATE POLICY "Anyone can insert component"
  ON public.components FOR INSERT
  WITH CHECK (true);

-- Cleanup job (pg_cron - activer dans Supabase dashboard)
SELECT cron.schedule(
  'cleanup-temp-components',
  '0 * * * *',
  $$DELETE FROM components WHERE is_temporary = true AND expires_at < now()$$
);
```

---

## Points de vigilance

- **Paste event** : écouter sur `window`, pas sur un div spécifique. Bloquer si un `<input>` ou `<textarea>` est focus pour éviter les conflits.
- **Slide-over mobile** : `position: fixed; inset: 0` sur mobile (< 768px), `position: fixed; right: 0; top: 0; bottom: 0; width: 480px` sur desktop.
- **Image preview** : stocker dans Supabase Storage bucket `component-previews` (public), path `{component_id}.jpg`. Si aucune image fournie → placeholder générique.
- **Password** : ne jamais stocker en clair. Hash bcrypt server-side dans la Server Action.
- **Claim callback** : si le slug n'est pas dans les query params du callback, comportement normal (redirect `/dashboard`).
- **RLS** : la policy "Anyone can insert" doit être limitée aux champs contrôlés — ne jamais laisser le client définir `user_id` directement.
