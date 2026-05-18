import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Données mock ────────────────────────────────────────────────────────────
const MOCK_COMPANY = {
  siret: '12345678901234',
  nom: 'Tech Solutions SARL',
  email: 'contact@techsolutions.fr',
  telephone: '01 23 45 67 89',
  adresse: '12 rue de la Paix, 75001 Paris',
};

const MOCK_FACTURES = [
  { id: 1, numero: 'FA-2024-001', client: 'Acme Corp', siretClient: '98765432100012', date: '2024-11-01', montantHT: 2500, tva: 500, ttc: 3000, statut: 'ACCEPTEE', numeroEngagement: 'ENG-001' },
  { id: 2, numero: 'FA-2024-002', client: 'Beta SAS', siretClient: '11223344556677', date: '2024-11-10', montantHT: 1800, tva: 360, ttc: 2160, statut: 'EN_COURS', numeroEngagement: 'ENG-002' },
  { id: 3, numero: 'FA-2024-003', client: 'Gamma SA', siretClient: '55667788990011', date: '2024-11-15', montantHT: 4200, tva: 840, ttc: 5040, statut: 'EMISE', numeroEngagement: '' },
  { id: 4, numero: 'FA-2024-004', client: 'Delta EURL', siretClient: '33445566778899', date: '2024-10-20', montantHT: 900, tva: 180, ttc: 1080, statut: 'REJETEE', numeroEngagement: 'ENG-004' },
  { id: 5, numero: 'FA-2024-005', client: 'Epsilon Ltd', siretClient: '44556677889900', date: '2024-10-05', montantHT: 3100, tva: 620, ttc: 3720, statut: 'ACCEPTEE', numeroEngagement: 'ENG-005' },
];

const MOCK_REVENUS = [
  { id: 1, date: '2024-11-01', source: 'Facture', client: 'Acme Corp', montantHT: 2500, tva: 500, ttc: 3000, statut: 'ENCAISSE' },
  { id: 2, date: '2024-10-05', source: 'Facture', client: 'Epsilon Ltd', montantHT: 3100, tva: 620, ttc: 3720, statut: 'ENCAISSE' },
  { id: 3, date: '2024-09-15', source: 'Manuel', client: 'Zeta Corp', montantHT: 1500, tva: 300, ttc: 1800, statut: 'ENCAISSE' },
  { id: 4, date: '2024-11-10', source: 'Facture', client: 'Beta SAS', montantHT: 1800, tva: 360, ttc: 2160, statut: 'EN_ATTENTE' },
  { id: 5, date: '2024-11-15', source: 'Facture', client: 'Gamma SA', montantHT: 4200, tva: 840, ttc: 5040, statut: 'EN_ATTENTE' },
];

const MOCK_DEPENSES = [
  { id: 1, date: '2024-11-02', libelle: 'Abonnement OVH', categorie: 'Hébergement', montantHT: 83.33, tva: 16.67, ttc: 100, justificatif: '' },
  { id: 2, date: '2024-11-05', libelle: 'Fournitures bureau', categorie: 'Fournitures', montantHT: 166.67, tva: 33.33, ttc: 200, justificatif: '' },
  { id: 3, date: '2024-11-08', libelle: 'Déplacement Paris-Lyon', categorie: 'Transport', montantHT: 145.83, tva: 0, ttc: 145.83, justificatif: '' },
  { id: 4, date: '2024-10-15', libelle: 'Logiciel comptabilité', categorie: 'Logiciels', montantHT: 250, tva: 50, ttc: 300, justificatif: '' },
  { id: 5, date: '2024-10-20', libelle: 'Repas client', categorie: 'Restaurant', montantHT: 85.42, tva: 5.08, ttc: 90.50, justificatif: '' },
];

const MOCK_TVA_HISTORY = [
  { periode: 'Octobre 2024', collectee: 1400, deductible: 320, montant: 1080, statut: 'DECLAREE' },
  { periode: 'Septembre 2024', collectee: 980, deductible: 210, montant: 770, statut: 'DECLAREE' },
  { periode: 'Août 2024', collectee: 1650, deductible: 380, montant: 1270, statut: 'DECLAREE' },
  { periode: 'Juillet 2024', collectee: 720, deductible: 155, montant: 565, statut: 'DECLAREE' },
];

const MOCK_GRAPH_DATA = [
  { mois: 'Juin', ca: 4200, depenses: 800 },
  { mois: 'Juil', ca: 3100, depenses: 620 },
  { mois: 'Août', ca: 5500, depenses: 950 },
  { mois: 'Sept', ca: 2900, depenses: 540 },
  { mois: 'Oct', ca: 6200, depenses: 1100 },
  { mois: 'Nov', ca: 4800, depenses: 836 },
];

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');
const initiales = (nom) =>
  nom
    ? nom
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

