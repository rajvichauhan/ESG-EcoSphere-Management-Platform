import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Factory,
  Globe,
  Building2,
  TreePine,
  LineChart,
  Target,
  HeartHandshake,
  Users,
  GraduationCap,
  ShieldCheck,
  FileCheck,
  Trophy,
  Award,
  FileSpreadsheet,
  Zap,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  Menu,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { notificationsApi } from '../../api';
import type { AppNotification } from '../../types';
import { MockStorage } from '../../api/mockData';

export interface AppShellProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

interface NavGroup {
  groupLabel: string;
  items: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    roles?: string[];
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Overview',
    items: [
      { key: 'dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    groupLabel: 'Environmental',
    items: [
      { key: 'carbon-calculator', label: 'Carbon Calculator', icon: <TreePine size={18} /> },
      { key: 'carbon-references', label: 'Carbon References', icon: <LineChart size={18} /> },
      { key: 'product-carbon', label: 'Product Footprints', icon: <Factory size={18} /> },
      { key: 'goals', label: 'Environmental Goals', icon: <Target size={18} /> },
    ],
  },
  {
    groupLabel: 'Social',
    items: [
      { key: 'csr-activities', label: 'CSR Activities', icon: <HeartHandshake size={18} /> },
      { key: 'diversity', label: 'Diversity & Inclusion', icon: <Users size={18} /> },
      { key: 'training', label: 'Training & Development', icon: <GraduationCap size={18} /> },
    ],
  },
  {
    groupLabel: 'Governance',
    items: [
      { key: 'policies', label: 'Policy Management', icon: <ShieldCheck size={18} /> },
      { key: 'audits', label: 'Audits & Compliance', icon: <FileCheck size={18} /> },
    ],
  },
  {
    groupLabel: 'Gamification & Reports',
    items: [
      { key: 'gamification', label: 'Challenges & Rewards', icon: <Trophy size={18} /> },
      { key: 'leaderboard', label: 'Leaderboard', icon: <Award size={18} /> },
      { key: 'reports', label: 'Reports & Intelligence', icon: <FileSpreadsheet size={18} /> },
      { key: 'ai-assistant', label: 'AI ESG Assistant', icon: <Zap size={18} /> },
    ],
  },
  {
    groupLabel: 'Organization Setup',
    items: [
      { key: 'hierarchy', label: 'Departments & Hierarchy', icon: <Building2 size={18} /> },
      { key: 'facilities', label: 'Facilities Management', icon: <Factory size={18} /> },
      { key: 'city-profiles', label: 'City Profiles', icon: <Globe size={18} /> },
      { key: 'settings', label: 'ESG Config & Settings', icon: <Settings size={18} /> },
    ],
  },
  {
    groupLabel: 'Admin',
    items: [
      { key: 'sub-admins', label: 'Sub-Admin Permissions', icon: <ShieldAlert size={18} />, roles: ['master_admin', 'org_admin'] },
    ],
  },
];

export const AppShell: React.FC<AppShellProps> = ({ activeRoute, onNavigate, children }) => {
  const { user, roles, logout, switchUserMock } = useAuth();
  const { showToast } = useToast();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ecosphere_sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('ecosphere_theme') as 'light' | 'dark') || 'light');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ecosphere_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ecosphere_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  useEffect(() => {
    if (user) {
      notificationsApi.list().then((list: AppNotification[]) => setNotifications(list)).catch(() => {});
    }
  }, [user]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? updated : n)));
    } catch {
      showToast('Could not mark notification read', 'error');
    }
  };

  const allDemoUsers = MockStorage.get<any[]>('users', []);

  // Find label for active route
  let routeLabel = 'Dashboard';
  for (const grp of NAV_GROUPS) {
    const found = grp.items.find((i) => i.key === activeRoute);
    if (found) {
      routeLabel = found.label;
      break;
    }
  }

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className="app-sidebar glass-panel"
        style={{
          width: collapsed ? '76px' : '260px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRight: '1px solid var(--border-glass)',
          position: mobileOpen ? 'fixed' : 'relative',
          left: mobileOpen ? 0 : undefined,
          zIndex: 1000,
          background: 'var(--bg-glass)',
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: '20px 16px',
            borderBottom: '1px solid var(--border-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, hsl(162, 75%, 40%), hsl(215, 70%, 55%))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px hsla(162, 75%, 40%, 0.3)',
                flexShrink: 0,
              }}
            >
              <TreePine size={22} />
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.3px', background: 'linear-gradient(135deg, hsl(162, 75%, 40%), hsl(215, 70%, 65%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  EcoSphere
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ESG Platform
                </span>
              </div>
            )}
          </div>
          <button
            className="btn-icon hidden-mobile"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {NAV_GROUPS.map((grp, gIdx) => {
            // Check permissions for group items
            const allowedItems = grp.items.filter((item) => {
              if (!item.roles || item.roles.length === 0) return true;
              if (roles.includes('master_admin')) return true;
              return item.roles.some((r) => roles.includes(r as any));
            });

            if (allowedItems.length === 0) return null;

            return (
              <div key={gIdx} style={{ marginBottom: '16px' }}>
                {!collapsed && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      padding: '6px 12px',
                      marginBottom: '4px',
                    }}
                  >
                    {grp.groupLabel}
                  </div>
                )}
                {allowedItems.map((item) => {
                  const isActive = activeRoute === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onNavigate(item.key);
                        setMobileOpen(false);
                      }}
                      title={collapsed ? item.label : undefined}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: collapsed ? '12px' : '10px 14px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        background: isActive ? 'hsla(162, 75%, 40%, 0.15)' : 'transparent',
                        color: isActive ? 'hsl(162, 75%, 40%)' : 'var(--text-main)',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '14px',
                        transition: 'all 0.15s ease',
                        marginBottom: '2px',
                      }}
                      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'hsla(var(--hue-primary), 50%, 50%, 0.06)')}
                      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ color: isActive ? 'hsl(162, 75%, 40%)' : 'var(--text-muted)', display: 'flex' }}>{item.icon}</span>
                      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                      {isActive && !collapsed && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'hsl(162, 75%, 40%)' }} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer User Info */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--color-secondary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {user ? user.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Demo User'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {roles.join(', ') || 'Employee'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <header
          className="app-header glass-panel"
          style={{
            height: '68px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '1px solid var(--border-glass)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="btn-icon mobile-only"
              onClick={() => setMobileOpen(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
            >
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>{routeLabel}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Theme Toggle Button */}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
              }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  position: 'relative',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'hsl(0, 80%, 55%)',
                      boxShadow: '0 0 0 2px var(--bg-card)',
                    }}
                  />
                )}
              </button>

              {notifOpen && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    zIndex: 1100,
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{unreadCount} unread</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => !n.read && handleMarkRead(n._id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: n.read ? 'transparent' : 'hsla(var(--hue-primary), 75%, 35%, 0.08)',
                          marginBottom: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>{n.title}</span>
                          {!n.read && <CheckCircle size={14} color="var(--color-primary)" />}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Profile & Demo Switcher */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{user?.full_name || 'Demo'}</span>
                <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {roles[0] || 'employee'}
                </span>
              </button>

              {userMenuOpen && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '240px',
                    zIndex: 1100,
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '12px',
                  }}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-glass)', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{user?.full_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 12px' }}>
                    Quick Switch Demo Role
                  </div>
                  {allDemoUsers.map((demoU) => {
                    const rName = typeof demoU.roles[0] === 'string' ? demoU.roles[0] : demoU.roles[0]?.role;
                    return (
                      <button
                        key={demoU._id}
                        onClick={() => {
                          switchUserMock(demoU._id);
                          setUserMenuOpen(false);
                          showToast(`Switched role to ${rName} (${demoU.full_name})`, 'info');
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          border: 'none',
                          background: user?._id === demoU._id ? 'hsla(var(--hue-primary), 75%, 35%, 0.12)' : 'transparent',
                          color: user?._id === demoU._id ? 'var(--color-primary)' : 'var(--text-main)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} />
                          <span>{demoU.full_name.split(' ')[0]}</span>
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          {rName}
                        </span>
                      </button>
                    );
                  })}

                  <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '8px', paddingTop: '8px' }}>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        color: 'hsl(0, 80%, 55%)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      <LogOut size={15} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Route Content */}
        <main
          className="app-main"
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--bg-card)',
            position: 'relative',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
