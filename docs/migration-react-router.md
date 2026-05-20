# Plan de migration React Router v6 — App.jsx

## 1. État actuel

### Fichier
- **Fichier** : `frontend/src/App.jsx`
- **Taille** : 3537 lignes, monolithique

### Système de navigation
La navigation repose entièrement sur un state React local dans le composant `App` :

```js
// App.jsx ligne 3384
const [page, setPage] = useState('dashboard');
```

La `NAV_ITEMS` (ligne 503) définit 10 entrées de navigation :

| key | label |
|---|---|
| `dashboard` | Dashboard |
| `factures` | Factures |
| `recurrentes` | Récurrentes |
| `revenus` | Revenus |
| `depenses` | Dépenses |
| `tva` | TVA |
| `devis` | Devis |
| `catalogue` | Catalogue |
| `plans` | Plans & abonnement |
| `parametres` | Paramètres |

La fonction `renderContent()` (ligne 3452) switche sur `page` pour afficher le composant correspondant :

```js
const renderContent = () => {
  switch (page) {
    case 'dashboard':   return <SectionDashboard ... />;
    case 'factures':    return <SectionFactures ... />;
    case 'revenus':     return <SectionRevenus ... />;
    case 'depenses':    return <SectionDepenses ... />;
    case 'tva':         return <SectionTVA ... />;
    case 'devis':       return <SectionDevis ... />;
    case 'catalogue':   return <SectionCatalogue ... />;
    case 'recurrentes': return <SectionRecurrentes ... />;
    case 'tresorerie':  return <SectionTresorerie ... />;
    case 'plans':       return <SectionPlans ... />;
    case 'parametres':  return <SectionParametres ... />;
    default:            return <SectionDashboard ... />;
  }
};
```

La sidebar utilise `onClick={() => setPage(item.key)}` — il n'y a aucune URL, aucun historique browser, aucun deep link.

**Pages identifiées** : 11 sections (dashboard, factures, recurrentes, revenus, depenses, tva, devis, catalogue, tresorerie, plans, parametres) + écrans d'auth/onboarding hors navigation.

---

## 2. Objectif

- URLs lisibles dans la barre d'adresse : `/dashboard`, `/factures`, `/devis`, etc.
- Navigation browser back/forward fonctionnelle
- Deep links partageables et bookmarkables
- Redirection automatique selon état d'authentification (JWT)
- Base propre pour code splitting (`React.lazy`) ultérieur

---

## 3. Dépendances à installer

```bash
cd frontend && npm install react-router-dom@6
```

Pas d'autres dépendances nécessaires. React Router v6 est compatible avec React 18+.

---

## 4. Plan de découpage en fichiers

Structure cible après migration complète :

```
frontend/src/
├── index.js                         (ajouter <BrowserRouter>)
├── App.jsx                          (réduit à ~150-200 lignes : routes + guard)
├── pages/
│   ├── Dashboard.jsx                (extrait de SectionDashboard)
│   ├── Factures.jsx                 (extrait de SectionFactures)
│   ├── Devis.jsx                    (extrait de SectionDevis)
│   ├── Catalogue.jsx                (extrait de SectionCatalogue)
│   ├── Recurrentes.jsx              (extrait de SectionRecurrentes)
│   ├── Revenus.jsx                  (extrait de SectionRevenus)
│   ├── Depenses.jsx                 (extrait de SectionDepenses)
│   ├── TVA.jsx                      (extrait de SectionTVA)
│   ├── Tresorerie.jsx               (extrait de SectionTresorerie)
│   ├── Plans.jsx                    (extrait de SectionPlans)
│   └── Parametres.jsx               (extrait de SectionParametres)
├── components/
│   ├── Layout.jsx                   (sidebar + header extraits de App)
│   ├── PrivateRoute.jsx             (auth guard JWT)
│   ├── ErrorBoundary.jsx            (déjà présent dans App, à extraire)
│   └── [autres composants partagés existants]
└── hooks/
    └── useAuth.js                   (gestion company, token, login, logout)
```

---

## 5. Migration étape par étape

### Étape 1 — Installer react-router-dom et wrapper BrowserRouter

```bash
cd frontend && npm install react-router-dom@6
```

