# Plan de communication — Notification identifiant PPF FacturEasy

**Référence :** Issue #102  
**Objectif :** Accompagner les clients FacturEasy dans la transmission de leur identifiant PPF à leurs fournisseurs, 60 à 90 jours avant leur échéance légale  
**Responsable :** Équipe Customer Success / Produit  
**Date de mise à jour :** Mai 2026  

---

## Contexte réglementaire

Dans le cadre de la réforme de la facturation électronique (décret 2022-1299), chaque entreprise assujettie à la TVA doit **communiquer son identifiant PPF (Portail Public de Facturation) à l'ensemble de ses fournisseurs** avant de pouvoir recevoir des factures électroniques conformes. FacturEasy agit comme PDP (Plateforme de Dématérialisation Partenaire) agréée DGFiP pour ses clients — leur identifiant PPF est leur SIRET enregistré via FacturEasy.

La DGFiP recommande de communiquer cet identifiant **60 à 90 jours avant l'échéance d'entrée en vigueur** applicable à l'entreprise.

---

## Phase 1 — J-90 : Sensibilisation

### Email client FacturEasy : "La réforme arrive — voici ce que vous devez faire"

**Objet :** [Action requise] La réforme e-facture arrive — voici ce que vous devez faire avant le [DATE_LIMITE]

**Expéditeur :** FacturEasy <notifications@factureasy.fr>  
**Déclenchement :** automatique à J-90 avant `echeance_ppf` de l'entreprise cliente

**Corps :**

Bonjour [Prénom],

La réforme de la facturation électronique entre bientôt en vigueur pour votre entreprise. Votre échéance est le **[DATE_ECHEANCE]**.

**Ce que vous devez faire :** vous avez l'obligation légale de notifier vos fournisseurs de votre identifiant PPF au moins 60 jours avant cette date, soit avant le **[DATE_LIMITE_NOTIFICATION]**.

Votre identifiant PPF FacturEasy est votre SIRET : `[SIRET_CLIENT]`

Sans cette notification, vos fournisseurs ne pourront pas vous adresser des factures conformes, ce qui expose les deux parties à un risque de non-conformité fiscale.

