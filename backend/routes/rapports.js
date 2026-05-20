/**
 * FacturEasy — Routes /rapports
 *
 * Rapports financiers SIRET-scoped — agrège les tables existantes
 * (factures, depenses, revenus_manuels). Aucune nouvelle table créée.
 *
 * GET /rapports/bilan?annee=YYYY            — Bilan simplifié annuel
 * GET /rapports/flux-tresorerie?annee=YYYY&trimestre=1 — Flux par mois/trimestre
 * GET /rapports/ca-clients?annee=YYYY&limit=10         — Top clients par CA HT
 * GET /rapports/comparatif?annee=YYYY       — Comparatif N vs N-1
 *
 * server.js : app.use('/rapports', require('./routes/rapports'));
 */

const express          = require('express');
const router           = express.Router();
const pool             = require('../db');
const { authenticate } = require('../middleware/auth');

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** Retourne 0 si la valeur est NaN, null ou undefined. */
function safe(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Tente d'exécuter une requête SQL et retourne 0 en cas d'erreur
 * (table inexistante, colonne manquante, etc.).
 * @param {string} sql
 * @param {any[]}  params
 * @param {string} col     Colonne à lire dans rows[0]
 * @returns {Promise<number>}
 */
async function safeQuery(sql, params, col) {
  try {
    const { rows } = await pool.query(sql, params);
    return safe(rows[0]?.[col] ?? 0);
  } catch (_) {
    return 0;
  }
}

// ─── GET /rapports/bilan?annee=YYYY ──────────────────────────────────────────
//
// Bilan simplifié annuel :
//   actif   = créances clients (ENVOYEE + PARTIELLE) + trésorerie nette
//   passif  = TVA collectée + TVA déductible + TVA due
//   résultat = CA HT (factures payées) - dépenses HT
//
router.get('/bilan', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const annee = parseInt(req.query.annee) || new Date().getFullYear();

    // ── Actif ────────────────────────────────────────────────────────────────

    // Créances clients : factures ENVOYEE + PARTIELLE (montant restant dû ≈ montant_ttc)
    const creancesClients = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc), 0) AS total
      FROM factures
      WHERE emetteur_siret = $1
        AND EXTRACT(YEAR FROM date_emission) = $2
        AND statut IN ('ENVOYEE', 'PARTIELLE')
    `, [siret, annee], 'total');

    // Encaissements factures PAYEE / ACCEPTEE
    const encaissementsFactures = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc), 0) AS total
      FROM factures
      WHERE emetteur_siret = $1
        AND EXTRACT(YEAR FROM date_emission) = $2
        AND statut IN ('PAYEE', 'ACCEPTEE')
    `, [siret, annee], 'total');

    // Revenus manuels encaissés (table optionnelle)
    const encaissementsManuels = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc), 0) AS total
      FROM revenus_manuels
      WHERE siret = $1
        AND EXTRACT(YEAR FROM date_encaissement) = $2
    `, [siret, annee], 'total');

    // Dépenses payées (toutes les dépenses sont réputées réglées)
    const depensesTotales = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc), 0) AS total
      FROM depenses
      WHERE siret = $1
        AND EXTRACT(YEAR FROM date_depense) = $2
    `, [siret, annee], 'total');

    const tresorerie = (encaissementsFactures + encaissementsManuels) - depensesTotales;

    // ── Passif (TVA) ─────────────────────────────────────────────────────────

    // TVA collectée : factures PAYEE / ACCEPTEE (TVA encaissée)
    const tvaCollecteeFactures = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc - montant_ht), 0) AS total
      FROM factures
      WHERE emetteur_siret = $1
        AND EXTRACT(YEAR FROM date_emission) = $2
        AND statut IN ('PAYEE', 'ACCEPTEE')
    `, [siret, annee], 'total');

    const tvaCollecteeManuels = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc - montant_ht), 0) AS total
      FROM revenus_manuels
      WHERE siret = $1
        AND EXTRACT(YEAR FROM date_encaissement) = $2
    `, [siret, annee], 'total');

    const tvaCollectee = tvaCollecteeFactures + tvaCollecteeManuels;

    // TVA déductible : dépenses de l'année
    const tvaDeductible = await safeQuery(`
      SELECT COALESCE(SUM(montant_ttc - montant_ht), 0) AS total
      FROM depenses
      WHERE siret = $1
        AND EXTRACT(YEAR FROM date_depense) = $2
    `, [siret, annee], 'total');

    const tvaDue = Math.max(0, tvaCollectee - tvaDeductible);

    // ── Résultat ─────────────────────────────────────────────────────────────

    // CA HT factures encaissées
    const caHtFactures = await safeQuery(`
      SELECT COALESCE(SUM(montant_ht), 0) AS total
      FROM factures
      WHERE emetteur_siret = $1
        AND EXTRACT(YEAR FROM date_emission) = $2
        AND statut IN ('PAYEE', 'ACCEPTEE')
    `, [siret, annee], 'total');

    const caHtManuels = await safeQuery(`
      SELECT COALESCE(SUM(montant_ht), 0) AS total
      FROM revenus_manuels
      WHERE siret = $1
        AND EXTRACT(YEAR FROM date_encaissement) = $2
    `, [siret, annee], 'total');

    const depensesHt = await safeQuery(`
      SELECT COALESCE(SUM(montant_ht), 0) AS total
      FROM depenses
      WHERE siret = $1
        AND EXTRACT(YEAR FROM date_depense) = $2
    `, [siret, annee], 'total');

    const resultat = parseFloat(
      ((caHtFactures + caHtManuels) - depensesHt).toFixed(2)
    );

    res.json({
      annee,
      actif: {
        creances_clients: parseFloat(creancesClients.toFixed(2)),
        tresorerie:       parseFloat(tresorerie.toFixed(2)),
        total_actif:      parseFloat((creancesClients + tresorerie).toFixed(2)),
      },
      passif: {
        tva_collectee:  parseFloat(tvaCollectee.toFixed(2)),
        tva_deductible: parseFloat(tvaDeductible.toFixed(2)),
        tva_due:        parseFloat(tvaDue.toFixed(2)),
        total_passif:   parseFloat((tvaCollectee + tvaDeductible + tvaDue).toFixed(2)),
      },
      resultat,
    });
  } catch (err) {
    console.error('[GET /rapports/bilan]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /rapports/flux-tresorerie?annee=YYYY&trimestre=1 ────────────────────
//
// Flux mensuels sur l'année (ou un trimestre).
// encaissements = factures PAYEE/ACCEPTEE + revenus manuels
// decaissements = dépenses
//
router.get('/flux-tresorerie', authenticate, async (req, res) => {
  try {
    const siret     = req.user.siret;
    const annee     = parseInt(req.query.annee) || new Date().getFullYear();
    const trimestre = req.query.trimestre ? parseInt(req.query.trimestre) : null;

    // Plage de mois
    let moisDebut = 1;
    let moisFin   = 12;
    if (trimestre && trimestre >= 1 && trimestre <= 4) {
      moisDebut = (trimestre - 1) * 3 + 1;
      moisFin   = moisDebut + 2;
    }

    const periode = trimestre
      ? `${annee}-T${trimestre}`
      : String(annee);

    // Encaissements factures par mois
    const { rows: encFactures } = await pool.query(`
      SELECT
        TO_CHAR(date_emission, 'YYYY-MM') AS mois,
        COALESCE(SUM(montant_ttc), 0)     AS montant
      FROM factures
      WHERE emetteur_siret = $1
        AND EXTRACT(YEAR  FROM date_emission) = $2
        AND EXTRACT(MONTH FROM date_emission) BETWEEN $3 AND $4
        AND statut IN ('PAYEE', 'ACCEPTEE')
      GROUP BY mois
      ORDER BY mois ASC
    `, [siret, annee, moisDebut, moisFin]);

    // Encaissements revenus manuels par mois (table optionnelle)
    let encManuels = [];
    try {
      const { rows } = await pool.query(`
        SELECT
          TO_CHAR(date_encaissement, 'YYYY-MM') AS mois,
          COALESCE(SUM(montant_ttc), 0)          AS montant
        FROM revenus_manuels
        WHERE siret = $1
          AND EXTRACT(YEAR  FROM date_encaissement) = $2
          AND EXTRACT(MONTH FROM date_encaissement) BETWEEN $3 AND $4
        GROUP BY mois
        ORDER BY mois ASC
      `, [siret, annee, moisDebut, moisFin]);
      encManuels = rows;
    } catch (_) { /* table optionnelle */ }

    // Décaissements par mois
    const { rows: decRows } = await pool.query(`
      SELECT
        TO_CHAR(date_depense, 'YYYY-MM') AS mois,
        COALESCE(SUM(montant_ttc), 0)    AS montant
      FROM depenses
      WHERE siret = $1
        AND EXTRACT(YEAR  FROM date_depense) = $2
        AND EXTRACT(MONTH FROM date_depense) BETWEEN $3 AND $4
      GROUP BY mois
      ORDER BY mois ASC
    `, [siret, annee, moisDebut, moisFin]);

    // Indexer par mois (YYYY-MM)
    const encMap = {};
    for (const r of encFactures) {
      encMap[r.mois] = (encMap[r.mois] || 0) + safe(r.montant);
    }
    for (const r of encManuels) {
      encMap[r.mois] = (encMap[r.mois] || 0) + safe(r.montant);
    }

    const decMap = {};
    for (const r of decRows) {
      decMap[r.mois] = safe(r.montant);
    }

    // Construire les listes mois par mois
    const encaissements = [];
    const decaissements = [];
    let soldeTotalNet   = 0;

    for (let m = moisDebut; m <= moisFin; m++) {
      const moisStr = `${annee}-${String(m).padStart(2, '0')}`;
      const enc     = parseFloat((encMap[moisStr] || 0).toFixed(2));
      const dec     = parseFloat((decMap[moisStr] || 0).toFixed(2));
      encaissements.push({ mois: moisStr, montant: enc });
      decaissements.push({ mois: moisStr, montant: dec });
      soldeTotalNet += enc - dec;
    }

    res.json({
      periode,
      encaissements,
      decaissements,
      solde_net: parseFloat(soldeTotalNet.toFixed(2)),
    });
  } catch (err) {
    console.error('[GET /rapports/flux-tresorerie]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /rapports/ca-clients?annee=YYYY&limit=10 ────────────────────────────
//
// Top clients par CA HT (toutes factures émises, hors ANNULEE).
// Inclut délai moyen de paiement en jours (colonne date_paiement si elle existe).
//
router.get('/ca-clients', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const annee = parseInt(req.query.annee) || new Date().getFullYear();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    // Délai moyen : nécessite date_paiement — on protège avec try/catch
    let rows;
    try {
      const res2 = await pool.query(`
        SELECT
          client_nom,
          COALESCE(client_siret, '')            AS client_siret,
          COALESCE(SUM(montant_ht), 0)          AS ca_ht,
          COUNT(*)                              AS nb_factures,
          COALESCE(
            AVG(
              CASE
                WHEN statut IN ('PAYEE', 'ACCEPTEE') AND date_paiement IS NOT NULL
                THEN EXTRACT(DAY FROM (date_paiement::timestamptz - date_emission::timestamptz))
              END
            ), 0
          )::NUMERIC(10,1)                      AS delai_moyen_paiement
        FROM factures
        WHERE emetteur_siret = $1
          AND EXTRACT(YEAR FROM date_emission) = $2
          AND statut NOT IN ('ANNULEE', 'BROUILLON')
        GROUP BY client_nom, client_siret
        ORDER BY ca_ht DESC
        LIMIT $3
      `, [siret, annee, limit]);
      rows = res2.rows;
    } catch (_) {
      // Fallback sans date_paiement
      const res2 = await pool.query(`
        SELECT
          client_nom,
          COALESCE(client_siret, '') AS client_siret,
          COALESCE(SUM(montant_ht), 0) AS ca_ht,
          COUNT(*) AS nb_factures,
          0 AS delai_moyen_paiement
        FROM factures
        WHERE emetteur_siret = $1
          AND EXTRACT(YEAR FROM date_emission) = $2
          AND statut NOT IN ('ANNULEE', 'BROUILLON')
        GROUP BY client_nom, client_siret
        ORDER BY ca_ht DESC
        LIMIT $3
      `, [siret, annee, limit]);
      rows = res2.rows;
    }

    res.json(rows.map(r => ({
      client_nom:             r.client_nom,
      client_siret:           r.client_siret || null,
      ca_ht:                  parseFloat(parseFloat(r.ca_ht).toFixed(2)),
      nb_factures:            parseInt(r.nb_factures),
      delai_moyen_paiement:   parseFloat(parseFloat(r.delai_moyen_paiement || 0).toFixed(1)),
    })));
  } catch (err) {
    console.error('[GET /rapports/ca-clients]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /rapports/comparatif?annee=YYYY ─────────────────────────────────────
//
// Comparatif année N vs N-1 :
//   ca_ht      = somme montant_ht factures non annulées / non brouillon
//   depenses_ht = somme montant_ht dépenses
//   resultat   = ca_ht - depenses_ht
//   marge_pct  = resultat / ca_ht * 100  (0 si ca_ht = 0)
//   evolution_ca_pct = (ca_ht_n - ca_ht_n1) / ca_ht_n1 * 100
//
router.get('/comparatif', authenticate, async (req, res) => {
  try {
    const siret  = req.user.siret;
    const anneeN = parseInt(req.query.annee) || new Date().getFullYear();
    const anneeN1 = anneeN - 1;

    async function statsAnnee(an) {
      const caHt = await safeQuery(`
        SELECT COALESCE(SUM(montant_ht), 0) AS total
        FROM factures
        WHERE emetteur_siret = $1
          AND EXTRACT(YEAR FROM date_emission) = $2
          AND statut NOT IN ('ANNULEE', 'BROUILLON')
      `, [siret, an], 'total');

      const depensesHt = await safeQuery(`
        SELECT COALESCE(SUM(montant_ht), 0) AS total
        FROM depenses
        WHERE siret = $1
          AND EXTRACT(YEAR FROM date_depense) = $2
      `, [siret, an], 'total');

      const resultat = parseFloat((caHt - depensesHt).toFixed(2));
      const margePct = caHt > 0
        ? parseFloat(((resultat / caHt) * 100).toFixed(2))
        : 0;

      return {
        ca_ht:        parseFloat(caHt.toFixed(2)),
        depenses_ht:  parseFloat(depensesHt.toFixed(2)),
        resultat,
        marge_pct:    margePct,
      };
    }

    const [annee_n, annee_n1] = await Promise.all([
      statsAnnee(anneeN),
      statsAnnee(anneeN1),
    ]);

    const evolutionCaPct = annee_n1.ca_ht > 0
      ? parseFloat(
          (((annee_n.ca_ht - annee_n1.ca_ht) / annee_n1.ca_ht) * 100).toFixed(2)
        )
      : 0;

    res.json({
      annee_n,
      annee_n1,
      evolution_ca_pct: evolutionCaPct,
    });
  } catch (err) {
    console.error('[GET /rapports/comparatif]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// server.js: app.use('/rapports', require('./routes/rapports'));