Dans `frontend/src/index.js` (ou `main.jsx`) :

```jsx
import { BrowserRouter } from 'react-router-dom';

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Effort** : 15 min. Rien ne casse encore.

---

### Étape 2 — Créer le hook useAuth

Extraire la gestion de l'authentification dans `frontend/src/hooks/useAuth.js` :

```js
import { useState, useEffect } from 'react';

export function useAuth() {
  const [company, setCompany] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedCompany = localStorage.getItem('fe_company');
    const storedToken = localStorage.getItem('fe_token');
    if (storedCompany && storedToken) {
      setCompany(JSON.parse(storedCompany));
      setToken(storedToken);
    }
  }, []);

  const login = (companyData, jwt) => {
    localStorage.setItem('fe_company', JSON.stringify(companyData));
    localStorage.setItem('fe_token', jwt);
    setCompany(companyData);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem('fe_company');
    localStorage.removeItem('fe_token');
    setCompany(null);
    setToken(null);
  };

  return { company, setCompany, token, login, logout, isAuthenticated: !!token };
}
```

**Effort** : 1h (identifier tous les endroits où `company` et le token sont utilisés dans App.jsx).

---

### Étape 3 — Créer le composant Layout

Extraire la sidebar et le header dans `frontend/src/components/Layout.jsx` :

```jsx
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',          icon: '📊' },
  { path: '/factures',     label: 'Factures',           icon: '🧾' },
  { path: '/recurrentes',  label: 'Récurrentes',        icon: '🔁' },
  { path: '/revenus',      label: 'Revenus',            icon: '💰' },
  { path: '/depenses',     label: 'Dépenses',           icon: '💸' },
  { path: '/tva',          label: 'TVA',                icon: '📋' },
  { path: '/devis',        label: 'Devis',              icon: '📝' },
  { path: '/catalogue',    label: 'Catalogue',          icon: '🗂️' },
  { path: '/plans',        label: 'Plans & abonnement', icon: '⭐' },
  { path: '/parametres',   label: 'Paramètres',         icon: '⚙️' },
];

export default function Layout({ company, onLogout }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>⚡ FacturEasy</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{company?.nom}</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px', marginBottom: 2,
                borderRadius: 8, border: 'none', textDecoration: 'none',
                background: isActive ? '#ede9fe' : 'transparent',
                color: isActive ? '#4f46e5' : '#64748b',
                fontWeight: isActive ? 700 : 500, fontSize: 13,
              })}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={onLogout} style={{ margin: '12px', padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}>
          Déconnexion
        </button>
      </aside>
      <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}
