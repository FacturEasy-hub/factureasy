# Templates email — Notification identifiant PPF FacturEasy

**Usage :** Ces 5 templates couvrent l'intégralité du cycle de communication PPF, de la sensibilisation à la confirmation. Les variables entre crochets sont injectées dynamiquement par le moteur d'emailing FacturEasy.

---

## Template 1 — Email J-90 "Sensibilisation"

**De :** FacturEasy → Client FacturEasy  
**Déclenchement :** automatique à J-90 avant `echeance_ppf`

---

**Objet :** [Action requise] La réforme e-facture arrive — voici ce que vous devez faire avant le [DATE_LIMITE_NOTIFICATION]

---

Bonjour [PRENOM_CLIENT],

La réforme de la facturation électronique entre en vigueur pour votre entreprise le **[DATE_ECHEANCE]**. Vous avez 90 jours pour prendre les mesures nécessaires.

**Ce que la loi vous impose :**

Toute entreprise assujettie à la TVA doit notifier ses fournisseurs de son identifiant PPF (Portail Public de Facturation) au moins 60 à 90 jours avant son échéance de déploiement. Sans cette étape, vos fournisseurs ne pourront pas vous adresser de factures électroniques conformes.

**3 choses à faire maintenant :**

1. Prenez note de votre identifiant PPF FacturEasy (votre SIRET enregistré auprès du PPF)
2. Listez vos fournisseurs actifs à notifier
3. Préparez l'envoi — FacturEasy met à votre disposition un template prêt à l'emploi

