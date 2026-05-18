const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'factureasy-dev-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// ─── Génération de token ──────────────────────────────────────────────────────

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// ─── Middleware de vérification ───────────────────────────────────────────────

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou mal formé' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré — reconnectez-vous' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// ─── Middleware optionnel (n'échoue pas si pas de token) ─────────────────────

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch (_) { req.user = null; }
  }
  next();
}

// ─── Vérification que le user accède bien à ses propres données ───────────────

function ownResource(siretField = 'siret') {
  return (req, res, next) => {
    const siret = req.params[siretField] || req.query[siretField] || req.body[siretField];
    if (req.user && siret && req.user.siret !== siret) {
      return res.status(403).json({ error: 'Accès interdit à cette ressource' });
    }
    next();
  };
}

module.exports = { generateToken, authenticate, optionalAuth, ownResource, requireAdmin };
