import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
import {
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
} from './pages';

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const [route, setRoute] = useState<string>('dashboard');
  const [publicView, setPublicView] = useState<boolean>(false);

  if (!user && !publicView) {
    return <AuthPage onSuccess={() => setRoute('dashboard')} onViewPublicPolicies={() => setPublicView(true)} />;
  }

  if (publicView) {
    return <PublicPoliciesPage onBackToLogin={() => setPublicView(false)} />;
  }

  const renderPage = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage onNavigate={setRoute} />;
      case 'carbon-calculator':
        return <CarbonCalculatorPage />;
      case 'carbon-reference':
        return <CarbonReferencesPage />;
      case 'product-footprints':
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
        return <DashboardPage onNavigate={setRoute} />;
    }
  };

  return (
    <AppShell activeRoute={route} onNavigate={setRoute}>
      {renderPage()}
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
