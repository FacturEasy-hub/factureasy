/**
 * FacturEasy — Routes /admin
 * Toutes les routes requièrent le middleware requireAdmin (role: 'admin' dans le JWT).
 * Login admin via POST /auth/admin avec le secret ADMIN_SECRET en variable d'env.
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

// =============================================================================
// GET /admin/stats — statistiques globales de la plateforme
// =============================================================================
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [entreprises, factures, finances] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                AS total_entreprises,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_ce_mois
        FROM entreprises
      `),
      pool.query(`
        SELECT
          COUNT(*)                                               AS total_factures,
          COUNT(*) FILTER (WHERE statut = 'ACCEPTEE')            AS acceptees,
          COUNT(*) FILTER (WHERE statut = 'REJETEE')             AS rejetees,
          COUNT(*) FILTER (WHERE statut = 'EMISE')               AS en_attente,
          COALESCE(SUM(montant_ttc), 0)                          AS volume_ttc_total,
          COALESCE(SUM(montant_ht),  0)                          AS volume_ht_total,
          COALESCE(SUM(montant_ttc) FILTER (
            WHERE date_emission > NOW() - INTERVAL '30 days'), 0) AS volume_ce_mois
        FROM factures
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(montant_ttc), 0) AS total_depenses,
          COUNT(*)                       AS nb_depenses
        FROM depenses
      `).catch(() => ({ rows: [{ total_depenses: 0, nb_depenses: 0 }] }))
    ]);

    res.json({
      entreprises: entreprises.rows[0],
      factures:    factures.rows[0],
      finances:    finances.rows[0],
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /admin/entreprises — liste toutes les entreprises
//   Query: page (défaut 1), limit (défaut 20), search (nom ou siret)
// =============================================================================
router.get('/entreprises', requireAdmin, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let sql = `
      SELECT
        e.*,
        COUNT(f.id)                                          AS nb_factures,
        COALESCE(SUM(f.montant_ttc), 0)                     AS ca_ttc_total,
        MAX(f.date_emission)                                 AS derniere_facture
      FROM entreprises e
      LEFT JOIN factures f ON f.emetteur_siret = e.siret
    `;
    const params = [];

    if (search) {
      sql += ` WHERE (e.nom ILIKE $1 OR e.siret ILIKE $1)`;
      params.push(search);
    }

    sql += ` GROUP BY e.id ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);

    // Compte total pour la pagination
    let countSql = 'SELECT COUNT(*) FROM entreprises';
    const countParams = [];
    if (search) { countSql += ' WHERE (nom ILIKE $1 OR siret ILIKE $1)'; countParams.push(search); }
    const { rows: countRows } = await pool.query(countSql, countParams);

    res.json({
      data:  rows,
      total: parseInt(countRows[0].count, 10),
      page,
      limit,
      pages: Math.ceil(parseInt(countRows[0].count, 10) / limit),
    });
  } catch (err) {
    console.error('[admin/entreprises]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /admin/entreprises/:siret — détail d'une entreprise + ses factures
// =============================================================================
router.get('/entreprises/:siret', requireAdmin, async (req, res) => {
  try {
    const { rows: ent } = await pool.query(
      'SELECT * FROM entreprises WHERE siret = $1', [req.params.siret]
    );
    if (!ent[0]) return res.status(404).json({ error: 'Entreprise introuvable' });

    const { rows: factures } = await pool.query(
      'SELECT * FROM factures WHERE emetteur_siret = $1 ORDER BY date_emission DESC LIMIT 50',
      [req.params.siret]
    );

    const { rows: stats } = await pool.query(`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE statut = 'ACCEPTEE')   AS acceptees,
        COUNT(*) FILTER (WHERE statut = 'REJETEE')    AS rejetees,
        COALESCE(SUM(montant_ttc), 0)                 AS ca_ttc,
        COALESCE(SUM(montant_ht),  0)                 AS ca_ht
      FROM factures WHERE emetteur_siret = $1
    `, [req.params.siret]);

    res.json({ entreprise: ent[0], stats: stats[0], factures });
  } catch (err) {
    console.error('[admin/entreprises/:siret]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /admin/factures — toutes les factures de la plateforme
//   Query: page, limit, statut, siret, date_from (YYYY-MM-DD), date_to
// =============================================================================
router.get('/factures', requireAdmin, async (req, res) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit     = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset    = (page - 1) * limit;
    const { statut, siret, date_from, date_to } = req.query;

    let sql = 'SELECT f.*, e.nom AS emetteur_nom FROM factures f LEFT JOIN entreprises e ON e.siret = f.emetteur_siret WHERE 1=1';
    const params = [];
    let i = 1;

    if (statut)    { sql += ` AND f.statut = $${i++}`;                       params.push(statut); }
    if (siret)     { sql += ` AND f.emetteur_siret = $${i++}`;               params.push(siret); }
    if (date_from) { sql += ` AND f.date_emission >= $${i++}`;               params.push(date_from); }
    if (date_to)   { sql += ` AND f.date_emission <= $${i++}::date + 1`;     params.push(date_to); }

    sql += ` ORDER BY f.date_emission DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);

    // Count
    let countSql = 'SELECT COUNT(*) FROM factures WHERE 1=1';
    const countParams = [];
    let j = 1;
    if (statut)    { countSql += ` AND statut = $${j++}`;             countParams.push(statut); }
    if (siret)     { countSql += ` AND emetteur_siret = $${j++}`;     countParams.push(siret); }
    if (date_from) { countSql += ` AND date_emission >= $${j++}`;     countParams.push(date_from); }
    if (date_to)   { countSql += ` AND date_emission <= $${j++}::date + 1`; countParams.push(date_to); }
    const { rows: countRows } = await pool.query(countSql, countParams);

    res.json({
      data:  rows,
      total: parseInt(countRows[0].count, 10),
      page,
      limit,
      pages: Math.ceil(parseInt(countRows[0].count, 10) / limit),
    });
  } catch (err) {
    console.error('[admin/factures]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// DELETE /admin/entreprises/:siret — supprime une entreprise et ses données
// =============================================================================
router.delete('/entreprises/:siret', requireAdmin, async (req, res) => {
  const { siret } = req.params;
  // Utiliser un client dédié pour la transaction (pas le pool partagé)
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id FROM entreprises WHERE siret = $1', [siret]);
    if (!rows[0]) {
      client.release();
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    // Suppression en cascade dans une transaction atomique
    await client.query('BEGIN');
    await client.query('DELETE FROM factures       WHERE emetteur_siret = $1', [siret]);
    // Tables optionnelles — ne pas faire échouer la transaction si elles n'existent pas
    try { await client.query('DELETE FROM depenses        WHERE siret = $1', [siret]); } catch (_) {}
    try { await client.query('DELETE FROM revenus_manuels WHERE siret = $1', [siret]); } catch (_) {}
    await client.query('DELETE FROM entreprises     WHERE siret = $1', [siret]);
    await client.query('COMMIT');

    res.json({ ok: true, message: `Entreprise ${siret} et toutes ses données supprimées` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[admin DELETE /entreprises/:siret]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
