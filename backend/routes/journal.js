/**
 * FacturEasy — Routes /journal
 *
 * Gestion du journal comptable (écritures) par entreprise (SIRET).
 * Chaque écriture appartient à un SIRET et ne peut être vue/modifiée que par lui.
 *
 * Export FEC : GET /journal/export-fec?annee=YYYY
 *   Format DGFiP — séparateur | — encoding UTF-8
 *   Colonnes : JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|
 *              CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|
 *              EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
 *
 * Init DB : GET /journal/init-db (protégé JWT, une seule fois)
 */

const express    = require('express');
const router     = express.Router();
const pool       = require('../db');
const { authenticate } = require('../middleware/auth');

// ─── Init DB ─────────────────────────────────────────────────────────────────

router.get('/init-db', authenticate, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id             SERIAL PRIMARY KEY,
        siret          VARCHAR(14)    NOT NULL,
        date_ecriture  DATE           NOT NULL,
        journal_code   VARCHAR(10)    NOT NULL DEFAULT 'VE',
        piece_ref      VARCHAR(100),
        libelle        VARCHAR(255)   NOT NULL,
        compte_debit   VARCHAR(20)    NOT NULL,
        compte_credit  VARCHAR(20)    NOT NULL,
        montant        NUMERIC(14,2)  NOT NULL,
        devise         VARCHAR(3)     DEFAULT 'EUR',
        source         VARCHAR(20)    DEFAULT 'MANUEL',
        source_id      INTEGER,
        created_at     TIMESTAMPTZ    DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_journal_siret ON journal_entries(siret);
      CREATE INDEX IF NOT EXISTS idx_journal_date  ON journal_entries(siret, date_ecriture);
    `);
    res.json({ ok: true, message: 'Table journal_entries créée' });
  } catch (err) {
    console.error('[GET /journal/init-db]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Export FEC ───────────────────────────────────────────────────────────────

// GET /journal/export-fec?annee=YYYY
// Déclaré AVANT /journal/:id pour éviter le conflit de route
router.get('/export-fec', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const annee = req.query.annee || new Date().getFullYear().toString();

    if (!/^\d{4}$/.test(annee)) {
      return res.status(400).json({ error: 'Paramètre annee invalide (format YYYY attendu)' });
    }

    const dateDebut = `${annee}-01-01`;
    const dateFin   = `${annee}-12-31`;

    const { rows } = await pool.query(`
      SELECT *
      FROM   journal_entries
      WHERE  siret = $1
        AND  date_ecriture BETWEEN $2 AND $3
      ORDER  BY date_ecriture ASC, id ASC
    `, [siret, dateDebut, dateFin]);

    // En-tête FEC DGFiP
    const FEC_HEADER = [
      'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
      'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
      'PieceRef', 'PieceDate', 'EcritureLib',
      'Debit', 'Credit',
      'EcritureLet', 'DateLet', 'ValidDate',
      'Montantdevise', 'Idevise',
    ].join('|');

    const lines = [FEC_HEADER];

    for (const row of rows) {
      // EcritureNum : EC + id sur 8 chiffres
      const ecritureNum = 'EC' + String(row.id).padStart(8, '0');

      // EcritureDate : YYYYMMDD
      const ecritureDate = row.date_ecriture instanceof Date
        ? row.date_ecriture.toISOString().slice(0, 10).replace(/-/g, '')
        : String(row.date_ecriture).replace(/-/g, '').slice(0, 8);

      // PieceDate : même date que l'écriture si piece_ref présent, sinon vide
      const pieceDate = row.piece_ref ? ecritureDate : '';

      // Montants : format '1500.00' sans symbole
      const montantFormate = parseFloat(row.montant).toFixed(2);

      // Ligne débit (compte_debit)
      const ligneDebit = [
        row.journal_code,          // JournalCode
        row.journal_code,          // JournalLib (simplifié = code)
        ecritureNum,               // EcritureNum
        ecritureDate,              // EcritureDate
        row.compte_debit,          // CompteNum
        '',                        // CompteLib (non stocké)
        '',                        // CompAuxNum
        '',                        // CompAuxLib
        row.piece_ref || '',       // PieceRef
        pieceDate,                 // PieceDate
        row.libelle,               // EcritureLib
        montantFormate,            // Debit
        '0.00',                    // Credit
        '',                        // EcritureLet
        '',                        // DateLet
        '',                        // ValidDate
        montantFormate,            // Montantdevise
        row.devise || 'EUR',       // Idevise
      ].join('|');

      // Ligne crédit (compte_credit)
      const ligneCredit = [
        row.journal_code,
        row.journal_code,
        ecritureNum,
        ecritureDate,
        row.compte_credit,         // CompteNum
        '',
        '',
        '',
        row.piece_ref || '',
        pieceDate,
        row.libelle,
        '0.00',                    // Debit
        montantFormate,            // Credit
        '',
        '',
        '',
        montantFormate,
        row.devise || 'EUR',
      ].join('|');

      lines.push(ligneDebit);
      lines.push(ligneCredit);
    }

    const csvContent = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="FEC_' + annee + '.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('[GET /journal/export-fec]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Liste paginée ────────────────────────────────────────────────────────────

// GET /journal?date_debut=&date_fin=&compte=&page=1&limit=100
router.get('/', authenticate, async (req, res) => {
  try {
    const siret      = req.user.siret;
    const page       = Math.max(1, parseInt(req.query.page  || '1'));
    const limit      = Math.min(500, parseInt(req.query.limit || '100'));
    const offset     = (page - 1) * limit;
    const date_debut = req.query.date_debut || null;
    const date_fin   = req.query.date_fin   || null;
    const compte     = req.query.compte     || null;

    let where  = 'WHERE siret = $1';
    const params = [siret];

    if (date_debut) {
      params.push(date_debut);
      where += ` AND date_ecriture >= $${params.length}`;
    }
    if (date_fin) {
      params.push(date_fin);
      where += ` AND date_ecriture <= $${params.length}`;
    }
    if (compte) {
      params.push(`%${compte}%`);
      const p = params.length;
      where += ` AND (compte_debit ILIKE $${p} OR compte_credit ILIKE $${p})`;
    }

    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*) FROM journal_entries ${where}`, params
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT *
       FROM   journal_entries
       ${where}
       ORDER  BY date_ecriture DESC, id DESC
       LIMIT  $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data:  rows,
      total: parseInt(totalRows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('[GET /journal]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Créer une écriture manuelle ──────────────────────────────────────────────

// POST /journal
router.post('/', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const {
      date_ecriture,
      journal_code = 'VE',
      piece_ref,
      libelle,
      compte_debit,
      compte_credit,
      montant,
    } = req.body;

    // Validation
    if (!libelle || !libelle.trim()) {
      return res.status(400).json({ error: 'Champ requis : libelle' });
    }
    if (!compte_debit || !compte_debit.trim()) {
      return res.status(400).json({ error: 'Champ requis : compte_debit' });
    }
    if (!compte_credit || !compte_credit.trim()) {
      return res.status(400).json({ error: 'Champ requis : compte_credit' });
    }
    if (montant === undefined || montant === null || montant === '') {
      return res.status(400).json({ error: 'Champ requis : montant' });
    }
    const montantNum = parseFloat(montant);
    if (isNaN(montantNum) || montantNum <= 0) {
      return res.status(400).json({ error: 'montant doit être un nombre strictement positif' });
    }

    const dateEcriture = date_ecriture || new Date().toISOString().slice(0, 10);

    const { rows } = await pool.query(`
      INSERT INTO journal_entries
        (siret, date_ecriture, journal_code, piece_ref, libelle, compte_debit, compte_credit, montant, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'MANUEL')
      RETURNING *
    `, [
      siret,
      dateEcriture,
      journal_code.trim().toUpperCase(),
      piece_ref || null,
      libelle.trim(),
      compte_debit.trim(),
      compte_credit.trim(),
      montantNum,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /journal]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Supprimer une écriture (hard delete) ─────────────────────────────────────

// DELETE /journal/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const siret = req.user.siret;
    const id    = parseInt(req.params.id);

    // IDOR : vérifier appartenance avant suppression
    const { rows: check } = await pool.query(
      'SELECT id FROM journal_entries WHERE id = $1 AND siret = $2', [id, siret]
    );
    if (!check.length) return res.status(404).json({ error: 'Écriture introuvable' });

    await pool.query('DELETE FROM journal_entries WHERE id = $1 AND siret = $2', [id, siret]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /journal/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// server.js: app.use('/journal', require('./routes/journal'));
