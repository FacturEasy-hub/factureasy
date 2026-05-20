/**
 * FacturEasy — Routes /crm
 *
 * Gestion CRM : contrats récurrents + relances clients par entreprise (SIRET).
 * Chaque enregistrement est scopé au SIRET du token JWT.
 *
 * Init DB : GET /crm/init-db (protégé JWT, une seule fois)
 *
 * Contrats :
 *   GET    /crm/contracts?statut=&page=1&limit=50
 *   POST   /crm/contracts
 *   PUT    /crm/contracts/:id
 *   DELETE /crm/contracts/:id   → soft delete (statut = RESILIE)
 *
 * Relances :
 *   GET    /crm/relances?facture_id=&page=1
 *   POST   /crm/relances   (niveau 1 = amiable, 2 = mise en demeure, 3 = contentieux)
 *
 * Stats :
 *   GET    /crm/stats
 */

const express    = require('express');
const router     = express.Router();
const pool       = require('../db');
const { authenticate } = require('../middleware/auth');

// ─── Init DB ──────────────────────────────────────────────────────────────────

router.get('/init-db', authenticate, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_contracts (
        id          SERIAL PRIMARY KEY,
        siret       VARCHAR(14)    NOT NULL,
        client_id   INTEGER        NOT NULL,
        titre       VARCHAR(255)   NOT NULL,
        montant     NUMERIC(14,2)  NOT NULL DEFAULT 0,
        frequence   VARCHAR(20)    DEFAULT 'MENSUEL',
        date_debut  DATE           NOT NULL,
        date_fin    DATE,
        statut      VARCHAR(20)    DEFAULT 'ACTIF',
        notes       TEXT,
        created_at  TIMESTAMPTZ    DEFAULT NOW(),
        updated_at  TIMESTAMPTZ    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_relances (
        id           SERIAL PRIMARY KEY,
        siret        VARCHAR(14)    NOT NULL,
        facture_id   INTEGER        NOT NULL,
        client_id    INTEGER        NOT NULL,
        niveau       INTEGER        DEFAULT 1,
        date_relance TIMESTAMPTZ    DEFAULT NOW(),
        statut       VARCHAR(20)    DEFAULT 'ENVOYEE',
        message      TEXT,
        created_at   TIMESTAMPTZ    DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_crm_contracts_siret ON crm_contracts(siret);
      CREATE INDEX IF NOT EXISTS idx_crm_relances_siret  ON crm_relances(siret);
    `);
    res.json({ ok: true, message: 'Tables crm_contracts et crm_relances créées' });
  } catch (err) {
    console.error('[GET /crm/init-db]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Contrats : liste ─────────────────────────────────────────────────────────

// GET /crm/contracts?statut=ACTIF&page=1&limit=50
router.get('/contracts', authenticate, async (req, res) => {
  try {
    const siret  = req.user.siret;
    const statut = req.query.statut || '';
    const page   = Math.max(1, parseInt(req.query.page  || '1'));
    const limit  = Math.min(200, parseInt(req.query.limit || '50'));
    const offset = (page - 1) * limit;

    let where    = 'WHERE siret = $1';
    const params = [siret];

    if (statut) {
      params.push(statut.toUpperCase());
      where += ` AND statut = $${params.length}`;
    }

    const { rows: total } = await pool.query(
      `SELECT COUNT(*) FROM crm_contracts ${where}`, params
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM crm_contracts ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data:  rows,
      total: parseInt(total[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('[GET /crm/contracts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Contrats : créer ─────────────────────────────────────────────────────────

// POST /crm/contracts
router.post('/contracts', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const {
      client_id, titre, montant, frequence = 'MENSUEL',
      date_debut, date_fin, statut = 'ACTIF', notes,
    } = req.body;

    if (!client_id || !titre || montant === undefined || montant === null || !date_debut) {
      return res.status(400).json({
        error: 'Champs requis : client_id, titre, montant, date_debut',
      });
    }

    const { rows } = await pool.query(`
      INSERT INTO crm_contracts
        (siret, client_id, titre, montant, frequence, date_debut, date_fin, statut, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      siret,
      parseInt(client_id),
      titre.trim(),
      parseFloat(montant),
      (frequence || 'MENSUEL').toUpperCase(),
      date_debut,
      date_fin || null,
      (statut || 'ACTIF').toUpperCase(),
      notes || null,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /crm/contracts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Contrats : mettre à jour ─────────────────────────────────────────────────

// PUT /crm/contracts/:id
router.put('/contracts/:id', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const id    = parseInt(req.params.id);

    // IDOR : vérifier appartenance
    const { rows: check } = await pool.query(
      'SELECT id FROM crm_contracts WHERE id = $1 AND siret = $2', [id, siret]
    );
    if (!check.length) return res.status(404).json({ error: 'Contrat introuvable' });

    const {
      client_id, titre, montant, frequence,
      date_debut, date_fin, statut, notes,
    } = req.body;

    if (!client_id || !titre || montant === undefined || montant === null || !date_debut) {
      return res.status(400).json({
        error: 'Champs requis : client_id, titre, montant, date_debut',
      });
    }

    const { rows } = await pool.query(`
      UPDATE crm_contracts
      SET client_id  = $1,
          titre      = $2,
          montant    = $3,
          frequence  = $4,
          date_debut = $5,
          date_fin   = $6,
          statut     = $7,
          notes      = $8,
          updated_at = NOW()
      WHERE id = $9 AND siret = $10
      RETURNING *
    `, [
      parseInt(client_id),
      titre.trim(),
      parseFloat(montant),
      (frequence || 'MENSUEL').toUpperCase(),
      date_debut,
      date_fin || null,
      (statut || 'ACTIF').toUpperCase(),
      notes || null,
      id,
      siret,
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /crm/contracts/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Contrats : soft delete ───────────────────────────────────────────────────

// DELETE /crm/contracts/:id  → statut = RESILIE
router.delete('/contracts/:id', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const id    = parseInt(req.params.id);

    const { rowCount } = await pool.query(
      `UPDATE crm_contracts
       SET statut = 'RESILIE', updated_at = NOW()
       WHERE id = $1 AND siret = $2`,
      [id, siret]
    );
    if (!rowCount) return res.status(404).json({ error: 'Contrat introuvable' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /crm/contracts/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Relances : liste ─────────────────────────────────────────────────────────

// GET /crm/relances?facture_id=&page=1
router.get('/relances', authenticate, async (req, res) => {
  try {
    const siret      = req.user.siret;
    const facture_id = req.query.facture_id ? parseInt(req.query.facture_id) : null;
    const page       = Math.max(1, parseInt(req.query.page  || '1'));
    const limit      = Math.min(200, parseInt(req.query.limit || '50'));
    const offset     = (page - 1) * limit;

    let where    = 'WHERE siret = $1';
    const params = [siret];

    if (facture_id) {
      params.push(facture_id);
      where += ` AND facture_id = $${params.length}`;
    }

    const { rows: total } = await pool.query(
      `SELECT COUNT(*) FROM crm_relances ${where}`, params
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM crm_relances ${where}
       ORDER BY date_relance DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data:  rows,
      total: parseInt(total[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('[GET /crm/relances]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Relances : créer ─────────────────────────────────────────────────────────

// POST /crm/relances
// niveau 1 = relance amiable, 2 = mise en demeure, 3 = contentieux
router.post('/relances', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const { facture_id, client_id, niveau, message, statut = 'ENVOYEE' } = req.body;

    if (!facture_id || !client_id || niveau === undefined || niveau === null || !message) {
      return res.status(400).json({
        error: 'Champs requis : facture_id, client_id, niveau, message',
      });
    }

    const niveauInt = parseInt(niveau);
    if (![1, 2, 3].includes(niveauInt)) {
      return res.status(400).json({
        error: 'niveau doit être 1 (amiable), 2 (mise en demeure) ou 3 (contentieux)',
      });
    }

    const { rows } = await pool.query(`
      INSERT INTO crm_relances
        (siret, facture_id, client_id, niveau, statut, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      siret,
      parseInt(facture_id),
      parseInt(client_id),
      niveauInt,
      (statut || 'ENVOYEE').toUpperCase(),
      message.trim(),
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /crm/relances]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats CRM ────────────────────────────────────────────────────────────────

// GET /crm/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;

    // Contrats actifs : nombre + montant total
    const { rows: contractStats } = await pool.query(`
      SELECT
        COUNT(*)                  AS nb_contrats_actifs,
        COALESCE(SUM(montant), 0) AS montant_total_actifs
      FROM crm_contracts
      WHERE siret = $1 AND statut = 'ACTIF'
    `, [siret]);

    // Relances envoyées ce mois-ci
    const { rows: relanceStats } = await pool.query(`
      SELECT COUNT(*) AS nb_relances_mois
      FROM crm_relances
      WHERE siret = $1
        AND date_trunc('month', date_relance) = date_trunc('month', NOW())
    `, [siret]);

    // Top 5 clients par montant total factures
    // Si la table factures n'existe pas encore, repli sur crm_contracts
    let top5 = [];
    try {
      const { rows: top5Factures } = await pool.query(`
        SELECT
          client_id,
          COALESCE(SUM(montant_ht), 0) AS montant_total
        FROM factures
        WHERE siret = $1
        GROUP BY client_id
        ORDER BY montant_total DESC
        LIMIT 5
      `, [siret]);
      top5 = top5Factures;
    } catch (_) {
      // La table factures n'existe pas encore : repli sur crm_contracts actifs
      const { rows: top5Contrats } = await pool.query(`
        SELECT
          client_id,
          COALESCE(SUM(montant), 0) AS montant_total
        FROM crm_contracts
        WHERE siret = $1 AND statut = 'ACTIF'
        GROUP BY client_id
        ORDER BY montant_total DESC
        LIMIT 5
      `, [siret]);
      top5 = top5Contrats;
    }

    res.json({
      nb_contrats_actifs:   parseInt(contractStats[0].nb_contrats_actifs),
      montant_total_actifs: parseFloat(contractStats[0].montant_total_actifs),
      nb_relances_mois:     parseInt(relanceStats[0].nb_relances_mois),
      top5_clients:         top5,
    });
  } catch (err) {
    console.error('[GET /crm/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// server.js: app.use('/crm', require('./routes/crm'));
