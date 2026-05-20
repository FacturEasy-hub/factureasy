# Chorus Pro — Mise en place de l'environnement de recette (#95)

## 1. Accès sandbox

- **URL environnement qualification** : https://chorus-pro.gouv.fr/cpp/
- **Identifiants** : à demander via le portail PISTE (https://piste.gouv.fr)
- **Délai d'obtention** : ~5 jours ouvrés

## 2. Scénarios de test obligatoires à valider avant prod

Tous les scénarios ci-dessous doivent être passants avant toute mise en production.

### Scénario 1 — Émission facture conforme
- Soumettre une facture valide
- Vérifier la progression des statuts : `DEPOSEE` → `MISE_A_DISPOSITION` → `SERVICE_FAIT`

### Scénario 2 — Facture rejetée (format)
- Soumettre une facture avec un champ obligatoire manquant
- Vérifier le message d'erreur retourné par l'API

### Scénario 3 — Facture refusée par le destinataire
- Soumettre une facture valide puis la faire refuser côté destinataire
- Vérifier : statut `REFUSEE` + motif de refus présent

### Scénario 4 — Correction et re-soumission après rejet
- Corriger la facture rejetée
- Re-soumettre et vérifier l'acceptation

### Scénario 5 — Avoir sur facture acceptée
- Émettre un avoir lié à une facture au statut `SERVICE_FAIT`
- Vérifier le traitement et le statut de l'avoir

### Scénario 6 — Consultation statut en polling
- Appeler `GET /factures/:id/statut` toutes les 15 minutes
- Vérifier la cohérence des statuts retournés au fil du temps

## 3. Variables d'environnement recette

À ajouter dans le fichier `.env` (ne jamais committer ces valeurs) :

```
CHORUS_ENV=qualification
CHORUS_BASE_URL=https://qualif-raccordement.chorus-pro.gouv.fr/api/cpro
CHORUS_CLIENT_ID=xxx
CHORUS_CLIENT_SECRET=xxx
```

## 4. Checklist go/no-go prod

- [ ] Scénario 1 passant
- [ ] Scénario 2 passant
- [ ] Scénario 3 passant
- [ ] Scénario 4 passant
- [ ] Scénario 5 passant
- [ ] Scénario 6 passant
- [ ] Temps de réponse < 5s sur tous les appels
- [ ] Gestion correcte des codes erreur : 400, 401, 422, 500