```

**Effort** : 2h (adapter le style exact depuis App.jsx, tester l'affichage).

---

### Étape 4 — Créer PrivateRoute

Dans `frontend/src/components/PrivateRoute.jsx` :

```jsx
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute({ isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

**Effort** : 30 min.

---

### Étape 5 — Refactoriser App.jsx avec les routes

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages (extraites progressivement)
import Dashboard from './pages/Dashboard';
import Factures from './pages/Factures';
import Recurrentes from './pages/Recurrentes';
import Revenus from './pages/Revenus';
import Depenses from './pages/Depenses';
import TVA from './pages/TVA';
import Devis from './pages/Devis';
import Catalogue from './pages/Catalogue';
import Tresorerie from './pages/Tresorerie';
import Plans from './pages/Plans';
import Parametres from './pages/Parametres';

// Écrans hors auth (déjà dans App.jsx)
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen';

export default function App() {
  const { company, setCompany, token, login, logout, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [factures, setFactures] = useState([]);
  const [revenus, setRevenus] = useState([]);
  const [depenses, setDepenses] = useState([]);

  // Props partagés injectés dans chaque page via context ou props
  const sharedProps = { company, setCompany, showModal, setShowModal, factures, setFactures, revenus, setRevenus, depenses, setDepenses };

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginScreen onLogin={login} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route element={<Layout company={company} onLogout={logout} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"   element={<Dashboard   {...sharedProps} />} />
            <Route path="/factures"    element={<Factures    {...sharedProps} />} />
            <Route path="/recurrentes" element={<Recurrentes {...sharedProps} />} />
            <Route path="/revenus"     element={<Revenus     {...sharedProps} />} />
            <Route path="/depenses"    element={<Depenses    {...sharedProps} />} />
            <Route path="/tva"         element={<TVA         {...sharedProps} />} />
            <Route path="/devis"       element={<Devis       {...sharedProps} />} />
            <Route path="/catalogue"   element={<Catalogue   {...sharedProps} />} />
            <Route path="/tresorerie"  element={<Tresorerie  {...sharedProps} />} />
            <Route path="/plans"       element={<Plans       {...sharedProps} />} />
            <Route path="/parametres"  element={<Parametres  {...sharedProps} />} />
            <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
```

**Effort** : 2h (écriture + résolution des imports manquants).

---

### Étape 6 — Extraire chaque page (pilote : Dashboard)

Commencer par `SectionDashboard` (la moins couplée) :

1. Copier la fonction `SectionDashboard` depuis App.jsx dans `frontend/src/pages/Dashboard.jsx`
2. Ajouter les imports nécessaires en tête de fichier
3. Exporter comme composant par défaut : `export default function Dashboard(props) { ... }`
4. Dans App.jsx, importer et remplacer l'usage inline
5. Supprimer `SectionDashboard` de App.jsx
6. Tester visuellement

Répéter pour chaque section dans cet ordre recommandé (du plus simple au plus couplé) :
1. `Dashboard` — lecture seule, affiche des données
2. `Plans` — peu de state local
3. `Catalogue` — state local autonome
4. `Devis` — state local autonome
5. `TVA` — calculs, peu d'effets
6. `Parametres` — formulaire simple
7. `Revenus` — CRUD avec API
8. `Depenses` — CRUD avec API
9. `Recurrentes` — logique métier
10. `Factures` — la plus complexe (PDF, avoir, relance)

**Effort** : 1 à 3h par page selon complexité.

---

### Étape 7 — Supprimer l'ancien système

Une fois toutes les pages extraites et testées :

- Supprimer `const [page, setPage] = useState('dashboard')`
- Supprimer `const renderContent = () => { switch (page) { ... } }`
- Supprimer `NAV_ITEMS` de App.jsx (déplacé dans Layout.jsx)
- Supprimer la sidebar inline de App.jsx (remplacée par Layout.jsx)
- Vérifier que App.jsx fait bien ~150-200 lignes

**Effort** : 1h.

---

## 6. Risques et mitigation

### Auth guard — PrivateRoute
**Risque** : une URL privée accessible sans JWT si le guard n'est pas correctement placé.

**Mitigation** : le composant `PrivateRoute` (Étape 4) intercepte toutes les routes sous `/` et redirige vers `/login` si `isAuthenticated === false`. Tester avec un token expiré en localStorage.

---

### State partagé (company, factures, etc.)
**Risque** : prop drilling profond si toutes les pages reçoivent `sharedProps`.

**Mitigation court terme** : le pattern `{...sharedProps}` en Étape 5 fonctionne sans changement architectural.

**Mitigation long terme** : créer un `AppContext` avec `React.createContext` pour éviter le prop drilling :

```jsx
export const AppContext = React.createContext(null);
// Dans App : <AppContext.Provider value={sharedProps}><Routes>...</Routes></AppContext.Provider>
// Dans les pages : const { factures, setFactures } = useContext(AppContext);
```

---

### Redirections URL inconnues
**Risque** : page blanche sur une URL non définie.

**Mitigation** : route catch-all `<Route path="*" element={<Navigate to="/dashboard" replace />} />` (déjà inclus dans App.jsx cible ci-dessus).

---

### Déploiement Vercel — SPA routing
**Risque** : Vercel renvoie 404 sur `/factures` (rechargement direct) car il cherche un fichier statique.

**Mitigation** : créer `frontend/public/vercel.json` (ou `vercel.json` à la racine du projet) :

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Alternativement, un fichier `frontend/public/_redirects` (Netlify) :
```
/* /index.html 200
```

**A vérifier** : si Vercel est configuré avec un `outputDirectory` pointant vers `frontend/dist`, le `vercel.json` doit être à la racine du repo.

---

### Scroll position
**Risque** : en naviguant entre pages, la position de scroll de la page précédente persiste.

**Mitigation** : ajouter un `ScrollRestoration` de react-router-dom ou un useEffect dans Layout :

```jsx
import { useLocation } from 'react-router-dom';
const { pathname } = useLocation();
useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
```

---

## 7. Estimation effort

| Étape | Description | Effort estimé |
|---|---|---|
| 1 | Installer react-router-dom, wrapper BrowserRouter | 0,5h |
| 2 | Créer useAuth hook | 1h |
| 3 | Créer Layout.jsx (sidebar + Outlet) | 2h |
| 4 | Créer PrivateRoute | 0,5h |
| 5 | Refactoriser App.jsx avec Routes | 2h |
| 6a | Extraire pilote Dashboard.jsx | 1h |
| 6b | Extraire les 10 autres pages | 15-25h |
| 7 | Nettoyage App.jsx, suppression ancien système | 1h |
| — | Tests manuels, correction bugs, vérification Vercel | 3h |
| **Total** | | **~26-36h développeur** |

Soit **3 à 5 jours** pour un développeur seul travaillant sur ce seul sujet, ou **1 à 2 sprints** en parallèle d'autres tâches.

**Recommandation** : faire la migration en parallèle sur une branche `feat/react-router`, avec une PR de merge une fois toutes les pages extraites et testées.

---

## 8. Code du nouveau App.jsx cible (~150 lignes)

```jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Dashboard    from './pages/Dashboard';
import Factures     from './pages/Factures';
import Recurrentes  from './pages/Recurrentes';
import Revenus      from './pages/Revenus';
import Depenses     from './pages/Depenses';
import TVA          from './pages/TVA';
import Devis        from './pages/Devis';
import Catalogue    from './pages/Catalogue';
import Tresorerie   from './pages/Tresorerie';
import Plans        from './pages/Plans';
import Parametres   from './pages/Parametres';

// Auth screens (inlined ou dans components/)
import LoginScreen       from './components/LoginScreen';
import OnboardingScreen  from './components/OnboardingScreen';

export default function App() {
  const { company, setCompany, token, login, logout, isAuthenticated } = useAuth();
  const [showModal, setShowModal]   = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [factures, setFactures]     = useState([]);
  const [revenus, setRevenus]       = useState([]);
  const [depenses, setDepenses]     = useState([]);

  // Props injectés dans toutes les pages
  const sharedProps = {
    company,
    setCompany,
    showModal,
    setShowModal,
    factures,
    setFactures,
    revenus,
    setRevenus,
    depenses,
    setDepenses,
  };

  // Onboarding (nouvelle entreprise après inscription)
  if (isAuthenticated && showOnboarding) {
    return (
      <ErrorBoundary>
        <OnboardingScreen
          company={company}
          onComplete={() => setShowOnboarding(false)}
        />
      </ErrorBoundary>
    );
  }

  // Non authentifié → écran de login
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginScreen onLogin={login} onNeedOnboarding={() => setShowOnboarding(true)} />
      </ErrorBoundary>
    );
  }

  // Authentifié → application avec routes
  return (
    <ErrorBoundary>
      <Routes>
        {/* Routes protégées */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route element={<Layout company={company} onLogout={logout} />}>
            {/* Redirection racine */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Pages */}
            <Route path="/dashboard"   element={<Dashboard   {...sharedProps} />} />
            <Route path="/factures"    element={<Factures    {...sharedProps} />} />
            <Route path="/recurrentes" element={<Recurrentes {...sharedProps} />} />
            <Route path="/revenus"     element={<Revenus     {...sharedProps} />} />
            <Route path="/depenses"    element={<Depenses    {...sharedProps} />} />
            <Route path="/tva"         element={<TVA         {...sharedProps} />} />
            <Route path="/devis"       element={<Devis       {...sharedProps} />} />
            <Route path="/catalogue"   element={<Catalogue   {...sharedProps} />} />
            <Route path="/tresorerie"  element={<Tresorerie  {...sharedProps} />} />
            <Route path="/plans"       element={<Plans       {...sharedProps} />} />
            <Route path="/parametres"  element={<Parametres  {...sharedProps} />} />

            {/* URL inconnue → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
```

---

*Document généré le 2026-05-20 — basé sur l'analyse de App.jsx (3537 lignes, commit courant)*