**[Télécharger ma fiche d'identité PPF]**

Votre fiche d'identité PPF est un document PDF prêt à transmettre à vos fournisseurs, ou à joindre à votre propre email de notification.

---

Vous avez des questions ? Notre équipe est disponible via le chat intégré dans FacturEasy ou à support@factureasy.fr.

Cordialement,  
L'équipe FacturEasy

---
*FacturEasy — Plateforme de Dématérialisation Partenaire agréée DGFiP*  
*Ce message est envoyé automatiquement dans le cadre de votre conformité à la réforme e-facture (décret 2022-1299).*  
*Pour ne plus recevoir ces notifications : [Se désabonner] — Attention : ces notifications sont liées à une obligation légale.*

---

## Template 2 — Email J-60 "Votre identifiant PPF"

**De :** FacturEasy → Client FacturEasy  
**Déclenchement :** automatique à J-60 avant `echeance_ppf`

---

**Objet :** Votre identifiant PPF : [SIRET_CLIENT] — à transmettre à vos [N_FOURNISSEURS] fournisseurs

---

Bonjour [PRENOM_CLIENT],

Il vous reste **60 jours** pour notifier vos fournisseurs de votre identifiant PPF. Voici tout ce dont vous avez besoin pour agir maintenant.

---

**Votre identifiant PPF FacturEasy :**

> `[SIRET_CLIENT]`

Cet identifiant correspond à votre SIRET enregistré auprès du Portail Public de Facturation via FacturEasy. C'est le numéro que vos fournisseurs doivent enregistrer dans leur système pour vous adresser des factures électroniques conformes.

---

**Vos fournisseurs à notifier :**

Nous avons identifié **[N_FOURNISSEURS] fournisseurs** dans votre compte FacturEasy. Connectez-vous pour voir la liste complète et suivre l'état de vos notifications.

**[Voir ma liste de fournisseurs à notifier]**

---

**Template email à copier-coller :**

Utilisez le message ci-dessous pour notifier vos fournisseurs. Adaptez-le si nécessaire.

---

*Objet : Notre identifiant de facturation électronique — Information importante*

*Bonjour,*

*Dans le cadre de la réforme de la facturation électronique obligatoire en France (décret 2022-1299), nous vous informons de nos nouvelles coordonnées de facturation électronique.*

*Notre entreprise : [NOM_ENTREPRISE_CLIENT]*  
*SIRET : [SIRET_CLIENT]*  
*Identifiant PPF : [SIRET_CLIENT]*  
*Plateforme : FacturEasy (PDP agréée DGFiP)*

*À partir du [DATE_OBLIGATION], toutes vos factures à notre attention devront être émises au format électronique structuré en mentionnant notre identifiant PPF ci-dessus.*

*Merci d'enregistrer ces informations dans votre système de facturation.*

*Pour toute question : [EMAIL_COMPTABILITE_CLIENT] — [TELEPHONE_CLIENT]*

*Cordialement,*  
*[NOM_SIGNATAIRE]*  
*[TITRE] — [NOM_ENTREPRISE_CLIENT]*

---

Vous pouvez aussi télécharger votre fiche d'identité PPF en PDF et la joindre directement à votre email.

**[Télécharger ma fiche PPF en PDF]**

---

L'équipe FacturEasy — support@factureasy.fr

---
*FacturEasy — PDP agréée DGFiP | Référence : décret 2022-1299*

---

## Template 3 — Email "Template fournisseur"

**De :** Client FacturEasy → Ses fournisseurs  
**Usage :** Email que le CLIENT copie-colle et envoie LUI-MÊME à ses fournisseurs. Ce template est disponible dans l'interface FacturEasy (section "Notifications PPF") et proposé dans les emails J-60 et J-30.

---

**Objet :** Notification de notre plateforme de facturation électronique

---

Bonjour,

Suite à la réforme de la facturation électronique obligatoire en France (loi de finances 2020, décret 2022-1299), notre entreprise a finalisé son raccordement à une Plateforme de Dématérialisation Partenaire (PDP) agréée par la DGFiP.

Nous vous adressons ce message afin de vous communiquer nos nouvelles coordonnées de facturation électronique, conformément aux obligations légales en vigueur.

---

**Nos coordonnées de facturation électronique :**

- **Raison sociale :** [NOM_ENTREPRISE_CLIENT]
- **SIRET :** [SIRET_CLIENT]
- **Identifiant PPF :** [SIRET_CLIENT]
- **Plateforme utilisée :** FacturEasy (PDP agréée DGFiP — numéro d'agrément : [NUMERO_AGREMENT])

---

**Ce que cela signifie pour vous :**

À compter du **[DATE_OBLIGATION]**, toutes les factures que vous nous adressez devront être :
- Émises au format électronique structuré (UBL, CII ou Factur-X)
- Transmises via votre propre PDP ou le Portail Public de Facturation (PPF)
- Accompagnées de notre identifiant PPF : **[SIRET_CLIENT]**

Les factures papier et les PDF non structurés ne seront plus acceptés après cette date.

---

**Actions à réaliser de votre côté :**

1. Enregistrer notre identifiant PPF (`[SIRET_CLIENT]`) dans votre logiciel de facturation
2. Vérifier que votre logiciel prend en charge l'émission au format électronique structuré
3. Nous confirmer la bonne réception de cette information en répondant à cet email

---

Pour toute question relative à cette transition, n'hésitez pas à nous contacter :

- Email comptabilité : [EMAIL_COMPTABILITE_CLIENT]
- Téléphone : [TELEPHONE_CLIENT]
- Référent : [NOM_REFERENT_CLIENT]

Nous restons à votre disposition pour vous accompagner dans cette démarche.

Cordialement,

[NOM_SIGNATAIRE]  
[TITRE]  
[NOM_ENTREPRISE_CLIENT]  
[ADRESSE_CLIENT]  
[EMAIL_CLIENT] | [TELEPHONE_CLIENT]

---

## Template 4 — Email J-30 "Relance urgente"

**De :** FacturEasy → Client FacturEasy  
**Déclenchement :** automatique à J-30 avant `echeance_ppf`, uniquement si `ppf_notified_at IS NULL`

---

**Objet :** [URGENT] 30 jours pour notifier vos fournisseurs — votre identifiant PPF : [SIRET_CLIENT]

---

Bonjour [PRENOM_CLIENT],

Nous vous avons contacté il y a 30 jours au sujet de votre obligation de notifier vos fournisseurs de votre identifiant PPF. **Nous n'avons pas encore enregistré de confirmation de votre part.**

Il vous reste **30 jours**.

---

**Rappel :**

| Information | Valeur |
|---|---|
| Votre identifiant PPF | `[SIRET_CLIENT]` |
| Votre échéance | [DATE_ECHEANCE] |
| Date limite de notification | [DATE_LIMITE_NOTIFICATION] |
| Fournisseurs à notifier | [N_FOURNISSEURS] |

---

**Pourquoi agir maintenant ?**

Après le **[DATE_LIMITE_NOTIFICATION]**, vos fournisseurs qui n'ont pas enregistré votre identifiant PPF ne pourront pas vous adresser de factures électroniques conformes. Cela peut entraîner :

- Un blocage de vos flux de facturation entrante
- Des risques de non-déductibilité de TVA sur les factures non conformes
- Des pénalités potentielles en cas de contrôle fiscal

---

**Agissez en 3 minutes :**

1. Cliquez sur le bouton ci-dessous pour accéder à votre liste de fournisseurs
2. Copiez le template email disponible dans FacturEasy
3. Envoyez-le à vos fournisseurs et cliquez "Je l'ai fait" dans votre tableau de bord

**[Notifier mes fournisseurs maintenant]**

---

Si vous avez déjà effectué cette démarche sans le signaler dans FacturEasy, connectez-vous et cliquez **"Je l'ai fait"** dans le bandeau rouge de votre tableau de bord.

Des questions ? Répondez à cet email ou contactez-nous à support@factureasy.fr. Un membre de notre équipe peut vous accompagner par téléphone sur rendez-vous.

Cordialement,  
L'équipe FacturEasy — support@factureasy.fr

---
*FacturEasy — PDP agréée DGFiP | Cet email est envoyé dans le cadre de vos obligations légales (décret 2022-1299).*

---

## Template 5 — Email de confirmation (accusé de réception fournisseur)

**De :** FacturEasy → Client FacturEasy  
**Déclenchement :** lorsqu'un fournisseur accuse réception de la notification PPF, OU lorsque le client clique "Je l'ai fait" dans FacturEasy

---

**Objet :** Confirmation — Votre identifiant PPF a été transmis avec succès

---

Bonjour [PRENOM_CLIENT],

Bonne nouvelle : nous avons bien enregistré la confirmation de transmission de votre identifiant PPF.

---

**Récapitulatif :**

- **Identifiant PPF transmis :** `[SIRET_CLIENT]`
- **Date de confirmation :** [DATE_CONFIRMATION]
- **Fournisseurs notifiés :** [N_FOURNISSEURS_NOTIFIES] sur [N_FOURNISSEURS_TOTAL]

---

**Prochaines étapes :**

Si certains fournisseurs n'ont pas encore été notifiés ou n'ont pas accusé réception, vous pouvez relancer individuellement depuis votre espace FacturEasy (section "Notifications PPF" → colonne "Statut").

Pensez également à communiquer votre identifiant PPF à tout nouveau fournisseur que vous référencerez à l'avenir.

---

**Votre fiche d'identité PPF :**

Nous vous recommandons de télécharger votre fiche d'identité PPF et de la conserver dans votre documentation administrative. Elle peut être demandée par vos fournisseurs ou lors d'un contrôle fiscal.

**[Télécharger ma fiche PPF en PDF]**

---

Merci d'avoir complété cette étape importante de votre mise en conformité à la réforme e-facture.

Pour toute question : support@factureasy.fr

Cordialement,  
L'équipe FacturEasy

---
*FacturEasy — PDP agréée DGFiP | Référence : décret 2022-1299*