**[Télécharger ma fiche d'identité PPF]**

Pour toute question : support@factureasy.fr

L'équipe FacturEasy

---

### Notification in-app

Bandeau jaune avec countdown : "J-90 avant votre échéance PPF — Notifiez vos fournisseurs dès maintenant."

Voir spécification complète dans `spec-bandeau-inapp.md`.

---

### Post LinkedIn

**"Êtes-vous prêt pour la réforme ? 3 actions à faire maintenant"**

La facturation électronique devient obligatoire. Si vous ne savez pas encore ce qu'est un identifiant PPF ou pourquoi vous devez le transmettre à vos fournisseurs, lisez ceci avant qu'il soit trop tard.

**3 actions à faire maintenant :**
1. Vérifiez votre date d'échéance (grande entreprise = sept. 2026 / PME-TPE = sept. 2027)
2. Récupérez votre identifiant PPF auprès de votre PDP (ex. : FacturEasy)
3. Transmettez-le à tous vos fournisseurs actifs — 90 jours avant votre échéance

Vous utilisez FacturEasy ? Votre identifiant est disponible dans Paramètres → Mon entreprise → Identifiant PPF.

#FacturationElectronique #Réforme #DGFiP #FacturEasy

---

## Phase 2 — J-60 : Action

### Email client : "Votre identifiant PPF : [SIRET] — à transmettre à vos X fournisseurs"

**Objet :** Votre identifiant PPF : [SIRET_CLIENT] — transmettez-le à vos [N] fournisseurs

**Expéditeur :** FacturEasy <notifications@factureasy.fr>  
**Déclenchement :** automatique à J-60 avant `echeance_ppf`

**Corps :**

Bonjour [Prénom],

Il vous reste **60 jours** pour transmettre votre identifiant PPF à vos fournisseurs.

**Votre identifiant PPF :** `[SIRET_CLIENT]`

Nous avons identifié **[N_FOURNISSEURS] fournisseurs** dans votre compte FacturEasy à notifier.

**Copiez-collez le template ci-dessous** et envoyez-le à chacun de vos fournisseurs :

---
*Objet : Notre identifiant de facturation électronique — Action à réaliser*

Bonjour, dans le cadre de la réforme de la facturation électronique (décret 2022-1299), notre entreprise [NOM] (SIRET : [SIRET]) utilise FacturEasy comme Plateforme de Dématérialisation Partenaire (PDP). À compter du [DATE_OBLIGATION], merci d'adresser vos factures électroniques en mentionnant notre identifiant PPF : [SIRET]. Contact : [EMAIL_COMPTABILITE]. Cordialement.*

---

**[Voir ma liste de fournisseurs à notifier]**

L'équipe FacturEasy

---

### Notification in-app

Bandeau orange avec liste des fournisseurs identifiés dans FacturEasy, chacun avec statut **"Notifié / À notifier"**. Voir `spec-bandeau-inapp.md`.

---

### SMS (si activé par le client)

> FacturEasy : pensez à notifier vos fournisseurs de votre identifiant PPF avant le [DATE_LIMITE]. Connectez-vous sur factureasy.fr

---

## Phase 3 — J-30 : Urgence

### Email relance — clients n'ayant pas encore notifié leurs fournisseurs

**Objet :** [URGENT] Il vous reste 30 jours pour notifier vos fournisseurs — Agissez maintenant

**Expéditeur :** FacturEasy <notifications@factureasy.fr>  
**Déclenchement :** automatique à J-30, uniquement si `ppf_notified_at IS NULL`

**Corps :**

Bonjour [Prénom],

Il ne vous reste plus que **30 jours** pour transmettre votre identifiant PPF à vos fournisseurs. Nous n'avons pas encore enregistré de confirmation de votre part.

**Votre identifiant PPF :** `[SIRET_CLIENT]`  
**Date limite :** [DATE_LIMITE] — dans 30 jours

Passé cette date, vos fournisseurs ne pourront plus vous adresser de factures conformes à la réglementation, exposant votre comptabilité à des risques de non-déductibilité de TVA.

**[Accéder au template et notifier mes fournisseurs]**

Si vous avez déjà effectué cette démarche, connectez-vous à FacturEasy et cliquez "Je l'ai fait" dans votre tableau de bord.

L'équipe FacturEasy — support@factureasy.fr

---

### Bandeau in-app rouge

"URGENT — Il vous reste 30 jours pour notifier vos fournisseurs de votre identifiant PPF."

Non dismissible. Voir `spec-bandeau-inapp.md`.

---

### Email de rappel aux fournisseurs non encore notifiés

**Déclenchement :** si FacturEasy dispose des coordonnées email du fournisseur ET que le fournisseur n'a pas encore été notifié

**Objet :** [Rappel] Identifiant PPF de votre client [NOM_CLIENT] — Mise à jour requise

**Corps :**

Bonjour,

Votre client [NOM_CLIENT] (SIRET : [SIRET_CLIENT]) vous a communiqué son identifiant PPF en vue de la réforme de la facturation électronique. Si vous n'avez pas encore enregistré cet identifiant dans votre système de facturation, nous vous invitons à le faire sans délai.

**Identifiant PPF à enregistrer :** `[SIRET_CLIENT]`  
**Plateforme utilisée par votre client :** FacturEasy (PDP agréée DGFiP)  
**Date d'entrée en vigueur :** [DATE_OBLIGATION]

Pour toute question, contactez directement votre client : [EMAIL_COMPTABILITE_CLIENT]

Cordialement,  
FacturEasy pour le compte de [NOM_CLIENT]

---

## Calendrier récapitulatif

| Date | Action |
|---|---|
| J-90 | Email sensibilisation + bandeau jaune in-app + post LinkedIn |
| J-60 | Email identifiant PPF + template fournisseur + bandeau orange + SMS (si activé) |
| J-30 | Relance email (non-confirmés uniquement) + bandeau rouge + rappel fournisseurs |
| J-0 | Bandeau rouge non-dismissible, escalade Customer Success si non résolu |

---

*Document produit par l'équipe FacturEasy — Mai 2026*  
*Référence réglementaire : Décret 2022-1299, Ordonnance 2021-1190, Article 289 bis CGI*
