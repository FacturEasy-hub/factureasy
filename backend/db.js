/**
 * FacturEasy — Pool de connexion PostgreSQL partagé
 * Utilise DATABASE_URL depuis les variables d'environnement.
 * Importez ce module dans toutes les routes : const pool = require('../db');
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL requis en production (Heroku, Render, Railway, etc.)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur client inactif :', err.message);
});

module.exports = pool;
