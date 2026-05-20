# Spécification technique — Bandeau de notification PPF (BandeauPPF)

**Composant :** `<BandeauPPF />`  
**Placement :** En haut du dashboard, au-dessus de tout autre contenu  
**Audience :** Clients FacturEasy dont l'échéance PPF est dans les 90 prochains jours  
**Équipe :** Front-end (React/Next.js)  
**Statut :** À implémenter — Sprint [X]

---

## 1. Logique d'affichage

Le bandeau est visible si **toutes** ces conditions sont réunies :

1. `company.echeance_ppf` est définie (non nulle)
2. La date actuelle est dans les **90 prochains jours** avant `company.echeance_ppf`
3. `company.ppf_notified_at` est `null` (le client n'a pas encore confirmé la notification)

Le bandeau est masqué si :
- `company.ppf_notified_at` est renseignée (confirmation enregistrée en base)
- L'utilisateur a cliqué "Marquer comme fait" et la suppression localStorage est active (masquage temporaire 7 jours, voir section 4)
- `company.echeance_ppf` est dans plus de 90 jours

---

## 2. États visuels

| Jours restants | Fond | Texte | Icône | Dismissible |
|---|---|---|---|---|
| 61 à 90 (J-90 à J-61) | `#FFF3CD` (jaune pâle) | `#856404` (brun) | ⚠️ | Oui |
| 31 à 60 (J-60 à J-31) | `#FFE0B2` (orange pâle) | `#E65100` (orange foncé) | 🔔 | Oui |
| 0 à 30 (J-30 à J-0) | `#FFEBEE` (rouge pâle) | `#B71C1C` (rouge foncé) | 🚨 | Non |
| Dépassé (< 0) | `#FFEBEE` (rouge pâle) | `#B71C1C` (rouge foncé) | 🚨 | Non |

**Règle :** Le bandeau J-30 à J-0 est **non dismissible** — il ne peut pas être fermé sans confirmer l'action.

---

## 3. Contenu du bandeau

```
[ICONE] Il vous reste X jours pour notifier vos fournisseurs de votre identifiant PPF.
        [Télécharger ma fiche PPF]  [Marquer comme fait]
```

**Variantes texte selon l'état :**

- J-90 à J-61 : "Il vous reste **X jours** pour notifier vos fournisseurs de votre identifiant PPF. Anticipez dès maintenant."
- J-60 à J-31 : "Il vous reste **X jours** pour notifier vos fournisseurs de votre identifiant PPF. Agissez maintenant."
- J-30 à J-0 : "**URGENT** — Il vous reste **X jours** pour notifier vos fournisseurs de votre identifiant PPF."
- Dépassé : "**Votre délai de notification PPF est dépassé.** Contactez votre équipe Customer Success FacturEasy."

**Singulier/Pluriel :** "X jour" si X = 1, "X jours" sinon.

---

## 4. Actions

### Bouton "Télécharger ma fiche PPF"

- Action : appel GET `/companies/ppf-fiche-pdf` → retourne un fichier PDF
- Le PDF contient : raison sociale, SIRET, identifiant PPF, adresse, coordonnées, logo FacturEasy, date de génération
- Téléchargement déclenché directement dans le navigateur (Content-Disposition: attachment)
- Visible dans tous les états du bandeau

### Bouton "Marquer comme fait"

- Action en 2 étapes :

**Étape 1 — Modale de confirmation**

```
Titre : Avez-vous bien notifié vos fournisseurs ?

Corps :
Confirmez-vous avoir transmis votre identifiant PPF [SIRET] à l'ensemble de vos fournisseurs actifs ?

Cette action est irréversible (sauf réinitialisation par l'équipe FacturEasy).

[Oui, j'ai notifié mes fournisseurs]   [Annuler]
```

**Étape 2 — Si confirmé :**

1. Appel POST `/companies/ppf-notified` → enregistre `ppf_notified_at = NOW()` en base
2. Le bandeau disparaît immédiatement (sans reload de page)
3. Toast de confirmation : "Confirmation enregistrée. Merci d'avoir complété cette étape."
4. Email de confirmation envoyé à l'utilisateur (Template 5 dans `templates-email-ppf.md`)

**Masquage temporaire (si J-90 à J-31 et utilisateur annule) :**

Si l'utilisateur ferme la modale sans confirmer et que le bandeau est dans un état dismissible (J-90 à J-31), proposer une option "Me rappeler dans 7 jours" :
- Écrire dans localStorage : `ppf_banner_snoozed_until = Date.now() + 7 * 86400 * 1000`
- Le bandeau est masqué pendant 7 jours à la prochaine connexion
- Ignoré si l'état passe à J-30 ou moins (le bandeau redevient non dismissible)

---

## 5. API

### GET /companies/ppf-status

Retourne le statut PPF de l'entreprise connectée.

**Réponse :**

```json
{
  "echeance_ppf": "2026-09-01T00:00:00Z",
  "jours_restants": 74,
  "ppf_notified_at": null,
  "fournisseurs_notifies": 3,
  "fournisseurs_total": 12
}
```

**Champs :**

| Champ | Type | Description |
|---|---|---|
| `echeance_ppf` | ISO 8601 \| null | Date d'échéance de déploiement PPF de l'entreprise |
| `jours_restants` | integer | Jours entre aujourd'hui et `echeance_ppf`. Négatif si dépassé. |
| `ppf_notified_at` | ISO 8601 \| null | Date de confirmation de notification. null = pas encore fait. |
| `fournisseurs_notifies` | integer | Nombre de fournisseurs marqués comme notifiés |
| `fournisseurs_total` | integer | Nombre total de fournisseurs actifs identifiés dans FacturEasy |

### POST /companies/ppf-notified

Enregistre la confirmation de notification PPF.

**Body :** aucun (l'utilisateur est identifié via la session)

**Réponse 200 :**

```json
{
  "ppf_notified_at": "2026-05-20T14:32:00Z"
}
```

**Réponse 409 :** si `ppf_notified_at` est déjà renseignée (double clic).

### GET /companies/ppf-fiche-pdf

Génère et retourne la fiche d'identité PPF en PDF.

**Réponse :** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="fiche-ppf-[SIRET].pdf"`

---

## 6. Schéma base de données

**Table :** `companies`  
**Colonne à ajouter :** `echeance_ppf` et `ppf_notified_at`

```sql
ALTER TABLE companies
ADD COLUMN echeance_ppf TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN ppf_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN companies.echeance_ppf IS
  'Date d''échéance de déploiement e-facture applicable à l''entreprise (selon sa taille). Détermine le déclenchement du bandeau PPF.';

COMMENT ON COLUMN companies.ppf_notified_at IS
  'Date à laquelle le client a confirmé avoir transmis son identifiant PPF à ses fournisseurs. NULL = pas encore fait.';
```

**Index de monitoring :**

```sql
CREATE INDEX idx_companies_ppf_pending
ON companies (echeance_ppf)
WHERE ppf_notified_at IS NULL AND echeance_ppf IS NOT NULL;
```

---

## 7. Implémentation React (exemple)

```tsx
// components/BandeauPPF.tsx

import { differenceInDays } from 'date-fns';
import { useState } from 'react';

type PPFStatus = {
  echeance_ppf: string | null;
  jours_restants: number;
  ppf_notified_at: string | null;
  fournisseurs_notifies: number;
  fournisseurs_total: number;
};

const SNOOZE_KEY = 'ppf_banner_snoozed_until';

const getVisualState = (jours: number) => {
  if (jours > 60) return { color: 'yellow', icon: '⚠️', dismissible: true };
  if (jours > 30) return { color: 'orange', icon: '🔔', dismissible: true };
  return { color: 'red', icon: '🚨', dismissible: false };
};

const BandeauPPF = ({ status }: { status: PPFStatus }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!status.echeance_ppf) return null;
  if (status.ppf_notified_at) return null;
  if (confirmed) return null;
  if (status.jours_restants > 90) return null;

  // Vérifier le snooze localStorage
  const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
  if (snoozedUntil && Date.now() < parseInt(snoozedUntil) && status.jours_restants > 30) {
    return null;
  }

  const { color, icon, dismissible } = getVisualState(status.jours_restants);

  const handleConfirm = async () => {
    await fetch('/api/companies/ppf-notified', { method: 'POST' });
    setConfirmed(true);
    setShowModal(false);
    // Afficher toast de confirmation
  };

  const handleSnooze = () => {
    if (dismissible) {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 86400 * 1000));
      setShowModal(false);
    }
  };

  const bandeauStyles: Record<string, React.CSSProperties> = {
    yellow: { background: '#FFF3CD', color: '#856404' },
    orange: { background: '#FFE0B2', color: '#E65100' },
    red: { background: '#FFEBEE', color: '#B71C1C' },
  };

  return (
    <>
      <div style={bandeauStyles[color]} className="ppf-bandeau">
        <span>{icon}</span>
        <span>
          {status.jours_restants <= 30 && <strong>URGENT — </strong>}
          Il vous reste <strong>{status.jours_restants} jour{status.jours_restants > 1 ? 's' : ''}</strong>{' '}
          pour notifier vos fournisseurs de votre identifiant PPF.
        </span>
        <button onClick={() => window.open('/api/companies/ppf-fiche-pdf')}>
          Télécharger ma fiche PPF
        </button>
        <button onClick={() => setShowModal(true)}>
          Marquer comme fait
        </button>
      </div>

      {showModal && (
        <ConfirmModal
          siret={status.echeance_ppf}
          onConfirm={handleConfirm}
          onSnooze={dismissible ? handleSnooze : undefined}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default BandeauPPF;
```

---

## 8. Checklist d'intégration

- [ ] Ajouter colonnes `echeance_ppf` et `ppf_notified_at` à la table `companies` (migration SQL)
- [ ] Implémenter endpoint GET `/companies/ppf-status`
- [ ] Implémenter endpoint POST `/companies/ppf-notified`
- [ ] Implémenter endpoint GET `/companies/ppf-fiche-pdf` (génération PDF)
- [ ] Créer composant `<BandeauPPF />` et l'intégrer dans le layout dashboard
- [ ] Implémenter la modale de confirmation
- [ ] Implémenter le snooze localStorage (7 jours)
- [ ] Déclencher l'envoi du Template 5 (email de confirmation) au POST /ppf-notified
- [ ] Tester les 4 états visuels (J-90, J-60, J-30, dépassé)
- [ ] Tester la logique de snooze et la réactivation à J-30
- [ ] Ajouter le monitoring Customer Success : dashboard des `ppf_notified_at IS NULL` à J-30

---

*Spécification produit FacturEasy — Mai 2026*  
*À lire en parallèle : `plan-notification-ppf.md` et `templates-email-ppf.md`*
