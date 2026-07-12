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
import { notificationsApi, USE_MOCKS } from '../../api';
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
  const { user, roles, switchUserMock } = useAuth();
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
    <div className="app-shell" style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      {/* Sidebar Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: collapsed ? '72px' : '250px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), left 0.2s ease',
          borderRight: '1px solid var(--border-subtle)',
          zIndex: 1000,
          background: 'var(--bg-card)',
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
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '1px solid var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
                flexShrink: 0,
              }}
            >
              <TreePine size={18} />
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                  EcoSphere
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ESG Platform
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              className="btn-icon"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              style={{ padding: '4px' }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {collapsed && (
            <button
              className="btn-icon"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              style={{ padding: '4px', position: 'absolute', right: '-12px', top: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '50%' }}
            >
              <ChevronRight size={12} />
            </button>
          )}
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
                      fontSize: '9px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '4px 12px',
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
                        gap: '10px',
                        padding: collapsed ? '10px' : '8px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        background: isActive ? 'var(--bg-surface)' : 'transparent',
                        color: isActive ? 'var(--accent-blue)' : 'var(--text-main)',
                        border: 'none',
                        borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                        borderRadius: 0,
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.85rem',
                        transition: 'var(--transition-fast)',
                        marginBottom: '2px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)', display: 'flex' }}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer User Info */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '11px',
                flexShrink: 0,
              }}
            >
              {user ? user.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Demo User'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {roles[0] || 'Employee'}
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
          className="app-header"
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn-icon mobile-only"
              onClick={() => setMobileOpen(true)}
              style={{ padding: '4px' }}
            >
              <Menu size={18} />
            </button>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
              {routeLabel}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme Toggle Button */}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              style={{
                width: 32,
                height: 32,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  width: 32,
                  height: 32,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-card)',
                  position: 'relative',
                }}
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--accent-red)',
                    }}
                  />
                )}
              </button>

              {notifOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '300px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    zIndex: 1100,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    padding: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notifications</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{unreadCount} unread</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => !n.read && handleMarkRead(n._id)}
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--border-subtle)',
                          background: n.read ? 'transparent' : 'var(--bg-surface)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>{n.title}</span>
                          {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)' }} />}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
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
                  gap: '6px',
                  padding: '4px 10px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  height: 32,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                <span>{user?.full_name ? user.full_name.split(' ')[0] : 'Demo'}</span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }} />
              </button>

              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '230px',
                    zIndex: 1100,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    padding: '8px',
                  }}
                >
                  <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>{user?.full_name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                  </div>

                  {USE_MOCKS && (
                    <>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.05em' }}>
                        Switch Role (Demo)
                      </div>
                      {allDemoUsers.map((demoU) => {
                        const rName = typeof demoU.roles[0] === 'string' ? demoU.roles[0] : demoU.roles[0]?.role;
                        const isCurrent = user?._id === demoU._id;
                        return (
                          <button
                            key={demoU._id}
                            onClick={() => {
                              switchUserMock(demoU._id);
                              setUserMenuOpen(false);
                              showToast(`Switched role to ${rName}`, 'info');
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              border: 'none',
                              background: isCurrent ? 'var(--bg-surface)' : 'transparent',
                              color: isCurrent ? 'var(--accent-blue)' : 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '11px',
                              textAlign: 'left',
                              marginBottom: '2px',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <UserCheck size={12} />
                              <span>{demoU.full_name.split(' ')[0]}</span>
                            </span>
                            <span className="badge" style={{ fontSize: '9px', padding: '1px 4px' }}>
                              {rName}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '8px', paddingTop: '6px' }}>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('logout');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <LogOut size={12} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Route Content */}
        <main
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: 'var(--bg-app)',
            position: 'relative',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
