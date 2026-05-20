# Gestion des secrets et chiffrement (#100)

## 1. Inventaire des secrets actuels

| Variable | Niveau de risque si compromis |
|---|---|
| `JWT_SECRET` | CRITIQUE — compromis = usurpation de tous les comptes |
| `ADMIN_SECRET` | CRITIQUE — compromis = accès backoffice complet |
| `DATABASE_URL` | CRITIQUE — accès direct à toutes les données |
| `STRIPE_SECRET_KEY` | ÉLEVÉ — accès aux paiements |
| `STRIPE_WEBHOOK_SECRET` | MOYEN — rejeu de webhooks |
| `RESEND_API_KEY` | FAIBLE — envoi d'emails au nom de FacturEasy |
| `CHORUS_CLIENT_SECRET` | ÉLEVÉ — accès au portail Chorus Pro |

## 2. Procédure de rotation des clés (sans downtime)

### JWT_SECRET
1. Générer un nouveau secret
2. Ajouter le nouveau secret en parallèle de l'ancien dans le code (période de transition 24h : accepter les tokens signés avec l'un ou l'autre)
3. Déployer — les sessions existantes restent valides
4. Après 24h, supprimer l'ancien secret et redéployer

### STRIPE_SECRET_KEY
1. Créer une nouvelle clé dans le dashboard Stripe (Developers → API keys → Create restricted key)
2. Mettre à jour `STRIPE_SECRET_KEY` dans Render → Save Changes
3. Valider que les webhooks fonctionnent (passer une transaction de test)
4. Supprimer l'ancienne clé dans Stripe

### DATABASE_URL (Neon)
1. Changer le mot de passe du rôle PostgreSQL dans le dashboard Neon
2. Mettre à jour `DATABASE_URL` dans les variables d'environnement Render
3. Save Changes → le service redémarre avec la nouvelle connexion
4. Vérifier les logs Render que la connexion est établie

## 3. Chiffrement at-rest

- **Neon PostgreSQL** : chiffrement AES-256 activé par défaut. Vérifier dans le dashboard Neon : Settings → Security
- **Backups S3** : chiffrer avec GPG avant upload (voir backup script existant)
- **Logs Sentry** : configurer le scrubbing des champs sensibles (email, siret, montant) via `beforeSend` dans la configuration Sentry

## 4. Détection de fuites

- **Gitleaks** configuré dans CI (voir `.github/workflows/ci.yml`, job `security-scan`)
- **GitHub Secret Scanning** : activer dans les paramètres du repo (Settings → Security → Secret scanning)
- **`.gitleaks.toml`** : ajouter à la racine du repo pour les règles custom (tokens PISTE, patterns FacturEasy)

## 5. Checklist RGPD chiffrement

- [ ] Chiffrement en transit : HTTPS partout (Render + Vercel = activé par défaut)
- [ ] Chiffrement at-rest DB : Neon AES-256 (vérifier dans Settings → Security)
- [ ] Chiffrement backups : GPG (voir script backup)
- [ ] Purge données après 10 ans : procédure à planifier (cron annuel)
- [ ] Registre des traitements RGPD : à créer (liste des données traitées + base légale)
