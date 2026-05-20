import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function apiFetch(path) {
  const token = localStorage.getItem('fe_token');
  return fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const MOIS_LABELS = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function CardWrapper({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 16,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function Spinner() {
  return <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>Chargement...</div>;
}

function ErrMsg({ msg }) {
  return <div style={{ color: '#ef4444', fontSize: 12, padding: '8px 0' }}>{msg}</div>;
}

// ─── Widget Flux Trésorerie ───────────────────────────────────────────────────
// Appelle GET /rapports/flux-tresorerie?annee=YYYY
// Réponse : { encaissements: [{mois, montant}], decaissements: [{mois, montant}], solde_net }
export function WidgetFluxTresorerie() {
  const annee = new Date().getFullYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/rapports/flux-tresorerie?annee=${annee}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [annee]);

  return (
    <CardWrapper title={`Flux de trésorerie ${annee}`}>
      {loading && <Spinner />}
      {error && <ErrMsg msg={`Impossible de charger les données (${error})`} />}
      {data && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Mois', 'Encaissements', 'Décaissements', 'Solde'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', color: '#64748b', fontWeight: 600, textAlign: h === 'Mois' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.encaissements.map((enc, i) => {
                const dec = data.decaissements[i]?.montant || 0;
                const solde = enc.montant - dec;
                const moisCode = enc.mois.slice(5, 7);
                return (
                  <tr key={enc.mois} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#374151', fontWeight: 500 }}>
                      {MOIS_LABELS[moisCode] || enc.mois}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#10b981' }}>
                      {fmt(enc.montant)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f59e0b' }}>
                      {fmt(dec)}
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: solde >= 0 ? '#10b981' : '#ef4444',
                    }}>
                      {fmt(solde)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f8fafc' }}>
                <td colSpan={3} style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12, color: '#374151' }}>
                  Solde net
                </td>
                <td style={{
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: data.solde_net >= 0 ? '#10b981' : '#ef4444',
                }}>
                  {fmt(data.solde_net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </CardWrapper>
  );
}

// ─── Widget Entonnoir Factures ────────────────────────────────────────────────
// Appelle GET /factures et agrège par statut
// Statuts réels : EMISE, EN_COURS, ACCEPTEE, REJETEE
const STATUT_CONFIG = [
  { key: 'EMISE',    label: 'Émises',    color: '#3b82f6' },
  { key: 'EN_COURS', label: 'En cours',  color: '#f59e0b' },
  { key: 'ACCEPTEE', label: 'Acceptées', color: '#10b981' },
  { key: 'REJETEE',  label: 'Rejetées',  color: '#ef4444' },
];

export function WidgetEntonnoirFactures() {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/factures')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((factures) => {
        const agg = {};
        for (const f of factures) {
          agg[f.statut] = (agg[f.statut] || 0) + 1;
        }
        setCounts(agg);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const total = counts ? Math.max(1, Object.values(counts).reduce((s, v) => s + v, 0)) : 1;

  return (
    <CardWrapper title="Répartition des factures">
      {loading && <Spinner />}
      {error && <ErrMsg msg={`Impossible de charger les données (${error})`} />}
      {counts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STATUT_CONFIG.map(({ key, label, color }) => {
            const count = counts[key] || 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#374151' }}>
                  <span style={{ fontWeight: 500 }}>{label}</span>
                  <span style={{ color: '#64748b' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 4,
                    height: '100%',
                    transition: 'width 0.6s ease',
                    minWidth: count > 0 ? 4 : 0,
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Total : {total} facture{total > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </CardWrapper>
  );
}

// ─── Widget Top Clients ───────────────────────────────────────────────────────
// Appelle GET /rapports/ca-clients?annee=YYYY&limit=5
// Réponse : [{ client_nom, ca_ht, nb_factures }]
export function WidgetTopClients() {
  const annee = new Date().getFullYear();
  const [clients, setClients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/rapports/ca-clients?annee=${annee}&limit=5`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [annee]);

  return (
    <CardWrapper title={`Top 5 clients ${annee}`}>
      {loading && <Spinner />}
      {error && <ErrMsg msg={`Impossible de charger les données (${error})`} />}
      {clients && clients.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 12, padding: '8px 0' }}>Aucun client pour cette période.</div>
      )}
      {clients && clients.length > 0 && (
        <ol style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clients.map((c, i) => (
            <li key={c.client_nom || i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: i === 0 ? '#f0fdf4' : '#f8fafc',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
            }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: i === 0 ? '#10b981' : '#e5e7eb',
                color: i === 0 ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.client_nom || '—'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap' }}>
                {fmt(c.ca_ht)}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {c.nb_factures} fact.
              </span>
            </li>
          ))}
        </ol>
      )}
    </CardWrapper>
  );
}