function apiCall(path, options = {}) {
  const token = localStorage.getItem('fe_token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

// ─── Styles globaux ───────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      input, select, textarea { font-family: inherit; }
      button { cursor: pointer; font-family: inherit; }
      table { border-collapse: collapse; width: 100%; }
      th, td { text-align: left; }
      .fade-in { animation: fadeIn 0.25s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .bar-ca { background: #4f46e5; border-radius: 3px 3px 0 0; transition: height 0.5s ease; }
      .bar-dep { background: #f59e0b; border-radius: 3px 3px 0 0; transition: height 0.5s ease; }
      .progress-fill { border-radius: 4px; height: 100%; transition: width 0.6s ease; }
      .nav-btn:hover { background: #252840 !important; color: #e2e8f0 !important; }
    `}</style>
  );
}

// ─── Composants UI réutilisables ──────────────────────────────────────────────
function Badge({ statut }) {
  const map = {
    EMISE: { bg: '#dbeafe', color: '#1d4ed8', label: 'Émise' },
    EN_COURS: { bg: '#fef3c7', color: '#b45309', label: 'En cours' },
    ACCEPTEE: { bg: '#d1fae5', color: '#065f46', label: 'Acceptée' },
    REJETEE: { bg: '#fee2e2', color: '#991b1b', label: 'Rejetée' },
    ENCAISSE: { bg: '#d1fae5', color: '#065f46', label: 'Encaissé' },
    EN_ATTENTE: { bg: '#fef3c7', color: '#b45309', label: 'En attente' },
    DECLAREE: { bg: '#dbeafe', color: '#1d4ed8', label: 'Déclarée' },
  };
  const s = map[statut] || { bg: '#f1f5f9', color: '#64748b', label: statut };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

function KpiCard({ icon, label, value, variation, color }) {
  const isPositive = variation >= 0;
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          style={{
            fontSize: 22,
            background: color + '18',
            borderRadius: 8,
            padding: '6px 8px',
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{value}</div>
      {variation !== undefined && (
        <div
          style={{
            fontSize: 12,
            color: isPositive ? '#10b981' : '#ef4444',
            fontWeight: 500,
          }}
        >
          {isPositive ? '▲' : '▼'} {Math.abs(variation)}% vs mois préc.
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fade-in"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: '#94a3b8',
              lineHeight: 1,
              padding: 4,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
};

function Btn({ children, onClick, variant = 'primary', style: s = {}, disabled = false }) {
  const base = {
    padding: '9px 18px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    transition: 'opacity 0.15s',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    ...s,
  };
  const variants = {
    primary: { background: '#4f46e5', color: '#fff' },
    ghost: { background: '#f1f5f9', color: '#374151' },
    danger: { background: '#fee2e2', color: '#991b1b' },
    success: { background: '#d1fae5', color: '#065f46' },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [siret, setSiret] = useState('');
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (siret.length !== 14 || !/^\d{14}$/.test(siret)) {
      setError('Le SIRET doit contenir exactement 14 chiffres.');
      return;
    }
    if (!nom.trim()) {
      setError("Le nom de l'entreprise est requis.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ siret, nom }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('fe_token', data.token);
        localStorage.setItem('fe_company', JSON.stringify(data.entreprise || { siret, nom }));
        onLogin(data.entreprise || { siret, nom });
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || 'Connexion refusée. Vérifiez votre SIRET.');
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion.');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1d2e 0%, #252840 50%, #4f46e5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="fade-in"
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>💼</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.5px' }}>
            FacturEasy
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            Gestion de trésorerie &amp; facturation électronique
            <br />
            pour PME françaises
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <Field label="SIRET (14 chiffres)">
            <input
              style={inputStyle}
              type="text"
              placeholder="12345678901234"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
              maxLength={14}
              required
            />
          </Field>
          <Field label="Nom de l'entreprise">
            <input
              style={inputStyle}
              type="text"
              placeholder="Tech Solutions SARL"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </Field>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 8,
            }}
          >
            {loading ? 'Connexion…' : 'Accéder à mon espace →'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24 }}>
          Vos données sont protégées · Conforme RGPD
        </p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'factures', label: 'Factures', icon: '🧾' },
  { key: 'recurrentes', label: 'Récurrentes', icon: '🔁' },
  { key: 'revenus', label: 'Revenus', icon: '💰' },
  { key: 'depenses', label: 'Dépenses', icon: '💸' },
  { key: 'tva', label: 'TVA', icon: '📋' },
  { key: 'parametres', label: 'Paramètres', icon: '⚙️' },
];

function Sidebar({ active, onNav, company }) {
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#1a1d2e',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid #252840' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
          💼 FacturEasy
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Espace pro</div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              className={isActive ? '' : 'nav-btn'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                marginBottom: 3,
                cursor: 'pointer',
                textAlign: 'left',
                background: isActive ? '#4f46e5' : 'transparent',
                color: isActive ? '#fff' : '#9ca3af',
                fontWeight: isActive ? 700 : 400,
                fontSize: 14,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer user */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #252840',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {initiales(company?.nom || '')}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              color: '#e2e8f0',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {company?.nom || 'Mon entreprise'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 11 }}>
            {company?.siret ? company.siret.slice(0, 9) + '…' : ''}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: "Vue d'ensemble de votre activité", cta: null },
  factures: {
    title: 'Factures',
    subtitle: 'Gestion des factures électroniques',
    cta: '+ Nouvelle facture',
  },
  recurrentes: {
    title: 'Factures récurrentes',
    subtitle: 'Modèles et planification automatique',
    cta: '+ Nouveau modèle',
  },
  revenus: { title: 'Revenus', subtitle: 'Suivi de vos encaissements', cta: '+ Revenu manuel' },
  depenses: { title: 'Dépenses', subtitle: 'Gestion de vos charges', cta: '+ Nouvelle dépense' },
  tva: { title: 'TVA', subtitle: 'Déclarations et suivi de la TVA', cta: null },
  parametres: { title: 'Paramètres', subtitle: 'Configuration de votre compte', cta: null },
};

function Topbar({ page, onCta }) {
  const meta = PAGE_META[page] || PAGE_META.dashboard;
  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #e8ecf0',
        padding: '18px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{meta.title}</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{meta.subtitle}</p>
      </div>
      {meta.cta && <Btn onClick={onCta}>{meta.cta}</Btn>}
    </div>
  );
}

// ─── Section Dashboard ────────────────────────────────────────────────────────
function SectionDashboard({ factures, depenses, onNav }) {
  const caEncaisse = factures
    .filter((f) => f.statut === 'ACCEPTEE')
    .reduce((s, f) => s + f.ttc, 0);
  const totalDep = depenses.reduce((s, d) => s + d.ttc, 0);
  const resultatNet = caEncaisse - totalDep;
  const tvaReverse =
    factures.filter((f) => f.statut === 'ACCEPTEE').reduce((s, f) => s + f.tva, 0) -
    depenses.reduce((s, d) => s + d.tva, 0);

  const maxVal = Math.max(...MOCK_GRAPH_DATA.map((d) => d.ca));

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard icon="💰" label="CA Encaissé" value={fmt(caEncaisse)} variation={12.4} color="#4f46e5" />
        <KpiCard icon="💸" label="Dépenses" value={fmt(totalDep)} variation={-3.1} color="#f59e0b" />
        <KpiCard icon="📈" label="Résultat Net" value={fmt(resultatNet)} variation={18.7} color="#10b981" />
        <KpiCard icon="📋" label="TVA à reverser" value={fmt(tvaReverse)} color="#ef4444" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 24,
          marginBottom: 28,
        }}
      >
        {/* Graphique barres */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Évolution 6 mois</h2>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: '#4f46e5',
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                CA
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: '#f59e0b',
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                Dépenses
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160 }}>
            {MOCK_GRAPH_DATA.map((d) => (
              <div
                key={d.mois}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 3,
                    alignItems: 'flex-end',
                    height: '100%',
                  }}
                >
                  <div
                    className="bar-ca"
                    style={{ width: 14, height: `${(d.ca / maxVal) * 100}%` }}
                    title={fmt(d.ca)}
                  />
                  <div
                    className="bar-dep"
                    style={{ width: 14, height: `${(d.depenses / maxVal) * 100}%` }}
                    title={fmt(d.depenses)}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{d.mois}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions rapides */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Actions rapides</h2>
          {[
            { icon: '🧾', label: 'Nouvelle facture', desc: 'Créer et envoyer', nav: 'factures', color: '#4f46e5' },
            { icon: '💸', label: 'Ajouter dépense', desc: 'Saisir une charge', nav: 'depenses', color: '#f59e0b' },
            { icon: '📋', label: 'Télécharger CA3', desc: 'Export TVA', nav: 'tva', color: '#10b981' },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNav(a.nav)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                border: '1.5px solid #e8ecf0',
                background: '#fafafa',
                marginBottom: 10,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = a.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e8ecf0')}
            >
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dernières factures */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Dernières factures</h2>
        <table>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
              {['Numéro', 'Client', 'Date', 'TTC', 'Statut'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factures.slice(0, 5).map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
                  {f.numero}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{f.client}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>
                  {fmtDate(f.date)}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{fmt(f.ttc)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge statut={f.statut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section Factures ─────────────────────────────────────────────────────────
const TVA_RATES = [
  { label: '20%', value: 20 },
  { label: '10%', value: 10 },
  { label: '5.5%', value: 5.5 },
  { label: '2.1%', value: 2.1 },
  { label: '0%', value: 0 },
];

function ModalNouvelleFacture({ onClose, onSave }) {
  const [form, setForm] = useState({
    siretClient: '',
    client: '',
    description: '',
    montantHT: '',
    tauxTVA: 20,
    numeroEngagement: '',
  });
  const [sireneLoading, setSireneLoading] = useState(false);
  const [sireneHint, setSireneHint] = useState('');

  const montantHT = parseFloat(form.montantHT) || 0;
  const tva = montantHT * Number(form.tauxTVA) / 100;
  const ttc = montantHT + tva;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const lookupSirene = async () => {
    if (form.siretClient.length !== 14) return;
    setSireneLoading(true);
    setSireneHint('');
    try {
      const res = await apiCall(`/sirene/${form.siretClient}`);
      if (res.ok) {
        const data = await res.json();
        const nomEntreprise = data.nom || '';
        if (nomEntreprise) {
          setForm((f) => ({ ...f, client: nomEntreprise }));
          setSireneHint(`✓ ${nomEntreprise}${data.ville ? ' — ' + data.ville : ''}`);
        } else {
          setSireneHint('SIRET trouvé mais nom indisponible');
        }
      } else {
        setSireneHint('SIRET introuvable dans SIRENE');
      }
    } catch {
      setSireneHint('Impossible de vérifier le SIRET (hors ligne)');
    }
    setSireneLoading(false);
  };

  const handleSave = () => {
    if (!form.client || !form.montantHT) return;
    onSave({ ...form, montantHT, tva, ttc, tauxTVA: Number(form.tauxTVA) });
    onClose();
  };

  return (
    <Modal title="Nouvelle Facture" onClose={onClose}>
      <Field label="SIRET client">
        <div style={{ position: 'relative' }}>
          <input
            style={inputStyle}
            placeholder="98765432100012"
            value={form.siretClient}
            onChange={(e) => {
              setSireneHint('');
              set('siretClient')(e);
            }}
            onBlur={lookupSirene}
            maxLength={14}
          />
          {sireneLoading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#64748b' }}>
              ⏳
            </span>
          )}
        </div>
        {sireneHint && (
          <div style={{ fontSize: 12, marginTop: 4, color: sireneHint.startsWith('✓') ? '#065f46' : '#b45309' }}>
            {sireneHint}
          </div>
        )}
      </Field>
      <Field label="Nom client *">
        <input style={inputStyle} placeholder="Acme Corp" value={form.client} onChange={set('client')} />
      </Field>
      <Field label="Description">
        <input
          style={inputStyle}
          placeholder="Prestation de développement web"
          value={form.description}
          onChange={set('description')}
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Montant HT (€) *">
          <input
            style={inputStyle}
            type="number"
            placeholder="1000"
            value={form.montantHT}
            onChange={set('montantHT')}
          />
        </Field>
        <Field label="Taux TVA">
          <select style={inputStyle} value={form.tauxTVA} onChange={set('tauxTVA')}>
            {TVA_RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Numéro d'engagement">
        <input
          style={inputStyle}
          placeholder="ENG-001 (optionnel)"
          value={form.numeroEngagement}
          onChange={set('numeroEngagement')}
        />
      </Field>
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}
      >
        {[
          ['HT', fmt(montantHT)],
          ['TVA', fmt(tva)],
          ['TTC', fmt(ttc)],
        ].map(([l, v]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{l}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: l === 'TTC' ? '#4f46e5' : '#0f172a',
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>
          Annuler
        </Btn>
        <Btn onClick={handleSave} disabled={!form.client || !form.montantHT}>
          Créer la facture
        </Btn>
      </div>
    </Modal>
  );
}

// ─── Modal Avoir ──────────────────────────────────────────────────────────────
function ModalAvoir({ facture, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    apiCall(`/factures/${facture.id}/avoir`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setExisting(d); })
      .catch(() => {});
  }, [facture.id]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/factures/${facture.id}/avoir`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg(`✓ Avoir ${data.numero || ''} créé avec succès`);
        setExisting(data);
        if (onCreated) onCreated(data);
      } else {
        setMsg(data.error || 'Erreur lors de la création de l\'avoir');
      }
    } catch {
      setMsg('Erreur réseau');
    }
    setLoading(false);
  };

  return (
    <Modal title={`Avoir — ${facture.numero}`} onClose={onClose}>
      <div style={{ marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Facture originale</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{facture.client}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {fmt(facture.montantHT)} HT · {fmt(facture.ttc)} TTC
        </div>
      </div>
      {existing ? (
        <div style={{ background: '#d1fae5', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
            Avoir existant : {existing.numero}
          </div>
          <div style={{ fontSize: 13, color: '#047857' }}>
            Montant : {fmt(Math.abs(existing.montantHT || 0))} HT · {fmt(Math.abs(existing.ttc || 0))} TTC
          </div>
        </div>
      ) : (
        <div style={{ background: '#fef3c7', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          Aucun avoir existant pour cette facture. La création d'un avoir annule intégralement la facture originale (montants inversés).
        </div>
      )}
      {msg && (
        <div style={{ background: msg.startsWith('✓') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✓') ? '#065f46' : '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Fermer</Btn>
        {!existing && (
          <Btn onClick={handleCreate} disabled={loading} variant="danger">
            {loading ? 'Création…' : '➖ Créer l\'avoir'}
          </Btn>
        )}
      </div>
    </Modal>
  );
}

// ─── Modal Relance ────────────────────────────────────────────────────────────
function ModalRelance({ facture, onClose }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleRelance = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/relances/${facture.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg('✓ Email de relance envoyé au client');
      } else {
        setMsg(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setMsg('Erreur réseau');
    }
    setLoading(false);
  };

  return (
    <Modal title={`Relancer — ${facture.numero}`} onClose={onClose}>
      <div style={{ marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{facture.client}</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {fmt(facture.ttc)} TTC · Émise le {fmtDate(facture.date)}
        </div>
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
        Un email de relance sera envoyé automatiquement au contact enregistré pour ce client, lui rappelant la facture en attente de règlement.
      </div>
      {msg && (
        <div style={{ background: msg.startsWith('✓') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✓') ? '#065f46' : '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Fermer</Btn>
        {!msg.startsWith('✓') && (
          <Btn onClick={handleRelance} disabled={loading}>
            {loading ? 'Envoi…' : '📧 Envoyer la relance'}
          </Btn>
        )}
      </div>
    </Modal>
  );
}

function SectionFactures({ factures, setFactures, showModal, setShowModal }) {
  const [tab, setTab] = useState('TOUTES');
  const [avoirFacture, setAvoirFacture] = useState(null);
  const [relanceFacture, setRelanceFacture] = useState(null);
  const tabs = ['TOUTES', 'EMISE', 'EN_COURS', 'ACCEPTEE', 'REJETEE'];
  const filtered = tab === 'TOUTES' ? factures : factures.filter((f) => f.statut === tab);

  const refreshStatut = useCallback(
    async (id) => {
      try {
        const res = await apiCall(`/factures/${id}/statut`, { method: 'PATCH' });
        if (res.ok) {
          const data = await res.json();
          setFactures((fs) => fs.map((f) => (f.id === id ? { ...f, statut: data.statut } : f)));
          return;
        }
      } catch {}
      // Mock: cycle de statut
      const statuts = ['EMISE', 'EN_COURS', 'ACCEPTEE'];
      setFactures((fs) =>
        fs.map((f) =>
          f.id === id ? { ...f, statut: statuts[Math.floor(Math.random() * statuts.length)] } : f
        )
      );
    },
    [setFactures]
  );

  const handleSave = useCallback(
    async (form) => {
      const nextId = (factures.length > 0 ? Math.max(...factures.map((f) => f.id)) : 0) + 1;
      const nextNum = `FA-${new Date().getFullYear()}-${String(nextId).padStart(4, '0')}`;
      const newFact = {
        ...form,
        id: nextId,
        numero: nextNum,
        date: new Date().toISOString().slice(0, 10),
        statut: 'EMISE',
      };
      try {
        const res = await apiCall('/factures', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const data = await res.json();
          setFactures((fs) => [data, ...fs]);
          return;
        }
      } catch {}
      setFactures((fs) => [newFact, ...fs]);
    },
    [factures, setFactures]
  );

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {showModal && (
        <ModalNouvelleFacture onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {avoirFacture && (
        <ModalAvoir
          facture={avoirFacture}
          onClose={() => setAvoirFacture(null)}
          onCreated={() => setAvoirFacture(null)}
        />
      )}
      {relanceFacture && (
        <ModalRelance
          facture={relanceFacture}
          onClose={() => setRelanceFacture(null)}
        />
      )}
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          background: '#f1f5f9',
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: tab === t ? 700 : 400,
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'TOUTES' ? 'Toutes' : <Badge statut={t} />}
          </button>
        ))}
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          overflow: 'auto',
        }}
      >
        <table style={{ minWidth: 860 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e8ecf0' }}>
              {['Numéro', 'Client', 'Date', 'Montant HT', 'TVA', 'TTC', 'Statut', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: '11px 14px',
                      fontSize: 12,
                      color: '#64748b',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 14,
                  }}
                >
                  Aucune facture dans cette catégorie
                </td>
              </tr>
            )}
            {filtered.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
                  {f.numero}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{f.client}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                  {fmtDate(f.date)}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{fmt(f.montantHT)}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>{fmt(f.tva)}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{fmt(f.ttc)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <Badge statut={f.statut} />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                    <Btn
                      variant="ghost"
                      onClick={() => refreshStatut(f.id)}
                      style={{ padding: '5px 8px', fontSize: 11 }}
                    >
                      🔄
                    </Btn>
                    {['EMISE', 'EN_COURS'].includes(f.statut) && (
                      <Btn
                        variant="ghost"
                        onClick={() => setRelanceFacture(f)}
                        style={{ padding: '5px 8px', fontSize: 11 }}
                        title="Envoyer une relance"
                      >
                        📧
                      </Btn>
                    )}
                    {f.statut === 'ACCEPTEE' && (
                      <Btn
                        variant="ghost"
                        onClick={() => setAvoirFacture(f)}
                        style={{ padding: '5px 8px', fontSize: 11 }}
                        title="Créer un avoir"
                      >
                        ➖ Avoir
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section Revenus ──────────────────────────────────────────────────────────
function ModalRevenuManuel({ onClose, onSave }) {
  const [form, setForm] = useState({
    libelle: '',
    client: '',
    ttc: '',
    tauxTVA: 20,
    date: new Date().toISOString().slice(0, 10),
  });
  const ttcVal = parseFloat(form.ttc) || 0;
  const tva = (ttcVal * Number(form.tauxTVA)) / (100 + Number(form.tauxTVA));
  const ht = ttcVal - tva;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal title="Revenu manuel" onClose={onClose}>
      <Field label="Libellé *">
        <input
          style={inputStyle}
          placeholder="Consultance décembre"
          value={form.libelle}
          onChange={set('libelle')}
        />
      </Field>
      <Field label="Client">
        <input
          style={inputStyle}
          placeholder="Nom du client"
          value={form.client}
          onChange={set('client')}
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Montant TTC (€)">
          <input
            style={inputStyle}
            type="number"
            placeholder="1200"
            value={form.ttc}
            onChange={set('ttc')}
          />
        </Field>
        <Field label="Taux TVA">
          <select style={inputStyle} value={form.tauxTVA} onChange={set('tauxTVA')}>
            {TVA_RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input style={inputStyle} type="date" value={form.date} onChange={set('date')} />
        </Field>
      </div>
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: '#64748b',
        }}
      >
        HT: <strong>{fmt(ht)}</strong> · TVA: <strong>{fmt(tva)}</strong>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>
          Annuler
        </Btn>
        <Btn
          onClick={() => {
            onSave({ ...form, montantHT: ht, tva, ttc: ttcVal });
            onClose();
          }}
          disabled={!form.libelle || !form.ttc}
        >
          Enregistrer
        </Btn>
      </div>
    </Modal>
  );
}

function SectionRevenus({ revenus, setRevenus, showModal, setShowModal }) {
  const encaisses = revenus.filter((r) => r.statut === 'ENCAISSE');
  const enAttente = revenus.filter((r) => r.statut === 'EN_ATTENTE');
  const totalEncaisse = encaisses.reduce((s, r) => s + r.ttc, 0);
  const totalAttente = enAttente.reduce((s, r) => s + r.ttc, 0);
  const panier = encaisses.length ? totalEncaisse / encaisses.length : 0;

  const handleSave = (form) => {
    const nextId = (revenus.length > 0 ? Math.max(...revenus.map((r) => r.id)) : 0) + 1;
    setRevenus((rs) => [{ ...form, id: nextId, source: 'Manuel', statut: 'ENCAISSE' }, ...rs]);
  };

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {showModal && <ModalRevenuManuel onClose={() => setShowModal(false)} onSave={handleSave} />}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard icon="💰" label="Total encaissé" value={fmt(totalEncaisse)} variation={8.2} color="#10b981" />
        <KpiCard icon="⏳" label="En attente" value={fmt(totalAttente)} color="#f59e0b" />
        <KpiCard icon="🧾" label="Nb revenus" value={encaisses.length} variation={2} color="#4f46e5" />
        <KpiCard icon="📊" label="Panier moyen" value={fmt(panier)} color="#6366f1" />
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          overflow: 'auto',
        }}
      >
        <table style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e8ecf0' }}>
              {['Date', 'Source', 'Client', 'Montant HT', 'TVA', 'TTC', 'Statut'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '11px 14px', fontSize: 12, color: '#64748b', fontWeight: 600 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revenus.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                  {fmtDate(r.date)}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{r.source}</td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{r.client}</td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{fmt(r.montantHT)}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>{fmt(r.tva)}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{fmt(r.ttc)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <Badge statut={r.statut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section Dépenses ─────────────────────────────────────────────────────────
const CATEGORIES = [
  'Hébergement',
  'Fournitures',
  'Transport',
  'Logiciels',
  'Restaurant',
  'Marketing',
  'RH',
  'Autre',
];
const CAT_ICONS = {
  Hébergement: '🖥️',
  Fournitures: '📎',
  Transport: '🚆',
  Logiciels: '💻',
  Restaurant: '🍽️',
  Marketing: '📣',
  RH: '👥',
  Autre: '📦',
};

function ModalNouvelleDepense({ onClose, onSave }) {
  const [form, setForm] = useState({
    libelle: '',
    categorie: 'Autre',
    ttc: '',
    tauxTVA: 20,
    date: new Date().toISOString().slice(0, 10),
    justificatif: '',
  });
  const ttcVal = parseFloat(form.ttc) || 0;
  const tva = (ttcVal * Number(form.tauxTVA)) / (100 + Number(form.tauxTVA));
  const ht = ttcVal - tva;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal title="Nouvelle Dépense" onClose={onClose}>
      <Field label="Libellé *">
        <input
          style={inputStyle}
          placeholder="Abonnement logiciel"
          value={form.libelle}
          onChange={set('libelle')}
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Catégorie">
          <select style={inputStyle} value={form.categorie} onChange={set('categorie')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input style={inputStyle} type="date" value={form.date} onChange={set('date')} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Montant TTC (€) *">
          <input
            style={inputStyle}
            type="number"
            placeholder="120"
            value={form.ttc}
            onChange={set('ttc')}
          />
        </Field>
        <Field label="Taux TVA">
          <select style={inputStyle} value={form.tauxTVA} onChange={set('tauxTVA')}>
            {TVA_RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="URL Justificatif">
        <input
          style={inputStyle}
          placeholder="https://…"
          value={form.justificatif}
          onChange={set('justificatif')}
        />
      </Field>
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: '#64748b',
        }}
      >
        HT: <strong>{fmt(ht)}</strong> · TVA déductible: <strong>{fmt(tva)}</strong>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>
          Annuler
        </Btn>
        <Btn
          onClick={() => {
            onSave({ ...form, montantHT: ht, tva, ttc: ttcVal });
            onClose();
          }}
          disabled={!form.libelle || !form.ttc}
        >
          Enregistrer
        </Btn>
      </div>
    </Modal>
  );
}

function SectionDepenses({ depenses, setDepenses, showModal, setShowModal }) {
  const total = depenses.reduce((s, d) => s + d.ttc, 0);
  const tvaDed = depenses.reduce((s, d) => s + d.tva, 0);
  const moy = depenses.length ? total / depenses.length : 0;

  const byCat = CATEGORIES.map((c) => {
    const items = depenses.filter((d) => d.categorie === c);
    const montant = items.reduce((s, d) => s + d.ttc, 0);
    return { cat: c, montant, pct: total ? (montant / total) * 100 : 0 };
  })
    .filter((c) => c.montant > 0)
    .sort((a, b) => b.montant - a.montant);

  const handleSave = (form) => {
    const nextId = depenses.length > 0 ? Math.max(...depenses.map((d) => d.id)) + 1 : 1;
    setDepenses((ds) => [{ ...form, id: nextId }, ...ds]);
  };

  const handleDelete = (id) => {
    setDepenses((ds) => ds.filter((d) => d.id !== id));
  };

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {showModal && (
        <ModalNouvelleDepense onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard icon="💸" label="Total dépenses" value={fmt(total)} variation={-5.3} color="#ef4444" />
        <KpiCard icon="📋" label="TVA déductible" value={fmt(tvaDed)} color="#4f46e5" />
        <KpiCard icon="🗂️" label="Nb dépenses" value={depenses.length} color="#f59e0b" />
        <KpiCard icon="📊" label="Charge moyenne" value={fmt(moy)} color="#6366f1" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
        {/* Répartition catégories */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            alignSelf: 'start',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Par catégorie</h2>
          {byCat.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Aucune dépense enregistrée</p>
          )}
          {byCat.map((c) => (
            <div key={c.cat} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{CAT_ICONS[c.cat] || '📦'}</span>
                  {c.cat}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {fmt(c.montant)}
                </span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6 }}>
                <div className="progress-fill" style={{ width: `${c.pct}%`, background: '#ef4444' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Table dépenses */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            overflow: 'auto',
          }}
        >
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e8ecf0' }}>
                {['Date', 'Libellé', 'Catégorie', 'Montant HT', 'TVA', 'TTC', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{ padding: '11px 14px', fontSize: 12, color: '#64748b', fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                    {fmtDate(d.date)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{d.libelle}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12 }}>
                    <span
                      style={{
                        background: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: '#374151',
                      }}
                    >
                      {d.categorie}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{fmt(d.montantHT)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                    {fmt(d.tva)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{fmt(d.ttc)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        color: '#ef4444',
                        padding: '2px 6px',
                        borderRadius: 6,
                      }}
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Section TVA ──────────────────────────────────────────────────────────────
const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function SectionTVA({ factures, depenses, company }) {
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [ca3Loading, setCa3Loading] = useState(false);
  const [ca3Msg, setCa3Msg] = useState('');

  const exportCA3 = async () => {
    if (!company?.siret) { setCa3Msg('SIRET introuvable'); return; }
    setCa3Loading(true);
    setCa3Msg('');
    const moisStr = `${annee}-${String(mois).padStart(2, '0')}`;
    try {
      const res = await apiCall(`/finances/ca3/${company.siret}?mois=${moisStr}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CA3_${moisStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setCa3Msg('✓ Fichier CA3 téléchargé');
      } else {
        const err = await res.json().catch(() => ({}));
        setCa3Msg(err.error || 'Erreur lors de l\'export');
      }
    } catch {
      setCa3Msg('Erreur réseau');
    }
    setCa3Loading(false);
  };

  // Filtrage par période sélectionnée
  const tvaCollectee = factures
    .filter((f) => {
      if (f.statut !== 'ACCEPTEE') return false;
      const d = new Date(f.date_emission || f.date);
      return d.getFullYear() === annee && d.getMonth() + 1 === mois;
    })
    .reduce((s, f) => s + (f.tva || (f.montant_ttc - f.montant_ht) || 0), 0);
  const tvaDeductible = depenses
    .filter((d) => {
      const date = new Date(d.date_depense || d.date);
      return date.getFullYear() === annee && date.getMonth() + 1 === mois;
    })
    .reduce((s, d) => s + (d.tva || (d.montant_ttc - d.montant_ht) || 0), 0);
  const tvaReverse = tvaCollectee - tvaDeductible;

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {/* Sélecteur période */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
        <select
          style={{ ...inputStyle, width: 140 }}
          value={mois}
          onChange={(e) => setMois(Number(e.target.value))}
        >
          {MOIS_LABELS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, width: 100 }}
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
        >
          {[2022, 2023, 2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <Btn
          onClick={exportCA3}
          disabled={ca3Loading}
          style={{ background: '#10b981', color: '#fff' }}
        >
          {ca3Loading ? '⏳ Export…' : '📥 Exporter CA3'}
        </Btn>
        {ca3Msg && (
          <span style={{ fontSize: 13, color: ca3Msg.startsWith('✓') ? '#065f46' : '#991b1b', fontWeight: 600 }}>
            {ca3Msg}
          </span>
        )}
      </div>

      {/* 3 grandes cards TVA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: 'TVA Collectée',
            value: tvaCollectee,
            color: '#10b981',
            bg: '#d1fae5',
            icon: '📈',
            desc: 'Sur factures acceptées',
          },
          {
            label: 'TVA Déductible',
            value: tvaDeductible,
            color: '#4f46e5',
            bg: '#e0e7ff',
            icon: '📉',
            desc: 'Sur vos dépenses',
          },
          {
            label: 'TVA à Reverser',
            value: tvaReverse,
            color: tvaReverse > 0 ? '#ef4444' : '#10b981',
            bg: tvaReverse > 0 ? '#fee2e2' : '#d1fae5',
            icon: '💳',
            desc:
              tvaReverse > 0
                ? "À déclarer à l'administration"
                : 'Crédit TVA',
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: c.bg,
              borderRadius: 16,
              padding: '28px 24px',
              border: `2px solid ${c.color}30`,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
            <div style={{ fontSize: 13, color: c.color, fontWeight: 600, marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: c.color }}>{fmt(c.value)}</div>
            <div style={{ fontSize: 12, color: c.color + 'aa', marginTop: 8 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Formule visuelle */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px 28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, color: '#10b981', fontSize: 20 }}>{fmt(tvaCollectee)}</span>
        <span style={{ color: '#94a3b8', fontSize: 22 }}>−</span>
        <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 20 }}>{fmt(tvaDeductible)}</span>
        <span style={{ color: '#94a3b8', fontSize: 22 }}>=</span>
        <span
          style={{
            fontWeight: 800,
            color: tvaReverse > 0 ? '#ef4444' : '#10b981',
            fontSize: 22,
          }}
        >
          {fmt(tvaReverse)}
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          TVA collectée − TVA déductible = TVA à reverser
        </span>
      </div>

      {/* Historique déclarations */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Historique des déclarations
        </div>
        <table>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e8ecf0' }}>
              {['Période', 'TVA Collectée', 'TVA Déductible', 'Montant', 'Statut'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '11px 16px', fontSize: 12, color: '#64748b', fontWeight: 600 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_TVA_HISTORY.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{row.periode}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#10b981' }}>
                  {fmt(row.collectee)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#4f46e5' }}>
                  {fmt(row.deductible)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>
                  {fmt(row.montant)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge statut={row.statut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section Récurrentes ──────────────────────────────────────────────────────
const FREQ_LABELS = {
  MENSUEL: 'Mensuel', BIMESTRIEL: 'Bimestriel', TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel', ANNUEL: 'Annuel',
};

function ModalNouveauModele({ onClose, onSave }) {
  const [form, setForm] = useState({
    client: '', description: '', montantHT: '', tauxTVA: 20, frequence: 'MENSUEL',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ht = parseFloat(form.montantHT) || 0;
  const tva = ht * Number(form.tauxTVA) / 100;

  const handleSave = () => {
    if (!form.client || !form.montantHT) return;
    onSave({ ...form, montantHT: ht, tva, ttc: ht + tva, tauxTVA: Number(form.tauxTVA) });
    onClose();
  };

  return (
    <Modal title="Nouveau modèle récurrent" onClose={onClose}>
      <Field label="Client *">
        <input style={inputStyle} placeholder="Acme Corp" value={form.client} onChange={set('client')} />
      </Field>
      <Field label="Description">
        <input style={inputStyle} placeholder="Abonnement maintenance" value={form.description} onChange={set('description')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Montant HT (€) *">
          <input style={inputStyle} type="number" placeholder="500" value={form.montantHT} onChange={set('montantHT')} />
        </Field>
        <Field label="Taux TVA">
          <select style={inputStyle} value={form.tauxTVA} onChange={set('tauxTVA')}>
            {TVA_RATES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Fréquence">
        <select style={inputStyle} value={form.frequence} onChange={set('frequence')}>
          {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#64748b' }}>
        {fmt(ht)} HT + {fmt(tva)} TVA = <strong style={{ color: '#4f46e5' }}>{fmt(ht + tva)} TTC</strong> · {FREQ_LABELS[form.frequence]}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn onClick={handleSave} disabled={!form.client || !form.montantHT}>Créer le modèle</Btn>
      </div>
    </Modal>
  );
}

function SectionRecurrentes({ showModal, setShowModal, company }) {
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.siret) return;
    apiCall(`/factures/recurrentes`)
      .then((r) => r.ok ? r.json() : [])
      .then(setModeles)
      .catch(() => setModeles([]))
      .finally(() => setLoading(false));
  }, [company]);

  const handleSave = async (form) => {
    try {
      const res = await apiCall('/factures/recurrentes', {
        method: 'POST',
        body: JSON.stringify({ ...form, siret: company?.siret }),
      });
      if (res.ok) {
        const data = await res.json();
        setModeles((m) => [data, ...m]);
        return;
      }
    } catch {}
    // Fallback local
    setModeles((m) => [{
      id: Date.now(), ...form, actif: true,
      prochaine_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    }, ...m]);
  };

  const toggleActif = async (id, actif) => {
    try {
      const res = await apiCall(`/factures/recurrentes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !actif }),
      });
      if (res.ok) {
        setModeles((m) => m.map((r) => r.id === id ? { ...r, actif: !actif } : r));
        return;
      }
    } catch {}
    setModeles((m) => m.map((r) => r.id === id ? { ...r, actif: !actif } : r));
  };

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {showModal && (
        <ModalNouveauModele onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Chargement…</div>
      ) : modeles.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '48px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔁</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aucun modèle récurrent</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Créez un modèle pour générer automatiquement vos factures périodiques.</div>
          <Btn onClick={() => setShowModal(true)}>+ Créer un modèle</Btn>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'auto' }}>
          <table style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e8ecf0' }}>
                {['Client', 'Description', 'Montant HT', 'Fréquence', 'Prochaine date', 'Statut', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '11px 14px', fontSize: 12, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modeles.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: r.actif ? 1 : 0.55 }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{r.client}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>{r.description || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{fmt(r.montant_ht || r.montantHT)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{FREQ_LABELS[r.frequence] || r.frequence}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>{fmtDate(r.prochaine_date)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: r.actif ? '#d1fae5' : '#f1f5f9', color: r.actif ? '#065f46' : '#64748b', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {r.actif ? 'Actif' : 'Pausé'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Btn
                      variant={r.actif ? 'ghost' : 'success'}
                      onClick={() => toggleActif(r.id, r.actif)}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      {r.actif ? '⏸ Pause' : '▶ Activer'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Config plans Stripe ──────────────────────────────────────────────────────
const PLANS_CONFIG = {
  gratuit:  { label: 'Gratuit',  price: 0,   color: '#64748b', bg: '#f1f5f9' },
  solo:     { label: 'Solo',     price: 14,  color: '#0891b2', bg: '#e0f2fe' },
  pro:      { label: 'Pro',      price: 34,  color: '#4f46e5', bg: '#ede9fe' },
  equipe:   { label: 'Équipe',   price: 69,  color: '#7c3aed', bg: '#f3e8ff' },
  business: { label: 'Business', price: 149, color: '#dc2626', bg: '#fee2e2' },
};
const UPGRADE_PLANS = ['solo', 'pro', 'equipe', 'business'];

// ─── Section Paramètres ───────────────────────────────────────────────────────
function SectionParametres({ company }) {
  const [form, setForm] = useState({
    siret:     company?.siret     || '',
    nom:       company?.nom       || '',
    email:     company?.email     || '',
    telephone: company?.telephone || '',
    adresse:   company?.adresse   || '',
  });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Plan & essai — chargés depuis /auth/me
  const [planInfo, setPlanInfo]             = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState('');
  const [portalLoading, setPortalLoading]   = useState(false);

  // Charger les vraies données depuis l'API
  useEffect(() => {
    if (!company?.siret) return;
    apiCall(`/entreprises/${company.siret}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setForm({
          siret:     data.siret     || company.siret,
          nom:       data.nom       || company.nom,
          email:     data.email     || '',
          telephone: data.telephone || '',
          adresse:   data.adresse   || '',
        });
      })
      .catch(() => {});

    // Plan + trial depuis /auth/me
    apiCall('/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setPlanInfo(data); })
      .catch(() => {});
  }, [company]);

  const handleUpgrade = async (plan) => {
    setUpgradeLoading(plan);
    try {
      const res = await apiCall('/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else alert(data.error || 'Erreur Stripe');
    } catch { alert('Erreur réseau'); }
    setUpgradeLoading('');
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiCall('/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.url) window.open(data.url, '_blank');
      else alert(data.error || 'Portail indisponible');
    } catch { alert('Erreur réseau'); }
    setPortalLoading(false);
  };

  const handleSave = async () => {
    try {
      // POST /entreprises fait un upsert (siret unique)
      await apiCall('/entreprises', {
        method: 'POST',
        body: JSON.stringify({ siret: form.siret, nom: form.nom, email: form.email }),
      });
    } catch {}
    localStorage.setItem('fe_company', JSON.stringify({ siret: form.siret, nom: form.nom, email: form.email }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Infos entreprise */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '28px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Informations entreprise
          </h2>
          <Field label="SIRET">
            <input
              style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }}
              value={form.siret}
              readOnly
            />
          </Field>
          <Field label="Nom de l'entreprise">
            <input style={inputStyle} value={form.nom} onChange={set('nom')} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Email">
              <input style={inputStyle} type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Téléphone">
              <input style={inputStyle} value={form.telephone} onChange={set('telephone')} />
            </Field>
          </div>
          <Field label="Adresse">
            <input style={inputStyle} value={form.adresse} onChange={set('adresse')} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Btn onClick={handleSave}>Sauvegarder</Btn>
            {saved && (
              <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>✓ Sauvegardé</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Abonnement */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Abonnement</h2>
              {planInfo && (() => {
                const plan   = planInfo.plan || 'gratuit';
                const cfg    = PLANS_CONFIG[plan] || PLANS_CONFIG.gratuit;
                const isTrialing = planInfo.trial_ends_at && new Date(planInfo.trial_ends_at) > new Date();
                return (
                  <span style={{ background: isTrialing ? '#fef9c3' : cfg.bg, color: isTrialing ? '#854d0e' : cfg.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    {isTrialing ? '⏳ Essai' : (plan === 'gratuit' ? 'Gratuit' : 'Actif')}
                  </span>
                );
              })()}
            </div>

            {planInfo ? (() => {
              const plan = planInfo.plan || 'gratuit';
              const cfg  = PLANS_CONFIG[plan] || PLANS_CONFIG.gratuit;
              const trialEnd = planInfo.trial_ends_at ? new Date(planInfo.trial_ends_at) : null;
              const isTrialing = trialEnd && trialEnd > new Date();
              const daysLeft = trialEnd ? Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)) : 0;

              return (
                <>
                  <div style={{ fontSize: 26, fontWeight: 800, color: cfg.color, marginBottom: 4 }}>
                    {cfg.label}
                  </div>
                  {cfg.price > 0 ? (
                    <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 600, marginBottom: 8 }}>
                      {cfg.price} €{' '}
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>/ mois HT</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Sans engagement</div>
                  )}
                  {isTrialing && (
                    <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#854d0e', marginBottom: 12 }}>
                      🎁 Essai gratuit — encore <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> (fin le {trialEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })})
                    </div>
                  )}
                  {/* Boutons upgrade vers les plans supérieurs */}
                  {UPGRADE_PLANS.filter((p) => PLANS_CONFIG[p].price > (cfg.price || 0)).map((p) => {
                    const c = PLANS_CONFIG[p];
                    return (
                      <button
                        key={p}
                        onClick={() => handleUpgrade(p)}
                        disabled={upgradeLoading === p}
                        style={{ display: 'block', width: '100%', marginBottom: 8, padding: '9px 14px', background: c.bg, color: c.color, border: `1px solid ${c.color}30`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                      >
                        {upgradeLoading === p ? '…' : `↑ Passer en ${c.label} — ${c.price} €/mois`}
                      </button>
                    );
                  })}
                  {/* Portail Stripe uniquement si abonnement actif */}
                  {plan !== 'gratuit' && (
                    <Btn variant="ghost" onClick={handlePortal} style={{ marginTop: 4 }}>
                      {portalLoading ? '…' : 'Gérer l\'abonnement →'}
                    </Btn>
                  )}
                </>
              );
            })() : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Chargement…</div>
            )}
          </div>

          {/* Accès API Chorus Pro */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Accès API Chorus Pro
            </h2>
            <ChorusStatus />
          </div>

          {/* Expert-comptable */}
          <InviteComptable company={company} />
        </div>
      </div>
    </div>
  );
}

// ─── InviteComptable ──────────────────────────────────────────────────────────
function InviteComptable({ company }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');

  const handleInvite = async () => {
    setLoading(true);
    setToken('');
    setMsg('');
    try {
      const res = await apiCall('/auth/invite-comptable', {
        method: 'POST',
        body: JSON.stringify({ siret: company?.siret }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token || '');
        setMsg('✓ Lien d\'invitation généré (valide 7 jours)');
      } else {
        setMsg(data.error || 'Erreur lors de la génération');
      }
    } catch {
      setMsg('Erreur réseau');
    }
    setLoading(false);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/login-comptable?token=${token}`;
    navigator.clipboard.writeText(link).then(() => setMsg('✓ Lien copié dans le presse-papiers'));
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>👤 Expert-comptable</h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
        Donnez accès en lecture seule à votre comptable. Il pourra consulter vos factures, revenus et dépenses sans pouvoir les modifier.
      </p>
      {msg && (
        <div style={{ background: msg.startsWith('✓') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✓') ? '#065f46' : '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
          {msg}
        </div>
      )}
      {token && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 12, color: '#374151' }}>
          {`${window.location.origin}/login-comptable?token=${token}`}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={handleInvite} disabled={loading} variant="ghost">
          {loading ? 'Génération…' : '🔗 Générer le lien d\'invitation'}
        </Btn>
        {token && (
          <Btn onClick={copyLink} variant="success">
            📋 Copier le lien
          </Btn>
        )}
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  { key: 'video',    icon: '🎬', title: 'Regarder la vidéo de bienvenue', desc: '2 min pour comprendre FacturEasy et Chorus Pro', cta: 'Voir la vidéo →', link: 'https://factureasy.fr/guides' },
  { key: 'chorus',   icon: '🔗', title: 'Connecter Chorus Pro', desc: 'Renseignez votre SIRET dans les Paramètres pour activer la connexion', cta: 'Accéder aux Paramètres', nav: 'parametres' },
  { key: 'facture',  icon: '🧾', title: 'Créer votre première facture', desc: 'Moins de 2 minutes. Elle sera transmise automatiquement au Portail Public de Facturation', cta: 'Créer une facture', nav: 'factures' },
];

function OnboardingWizard({ company, onClose, onNav }) {
  const saved = JSON.parse(localStorage.getItem('fe_onboarding') || '{}');
  const [done, setDone] = useState(saved);

  const markDone = (key) => {
    const next = { ...done, [key]: true };
    setDone(next);
    localStorage.setItem('fe_onboarding', JSON.stringify(next));
  };

  const allDone = ONBOARDING_STEPS.every((s) => done[s.key]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-in" style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 500, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💼</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Bienvenue, {company?.nom?.split(' ')[0] || 'chez vous'} !
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            3 étapes pour émettre votre première facture électronique.<br />
            Tout est expliqué — aucun appel nécessaire.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {ONBOARDING_STEPS.map((step, i) => {
            const isComplete = done[step.key];
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 14, background: isComplete ? '#f0fdf4' : '#f8fafc', borderRadius: 12, padding: '14px 16px', border: `1.5px solid ${isComplete ? '#86efac' : '#e2e8f0'}` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isComplete ? '#4ade80' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isComplete ? 18 : 14, flexShrink: 0, fontWeight: 700, color: isComplete ? '#fff' : '#64748b' }}>
                  {isComplete ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{step.icon} {step.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{step.desc}</div>
                </div>
                {!isComplete && (
                  <button
                    onClick={() => {
                      markDone(step.key);
                      if (step.nav) { onNav(step.nav); onClose(); }
                      else if (step.link) window.open(step.link, '_blank');
                    }}
                    style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {step.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {Object.values(done).filter(Boolean).length}/{ONBOARDING_STEPS.length} étapes complètes
          </span>
          <button onClick={onClose} style={{ background: allDone ? '#4f46e5' : '#f1f5f9', color: allDone ? '#fff' : '#374151', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {allDone ? '🎉 Commencer →' : 'Passer pour l\'instant'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Statut Chorus Pro (dynamique) ───────────────────────────────────────────
function ChorusStatus() {
  const [status, setStatus] = React.useState('checking');
  React.useEffect(() => {
    fetch('/health')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setStatus(d?.ok ? 'connected' : 'error'))
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'checking') return (
    <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#64748b' }}>
      Vérification de la connexion Chorus Pro…
    </div>
  );
  if (status === 'connected') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px', background: '#d1fae5', borderRadius: 10 }}>
      <span style={{ fontSize: 20 }}>✅</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>Connecté</div>
        <div style={{ fontSize: 12, color: '#047857' }}>Portail Chorus Pro — API v2.0</div>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px', background: '#fef3c7', borderRadius: 10 }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Non configuré</div>
        <div style={{ fontSize: 12, color: '#b45309' }}>Identifiants Chorus Pro à renseigner dans les paramètres Railway</div>
      </div>
    </div>
  );
}


// ─── Aliases composants (noms normalisés) ────────────────────────────────────
const LoginPage          = LoginScreen;
const OnboardingChecklist = OnboardingWizard;

function SectionTresorerie({ factures, revenus, depenses }) {
  const totalEncaisse = revenus.reduce((s, r) => s + parseFloat(r.montant_ttc || 0), 0);
  const totalDepense  = depenses.reduce((s, d) => s + parseFloat(d.ttc || 0), 0);
  const solde         = totalEncaisse - totalDepense;
  const fmt = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 28 }}>
        <KpiCard label="Encaissé" value={fmt(totalEncaisse)} color="#10b981" />
        <KpiCard label="Décaissé"  value={fmt(totalDepense)}  color="#ef4444" />
        <KpiCard label="Solde net" value={fmt(solde)}         color={solde >= 0 ? '#4f46e5' : '#ef4444'} />
      </div>
      <div style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
        <p style={{ color:'#64748b', fontSize:14 }}>
          Graphique de trésorerie — disponible prochainement.
        </p>
      </div>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const [company, setCompany] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [factures, setFactures] = useState([]);
  const [revenus, setRevenus] = useState([]);
  const [depenses, setDepenses] = useState([]);

  // Restaurer session depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem('fe_company');
    if (stored && localStorage.getItem('fe_token')) {
      try {
        setCompany(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Afficher l'onboarding au premier login (si les 3 étapes ne sont pas toutes faites)
  useEffect(() => {
    if (!company) return;
    const saved = JSON.parse(localStorage.getItem('fe_onboarding') || '{}');
    const allDone = ONBOARDING_STEPS.every((s) => saved[s.key]);
    if (!allDone) setShowOnboarding(true);
  }, [company]);

  // Charger données depuis l'API (fallback mock si erreur)
  useEffect(() => {
    if (!company) return;
    const load = async () => {
      try {
        const [rF, rR, rD] = await Promise.all([
          apiCall('/factures'),
          apiCall('/revenus'),
          apiCall('/depenses'),
        ]);
        if (rF.ok) setFactures(await rF.json());
        if (rR.ok) setRevenus(await rR.json());
        if (rD.ok) setDepenses(await rD.json());
      } catch {}
    };
    load();
  }, [company]);

  const handleLogin = (entreprise) => {
    setCompany(entreprise);
    setPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('fe_token');
    localStorage.removeItem('fe_company');
    setCompany(null);
    setPage('dashboard');
    setFactures([]);
    setRevenus([]);
    setDepenses([]);
  };

  const renderContent = () => {
    switch (page) {
      case 'dashboard':
        return <SectionDashboard factures={factures} revenus={revenus} depenses={depenses} company={company} showModal={showModal} setShowModal={setShowModal} />;
      case 'factures':
        return <SectionFactures factures={factures} setFactures={setFactures} company={company} showModal={showModal} setShowModal={setShowModal} />;
      case 'revenus':
        return <SectionRevenus revenus={revenus} setRevenus={setRevenus} company={company} showModal={showModal} setShowModal={setShowModal} />;
      case 'depenses':
        return <SectionDepenses depenses={depenses} setDepenses={setDepenses} company={company} showModal={showModal} setShowModal={setShowModal} />;
      case 'tva':
        return <SectionTVA factures={factures} depenses={depenses} company={company} />;
      case 'recurrentes':
        return <SectionRecurrentes company={company} showModal={showModal} setShowModal={setShowModal} />;
      case 'tresorerie':
        return <SectionTresorerie factures={factures} revenus={revenus} depenses={depenses} />;
      case 'parametres':
        return <SectionParametres company={company} />;
      default:
        return <SectionDashboard factures={factures} revenus={revenus} depenses={depenses} company={company} showModal={showModal} setShowModal={setShowModal} />;
    }
  };

  if (!company) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>⚡ FacturEasy</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{company.nom}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                marginBottom: 2,
                borderRadius: 8,
                border: 'none',
                background: page === item.key ? '#ede9fe' : 'transparent',
                color: page === item.key ? '#4f46e5' : '#64748b',
                fontWeight: page === item.key ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Onboarding toggle */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setShowOnboarding(true)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
          >
            🚀 Guide démarrage
          </button>
        </div>

        {/* Logout */}
        <div style={{ padding: '8px 16px' }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {PAGE_META[page]?.title || 'Dashboard'}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>
              {PAGE_META[page]?.subtitle || ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {PAGE_META[page]?.cta && (
              <Btn onClick={() => setShowModal(true)}>
                {PAGE_META[page].cta}
              </Btn>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </main>

      {/* Onboarding overlay */}
      {showOnboarding && (
        <OnboardingChecklist onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
