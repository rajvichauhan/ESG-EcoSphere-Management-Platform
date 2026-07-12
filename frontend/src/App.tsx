import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
import {
  LandingPage,
  AuthPage,
  DashboardPage,
  CarbonCalculatorPage,
  CarbonReferencesPage,
  ProductCarbonPage,
  GoalsPage,
  CsrActivitiesPage,
  DiversityPage,
  TrainingPage,
  PoliciesPage,
  AuditsPage,
  GamificationPage,
  ReportsPage,
  OrgSetupPage,
  PublicPoliciesPage,
  NotFoundPage,
  AccessDeniedPage,
  LogoutPage,
} from './pages';

const MainContent: React.FC = () => {
  const { user, hasRole, isLoading } = useAuth();
  const [route, setRoute] = useState<string>('landing');

  // Sync routing state with authentication lifecycle
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // If logged in, send to dashboard from landing/auth screens
        if (['landing', 'login', 'register'].includes(route)) {
          setRoute('dashboard');
        }
      } else {
        // If logged out, push to landing unless viewing public pages
        if (!['landing', 'login', 'register', 'public-policies'].includes(route)) {
          setRoute('landing');
        }
      }
    }
  }, [user, isLoading]);

  // Loading State
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1.5rem', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>Loading EcoSphere...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Unauthenticated Views
  if (!user) {
    switch (route) {
      case 'landing':
        return (
          <LandingPage
            onNavigateToLogin={() => setRoute('login')}
            onNavigateToRegister={() => setRoute('register')}
            onNavigateToPublicPolicies={() => setRoute('public-policies')}
          />
        );
      case 'login':
        return (
          <AuthPage
            initialMode="login"
            onSuccess={() => setRoute('dashboard')}
            onViewPublicPolicies={() => setRoute('public-policies')}
            onBackToLanding={() => setRoute('landing')}
          />
        );
      case 'register':
        return (
          <AuthPage
            initialMode="register"
            onSuccess={() => setRoute('dashboard')}
            onViewPublicPolicies={() => setRoute('public-policies')}
            onBackToLanding={() => setRoute('landing')}
          />
        );
      case 'public-policies':
        return <PublicPoliciesPage onBackToLogin={() => setRoute('login')} />;
      default:
        return (
          <LandingPage
            onNavigateToLogin={() => setRoute('login')}
            onNavigateToRegister={() => setRoute('register')}
            onNavigateToPublicPolicies={() => setRoute('public-policies')}
          />
        );
    }
  }

  // Authenticated Logout Flow (renders outside AppShell)
  if (route === 'logout') {
    return <LogoutPage onRedirectToLanding={() => setRoute('landing')} />;
  }

  // Role Gate Enforcements (Inside AppShell to retain navigation context)
  const isRestrictedRoute = route === 'sub-admins';
  const hasAccess = !isRestrictedRoute || hasRole('master_admin', 'org_admin');

  const renderPageContent = () => {
    if (!hasAccess) {
      return (
        <AccessDeniedPage
          onBack={() => setRoute('dashboard')}
          onGoHome={() => setRoute('dashboard')}
          requiredRoles={['master_admin', 'org_admin']}
        />
      );
    }

    switch (route) {
      case 'dashboard':
        return <DashboardPage onNavigate={setRoute} />;
      case 'carbon-calculator':
        return <CarbonCalculatorPage />;
      case 'carbon-references':
        return <CarbonReferencesPage />;
      case 'product-carbon':
        return <ProductCarbonPage />;
      case 'goals':
        return <GoalsPage />;
      case 'csr-activities':
        return <CsrActivitiesPage />;
      case 'diversity':
        return <DiversityPage />;
      case 'training':
        return <TrainingPage />;
      case 'policies':
        return <PoliciesPage />;
      case 'audits':
        return <AuditsPage />;
      case 'gamification':
        return <GamificationPage />;
      case 'reports':
        return <ReportsPage initialTab="generator" />;
      case 'ai-assistant':
        return <ReportsPage initialTab="ai-assistant" />;
      case 'hierarchy':
        return <OrgSetupPage initialTab="hierarchy" />;
      case 'facilities':
        return <OrgSetupPage initialTab="facilities" />;
      case 'city-profiles':
        return <OrgSetupPage initialTab="cities" />;
      case 'sub-admins':
        return <OrgSetupPage initialTab="subadmins" />;
      case 'settings':
        return <OrgSetupPage initialTab="settings" />;
      default:
        return <NotFoundPage onBack={() => setRoute('dashboard')} />;
    }
  };

  return (
    <AppShell activeRoute={route} onNavigate={setRoute}>
      {renderPageContent()}
    </AppShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainContent />
      </ToastProvider>
    </AuthProvider>
  );
}
