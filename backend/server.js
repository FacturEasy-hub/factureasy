require('dotenv').config();

// ─── Validation des secrets au démarrage ────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'factureasy-dev-secret-change-in-prod') {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET non défini ou valeur par défaut en production. Arrêt.');
    process.exit(1);
  }
}

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const axios      = require('axios');
const pool       = require('./db');

// ─── Numérotation séquentielle des factures ──────────────────────────────────
// Garantit une séquence chronologique sans rupture par SIRET (obligation légale)
async function nextNumeroFacture(siret) {
  const year = new Date().getFullYear();
  const prefix = `FE-${year}`;

  // Upsert atomique sur la séquence du SIRET pour l'année courante
  const { rows } = await pool.query(`
    INSERT INTO invoice_sequences (siret, year, last_seq)
    VALUES ($1, $2, 1)
    ON CONFLICT (siret, year)
    DO UPDATE SET last_seq = invoice_sequences.last_seq + 1
    RETURNING last_seq
  `, [siret, year]);

  const seq = String(rows[0].last_seq).padStart(4, '0');
  return `${prefix}-${seq}`;
}

const { generateToken, authenticate, requireAdmin } = require('./middleware/auth');
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'factureasy-admin-change-in-prod';

const app = express();

// ─── Sécurité : helmet ─────────────────────────────────────────────────────────
try {
  const helmet = require('helmet');
  // CSP désactivée sur /backoffice (panel admin avec scripts inline)
  app.use('/backoffice', helmet({ contentSecurityPolicy: false }));
  // CSP stricte partout ailleurs
  app.use(helmet());
} catch (_) { /* helmet optionnel — npm install helmet */ }

// ─── Rate limiting sur /auth/* ─────────────────────────────────────────────────
try {
  const rateLimit = require('express-rate-limit');
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
    message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' } });
  app.use('/auth', authLimiter);
} catch (_) { /* express-rate-limit optionnel — npm install express-rate-limit */ }

// ─── CORS restreint aux origines autorisées ────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Autoriser tous les domaines Vercel du projet (previews + production)
    if (/\.vercel\.app$/.test(origin)) return cb(null, true);
    // Autoriser le backend lui-même (admin panel servi depuis onrender.com)
    if (/\.onrender\.com$/.test(origin)) return cb(null, true);
    cb(new Error('Origin non autorisée par CORS : ' + origin));
  },
  credentials: true,
}));

// ⚠️  /stripe/webhook doit être monté AVANT express.json()
// car il a besoin du body brut pour vérifier la signature Stripe
app.use('/stripe', require('./routes/stripe'));

app.use(express.json());

// ─── Chorus Pro OAuth2 ───────────────────────────────────────────────────────

const CHORUS_API   = 'https://chorus-pro.gouv.fr/api';
const CHORUS_TOKEN = 'https://oauth.chorus-pro.gouv.fr/token';

let _cachedToken = null;
let _tokenExpiry = 0;

async function getChorusToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const res = await axios.post(CHORUS_TOKEN, new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     process.env.CHORUS_CLIENT_ID,
    client_secret: process.env.CHORUS_CLIENT_SECRET,
    scope:         'openid'
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  _cachedToken = res.data.access_token;
  _tokenExpiry = Date.now() + (res.data.expires_in - 30) * 1000;
  return _cachedToken;
}

function chorusHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Initialisation DB (admin uniquement) ────────────────────────────────────
app.get('/init-db', requireAdmin, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entreprises (
        id                     SERIAL PRIMARY KEY,
        siret                  VARCHAR(14) UNIQUE NOT NULL,
        nom                    VARCHAR(255) NOT NULL,
        email                  VARCHAR(255),
        -- Stripe
        stripe_customer_id     VARCHAR(100),
        stripe_subscription_id VARCHAR(100),
        plan                   VARCHAR(50) DEFAULT 'gratuit',
        trial_ends_at          TIMESTAMPTZ,
        updated_at             TIMESTAMP DEFAULT NOW(),
        created_at             TIMESTAMP DEFAULT NOW()
      );

      -- Migration idempotente : ajouter les colonnes Stripe si elles n'existent pas déjà
      DO $$ BEGIN
        ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(100);
        ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
        ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS plan                   VARCHAR(50) DEFAULT 'gratuit';
        ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ;
        ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMP DEFAULT NOW();
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS factures (
        id                    SERIAL PRIMARY KEY,
        numero                VARCHAR(50) UNIQUE NOT NULL,
        emetteur_siret        VARCHAR(14) NOT NULL,
        client_siret          VARCHAR(14) NOT NULL,
        client_nom            VARCHAR(255) NOT NULL,
        description           TEXT,
        montant_ht            NUMERIC(12,2) NOT NULL,
        tva                   NUMERIC(5,2) DEFAULT 20,
        montant_ttc           NUMERIC(12,2) NOT NULL,
        statut                VARCHAR(50) DEFAULT 'EMISE',
        chorus_id             VARCHAR(100),
        type_document         VARCHAR(10) DEFAULT 'FAC',
        avoir_de_facture_id   INTEGER REFERENCES factures(id),
        date_emission         TIMESTAMP DEFAULT NOW(),
        updated_at            TIMESTAMP DEFAULT NOW()
      );

      -- Colonnes optionnelles ajoutées en migration (idempotentes)
      DO $$ BEGIN
        ALTER TABLE factures ADD COLUMN IF NOT EXISTS type_document VARCHAR(10) DEFAULT 'FAC';
        ALTER TABLE factures ADD COLUMN IF NOT EXISTS avoir_de_facture_id INTEGER REFERENCES factures(id);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      -- Séquences de numérotation légale par SIRET et année
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        siret    VARCHAR(14) NOT NULL,
        year     INTEGER     NOT NULL,
        last_seq INTEGER     DEFAULT 0,
        PRIMARY KEY (siret, year)
      );

      CREATE INDEX IF NOT EXISTS idx_factures_siret  ON factures(emetteur_siret);
      CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);

      -- ── Catalogue produits/services ────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS catalogue (
        id              SERIAL PRIMARY KEY,
        siret           VARCHAR(14)   NOT NULL,
        reference       VARCHAR(100),
        nom             VARCHAR(255)  NOT NULL,
        description     TEXT,
        prix_ht         NUMERIC(12,2) NOT NULL DEFAULT 0,
        tva_taux        NUMERIC(5,2)  NOT NULL DEFAULT 20,
        unite           VARCHAR(50)   DEFAULT 'unité',
        code_comptable  VARCHAR(50),
        actif           BOOLEAN       DEFAULT TRUE,
        created_at      TIMESTAMPTZ   DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_catalogue_siret ON catalogue(siret);

      -- ── Devis ──────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS devis_sequences (
        siret    VARCHAR(14) NOT NULL,
        year     INTEGER     NOT NULL,
        last_seq INTEGER     DEFAULT 0,
        PRIMARY KEY (siret, year)
      );
      CREATE TABLE IF NOT EXISTS devis (
        id              SERIAL PRIMARY KEY,
        numero          VARCHAR(50)   UNIQUE NOT NULL,
        siret           VARCHAR(14)   NOT NULL,
        client_siret    VARCHAR(14),
        client_nom      VARCHAR(255)  NOT NULL,
        client_email    VARCHAR(255),
        client_adresse  TEXT,
        objet           VARCHAR(255),
        montant_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
        tva_taux        NUMERIC(5,2)  DEFAULT 20,
        montant_ttc     NUMERIC(12,2) NOT NULL DEFAULT 0,
        statut          VARCHAR(20)   DEFAULT 'BROUILLON',
        date_emission   DATE          DEFAULT CURRENT_DATE,
        date_validite   DATE,
        notes           TEXT,
        facture_id      INTEGER,
        created_at      TIMESTAMPTZ   DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS devis_lignes (
        id               SERIAL PRIMARY KEY,
        devis_id         INTEGER       NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
        description      TEXT          NOT NULL,
        quantite         NUMERIC(10,3) DEFAULT 1,
        prix_unitaire_ht NUMERIC(12,2) NOT NULL,
        tva_taux         NUMERIC(5,2)  DEFAULT 20,
        montant_ht       NUMERIC(12,2) NOT NULL,
        unite            VARCHAR(50)   DEFAULT 'unité',
        catalogue_id     INTEGER,
        ordre            INTEGER       DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_devis_siret  ON devis(siret);
      CREATE INDEX IF NOT EXISTS idx_devis_lignes ON devis_lignes(devis_id);
    `);
    res.json({ ok: true, message: 'Schéma initialisé' });
  } catch (err) {
    console.error('[init-db]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Authentification ────────────────────────────────────────────────────────

// POST /auth/login — crée ou récupère une entreprise et retourne un JWT
app.post('/auth/login', async (req, res) => {
  try {
    const { siret, nom, email } = req.body;
    if (!siret || !nom) return res.status(400).json({ error: 'siret et nom requis' });

    // Upsert entreprise
    const { rows } = await pool.query(
      `INSERT INTO entreprises (siret, nom, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (siret) DO UPDATE SET nom = $2, email = COALESCE($3, entreprises.email)
       RETURNING *`,
      [siret, nom, email || null]
    );

    const token = generateToken({ siret: rows[0].siret, nom: rows[0].nom, id: rows[0].id });
    res.json({ token, entreprise: rows[0] });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Auth : profil courant ────────────────────────────────────────────────────

// GET /auth/me — retourne l'entreprise connectée (plan, trial_ends_at, etc.)
app.get('/auth/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, siret, nom, email, plan, trial_ends_at, stripe_customer_id, created_at
       FROM entreprises WHERE siret = $1`,
      [req.user.siret]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Entreprise introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /auth/me]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Entreprises ─────────────────────────────────────────────────────────────

app.post('/entreprises', authenticate, async (req, res) => {
  try {
    const { siret, nom, email } = req.body;
    if (!siret || !nom) return res.status(400).json({ error: 'siret et nom requis' });
    const { rows } = await pool.query(
      'INSERT INTO entreprises (siret, nom, email) VALUES ($1,$2,$3) ON CONFLICT (siret) DO UPDATE SET nom=$2, email=$3 RETURNING *',
      [siret, nom, email]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[POST /entreprises]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/entreprises/:siret', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM entreprises WHERE siret = $1', [req.params.siret]);
    if (!rows[0]) return res.status(404).json({ error: 'Entreprise introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /entreprises]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Factures ────────────────────────────────────────────────────────────────

app.get('/factures', authenticate, async (req, res) => {
  try {
    // IDOR fix: siret forcé depuis le JWT, le query param est ignoré
    const siret = req.user.siret;
    const { statut } = req.query;
    let query = 'SELECT * FROM factures WHERE emetteur_siret = $1';
    const params = [siret];
    if (statut) { query += ' AND statut = $2'; params.push(statut); }
    query += ' ORDER BY date_emission DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /factures]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/factures/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM factures WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
    // IDOR fix: vérifier que la facture appartient à l'entreprise connectée
    if (rows[0].emetteur_siret !== req.user.siret) {
      return res.status(403).json({ error: 'Accès interdit à cette facture' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /factures/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/factures', authenticate, async (req, res) => {
  try {
    const { client_siret, client_nom, description, montant_ht, tva = 20, numero_engagement } = req.body;
    // IDOR fix: emetteur_siret forcé depuis le JWT
    const emetteur_siret = req.user.siret;
    if (!emetteur_siret || !client_siret || !client_nom || !montant_ht) {
      return res.status(400).json({ error: 'Champs requis : client_siret, client_nom, montant_ht' });
    }

    const montant_ttc = parseFloat((montant_ht * (1 + tva / 100)).toFixed(2));
    const montant_tva = parseFloat((montant_ht * tva / 100).toFixed(2));
    const numero      = await nextNumeroFacture(emetteur_siret);
    const date_emission = new Date().toISOString().split('T')[0];

    // Si pas de credentials Chorus Pro → mode mock
    if (!process.env.CHORUS_CLIENT_ID) {
      const { rows } = await pool.query(
        `INSERT INTO factures
          (numero, emetteur_siret, client_siret, client_nom, description, montant_ht, tva, montant_ttc, statut, chorus_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'EMISE','MOCK-' || $1) RETURNING *`,
        [numero, emetteur_siret, client_siret, client_nom, description, montant_ht, tva, montant_ttc]
      );
      return res.status(201).json(rows[0]);
    }

    const token = await getChorusToken();
    const payload = {
      codeFournisseur:  emetteur_siret,
      codeDestinataire: client_siret,
      numeroFacture:    numero,
      dateFacture:      date_emission,
      montantHT:        montant_ht,
      montantTVA:       montant_tva,
      montantTTC:       montant_ttc,
      typeFacture:      'FAC',
      lignes: [{
        numeroLigne:    1,
        designation:    description || 'Prestation de service',
        quantite:       1,
        prixUnitaireHT: montant_ht,
        tauxTVA:        tva,
        montantHT:      montant_ht
      }]
    };
    if (numero_engagement) payload.numeroEngagement = numero_engagement;

    const chorusRes = await axios.post(
      `${CHORUS_API}/cpro/factures/v1/deposer`, payload, { headers: chorusHeaders(token) }
    );
    const chorus_id = chorusRes.data.identifiantFactureCPP || chorusRes.data.numeroFactureCPP;

    const { rows } = await pool.query(
      `INSERT INTO factures
        (numero, emetteur_siret, client_siret, client_nom, description, montant_ht, tva, montant_ttc, statut, chorus_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'EMISE',$9) RETURNING *`,
      [numero, emetteur_siret, client_siret, client_nom, description, montant_ht, tva, montant_ttc, chorus_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[POST /factures Chorus]', detail);
    res.status(502).json({ error: 'Erreur Chorus Pro', detail });
  }
});

app.patch('/factures/:id/statut', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM factures WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
    // IDOR fix: vérifier que la facture appartient à l'entreprise connectée
    if (rows[0].emetteur_siret !== req.user.siret) {
      return res.status(403).json({ error: 'Accès interdit à cette facture' });
    }
    if (!rows[0].chorus_id) return res.status(400).json({ error: 'Pas de chorus_id — facture non émise via Chorus' });

    const token = await getChorusToken();
    const chorusRes = await axios.get(
      `${CHORUS_API}/cpro/factures/v1/consulter/identifiant/${rows[0].chorus_id}`,
      { headers: chorusHeaders(token) }
    );
    const statut = chorusRes.data.statut || chorusRes.data.etatFacture;
    await pool.query('UPDATE factures SET statut = $1, updated_at = NOW() WHERE id = $2', [statut, req.params.id]);
    res.json({ ...rows[0], statut });
  } catch (err) {
    console.error('[PATCH /factures/:id/statut]', err.message);
    res.status(502).json({ error: 'Impossible de récupérer le statut Chorus Pro', detail: err.message });
  }
});

// ─── Statistiques ────────────────────────────────────────────────────────────

app.get('/stats/:siret', authenticate, async (req, res) => {
  try {
    // IDOR fix: un utilisateur ne peut consulter que ses propres stats
    if (req.params.siret !== req.user.siret) {
      return res.status(403).json({ error: 'Accès interdit à ces statistiques' });
    }
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_factures,
        COALESCE(SUM(montant_ttc), 0)                    AS ca_ttc,
        COALESCE(SUM(montant_ht), 0)                     AS ca_ht,
        COUNT(*) FILTER (WHERE statut = 'EMISE')         AS en_attente,
        COUNT(*) FILTER (WHERE statut = 'ACCEPTEE')      AS acceptees,
        COUNT(*) FILTER (WHERE statut = 'REJETEE')       AS rejetees,
        COALESCE(AVG(montant_ht), 0)                     AS panier_moyen_ht
      FROM factures WHERE emetteur_siret = $1
    `, [req.params.siret]);
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Login Admin ─────────────────────────────────────────────────────────────

// POST /auth/admin — authentification administrateur
// Body: { secret: "ADMIN_SECRET" }
app.post('/auth/admin', (req, res) => {
  const { secret } = req.body;
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Secret administrateur invalide' });
  }
  const token = generateToken({ role: 'admin', email: 'admin@factureasy.fr' });
  res.json({ token, role: 'admin' });
});

// ─── Routes Admin ─────────────────────────────────────────────────────────────

app.use('/admin', require('./routes/admin'));

// ─── Routes Finances ─────────────────────────────────────────────────────────

app.use('/finances', require('./routes/finances'));

// ─── Route SIRENE — autocomplétion entreprise ─────────────────────────────────

app.use('/sirene', require('./routes/sirene'));

// ─── Routes Avoirs — notes de crédit ─────────────────────────────────────────
// Montées sous /factures/:id/avoir via mergeParams

const avoirsRouter = require('./routes/avoirs');
app.use('/factures/:id/avoir', avoirsRouter);

// ─── Routes Relances ─────────────────────────────────────────────────────────

app.use('/relances', require('./routes/relances'));

// ─── Routes Factures Récurrentes ─────────────────────────────────────────────

app.use('/factures/recurrentes', require('./routes/recurrentes'));

// ─── Routes Catalogue produits/services ──────────────────────────────────────

app.use('/catalogue', require('./routes/catalogue'));

// ─── Routes Devis ─────────────────────────────────────────────────────────────

app.use('/devis', require('./routes/devis'));

app.use('/e-reporting', require('./routes/e-reporting'));
app.use('/journal',     require('./routes/journal'));
app.use('/rapports',    require('./routes/rapports'));
app.use('/crm',         require('./routes/crm'));

// ─── Routes Comptable (invitations + login read-only) ────────────────────────

const { router: comptableRouter, readOnly } = require('./routes/comptable');
app.use('/auth', comptableRouter);

// Appliquer readOnly sur les routes protégées pour le rôle comptable
// (les routes GET restent accessibles, les mutations sont bloquées)
app.use(['/factures', '/finances', '/stats'], readOnly);

// ─── Backoffice admin (fichier statique servi depuis /backoffice/) ─────────────
// Accessible à : https://factureasy-backend.onrender.com/backoffice/
// ⚠️  Les fichiers admin sont dans backend/public/backoffice/ (dans le build context Docker)
app.use('/backoffice', express.static(path.join(__dirname, 'public/backoffice')));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// --- Lancement ---

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, function() { console.log('[OK] FacturEasy API demarree sur :' + PORT); });
}

module.exports = app;
