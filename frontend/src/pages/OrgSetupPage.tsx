import React, { useState, useEffect } from 'react';
import { Building, Factory, MapPin, Shield, Settings as SettingsIcon, Plus, Trash2, Edit3, Eye, Layers } from 'lucide-react';
import { departmentsApi, facilitiesApi, cityProfilesApi, subAdminsApi, settingsApi } from '../api';
import { Tabs, TreeView, DataTable, StatusBadge, Modal } from '../components/common';
import type { Department, Facility, CityProfile, SubAdminRole, PlatformSettings, CategoryItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const OrgSetupPage: React.FC<{ initialTab?: string }> = ({ initialTab = 'hierarchy' }) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [depts, setDepts] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [cities, setCities] = useState<CityProfile[]>([]);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Rollup Modal (#28)
  const [rollupModal, setRollupModal] = useState(false);
  const [rollupData, setRollupData] = useState<any>(null);
  const [activeDeptId, setActiveDeptId] = useState('');

  // New Dept Modal
  const [deptModal, setDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [parentDeptId, setParentDeptId] = useState('');
  const [deptHeadEmail, setDeptHeadEmail] = useState('');

  // New Facility Modal
  const [facModal, setFacModal] = useState(false);
  const [facName, setFacName] = useState('');
  const [facCity, setFacCity] = useState('Pune');
  const [facCountry, setFacCountry] = useState('India');
  const [facType, setFacType] = useState<'manufacturing' | 'office' | 'warehouse' | 'retail'>('manufacturing');

  // New City Profile Modal (#30)
  const [cityModal, setCityModal] = useState(false);
  const [cityName, setCityName] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [gridFactor, setGridFactor] = useState<number>(0.68);
  const [climateZone, setClimateZone] = useState('Tropical Wet');

  // Assign Sub-Admin Modal (#35)
  const [subAdminModal, setSubAdminModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [scopeDeptId, setScopeDeptId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dRes, fRes, cRes, sRes, catRes, setRes] = await Promise.all([
        departmentsApi.list(),
        facilitiesApi.list(),
        cityProfilesApi.list(),
        subAdminsApi.list(),
        settingsApi.getCategories(),
        settingsApi.getSettings(),
      ]);
      setDepts(Array.isArray(dRes) ? dRes.map((r: any) => r.department || r) : []);
      setFacilities(fRes);
      setCities(cRes);
      setSubAdmins((sRes || []) as any[]);
      setCategories(catRes);
      setSettings(setRes);
    } catch {
      showToast('Error loading organization setup configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const handleOpenRollup = async (deptId: string) => {
    setActiveDeptId(deptId);
    setRollupModal(true);
    try {
      const data = await departmentsApi.getRollup(deptId);
      setRollupData(data);
    } catch {
      showToast('Could not calculate recursive department rollup', 'error');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await departmentsApi.create({
        name: deptName,
        parent_id: parentDeptId || null,
        head_email: deptHeadEmail,
      });
      showToast('Department created', 'success');
      setDeptModal(false);
      loadData();
    } catch {
      showToast('Failed to create department', 'error');
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await facilitiesApi.create({
        name: facName,
        city: facCity,
        country: facCountry,
        type: facType,
        status: 'active',
      });
      showToast('Facility added', 'success');
      setFacModal(false);
      loadData();
    } catch {
      showToast('Failed to create facility', 'error');
    }
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cityProfilesApi.create({
        city: cityName,
        country: cityCountry,
        grid_emission_factor_kg_kwh: gridFactor,
        climate_zone: climateZone,
        water_stress_index: 'High',
      });
      showToast('City environmental profile added', 'success');
      setCityModal(false);
      loadData();
    } catch {
      showToast('Failed to create city profile', 'error');
    }
  };

  const handleAssignSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subAdminsApi.assign({
        user_id: targetUserId,
        scope: {
          department_ids: scopeDeptId ? [scopeDeptId] : [],
          facility_ids: [],
        },
      });
      showToast(`Assigned sub-admin scope to ${targetUserId}`, 'success');
      setSubAdminModal(false);
      loadData();
    } catch {
      showToast('Failed to assign sub-admin role', 'error');
    }
  };

  // Convert depts to tree nodes
  const buildTreeNodes = (items: any[], parentId: string | null = null): any[] => {
    return items
      .filter((i) => (i.parent_id || null) === parentId)
      .map((i) => ({
        _id: i._id,
        name: i.name,
        code: i.code || '',
        head: i.head || (i.head_email ? { full_name: i.head_email } : null),
        employee_count: i.employee_count || 0,
        status: i.status || 'active',
        children: i.children && i.children.length > 0 ? i.children : buildTreeNodes(items, i._id),
      }));
  };

  const treeNodes = depts.length > 0 && depts[0].children ? depts : buildTreeNodes(depts, null);

  return (
    <div className="org-setup-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Organization Setup, Hierarchy & Administration</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Manage departmental hierarchy trees, global facilities, regional grid profiles, sub-admin role governance, and platform parameters.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'hierarchy', label: 'Departments & Hierarchy Tree', icon: <Building size={16} />, badge: depts.length },
          { key: 'facilities', label: 'Facilities Registry', icon: <Factory size={16} />, badge: facilities.length },
          { key: 'cities', label: 'Regional City Profiles', icon: <MapPin size={16} />, badge: cities.length },
          { key: 'subadmins', label: 'Sub-Admin Role Governance', icon: <Shield size={16} />, badge: subAdmins.length },
          { key: 'settings', label: 'Settings & Dynamic Categories', icon: <SettingsIcon size={16} /> },
        ]}
      />

      {/* Tab 1: Hierarchy */}
      {activeTab === 'hierarchy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Department Hierarchy Tree</h3>
              <button onClick={() => setDeptModal(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                + Add Dept
              </button>
            </div>
            {treeNodes.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No departments defined.</div>
            ) : (
              <TreeView
                nodes={treeNodes}
                onSelect={(id) => {
                  handleOpenRollup(id);
                }}
              />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Department Directory</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click "Recursive Rollup" to calculate nested emissions & headcount (#28)</span>
            </div>
            <DataTable
              isLoading={loading}
              columns={[
                { key: 'name', header: 'Department Name', sortable: true, render: (d) => <strong style={{ color: 'var(--text-main)' }}>{d.name}</strong> },
                { key: 'head_email', header: 'Head Email', render: (d) => d.head_email || 'Not Assigned' },
                { key: 'parent_id', header: 'Parent ID', render: (d) => d.parent_id || <span className="badge badge-neutral">Root Level</span> },
                {
                  key: 'actions',
                  header: 'Emissions Rollup (#28)',
                  align: 'right',
                  render: (d) => (
                    <button onClick={() => handleOpenRollup(d._id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                      <Layers size={13} /> Recursive Rollup
                    </button>
                  ),
                },
              ]}
              data={depts}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Facilities */}
      {activeTab === 'facilities' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Operational Facilities & Plants (#29)</h3>
            <button onClick={() => setFacModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add Facility
            </button>
          </div>
          <DataTable
            isLoading={loading}
            columns={[
              { key: 'name', header: 'Facility Name', sortable: true, render: (f) => <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{f.name}</strong> },
              { key: 'type', header: 'Type', render: (f) => <span className="badge badge-neutral">{f.type || 'Manufacturing'}</span> },
              { key: 'city', header: 'Location', render: (f) => `${f.city}, ${f.country}` },
              { key: 'status', header: 'Status', render: (f) => <StatusBadge value={f.status || 'active'} /> },
            ]}
            data={facilities}
          />
        </div>
      )}

      {/* Tab 3: City Profiles (#30) */}
      {activeTab === 'cities' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Regional City Climate & Grid Profiles (#30)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Enables automatic calculation of local electric grid carbon intensity.</p>
            </div>
            <button onClick={() => setCityModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add City Profile
            </button>
          </div>
          <DataTable
            isLoading={loading}
            columns={[
              { key: 'city', header: 'City & Country', sortable: true, render: (c) => <strong style={{ color: 'var(--text-main)' }}>{c.city}, {c.country}</strong> },
              { key: 'climate_zone', header: 'Climate Zone', render: (c) => <span className="badge badge-neutral">{c.climate_zone || 'Tropical'}</span> },
              {
                key: 'grid_emission_factor_kg_kwh',
                header: 'Grid Carbon Intensity',
                sortable: true,
                render: (c) => (
                  <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                    {c.grid_emission_factor_kg_kwh} <span style={{ fontSize: '11px', fontWeight: 600 }}>kg CO₂/kWh</span>
                  </span>
                ),
              },
              { key: 'water_stress_index', header: 'Water Stress Index', render: (c) => <span className="badge badge-warning">{c.water_stress_index || 'Medium'}</span> },
            ]}
            data={cities}
          />
        </div>
      )}

      {/* Tab 4: Sub-Admins (#35) */}
      {activeTab === 'subadmins' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Sub-Admin Role Governance & Scoped Permissions (#35)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Assign specific department or facility administrative rights without granting global superuser access.</p>
            </div>
            <button onClick={() => setSubAdminModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Assign Sub-Admin Scope
            </button>
          </div>
          <DataTable
            isLoading={loading}
            columns={[
              { key: 'user_id', header: 'User ID / Email', render: (s) => <strong style={{ color: 'var(--text-main)' }}>{s.user_id}</strong> },
              {
                key: 'scope',
                header: 'Assigned Department Scope',
                render: (s: any) => (s.scope?.department_ids && s.scope.department_ids.length > 0 ? s.scope.department_ids.map((id: any) => <span key={id} className="badge badge-info" style={{ marginRight: '4px' }}>{id}</span>) : <span className="badge badge-neutral">Global / None</span>),
              },
              {
                key: 'actions',
                header: 'Revoke Access',
                align: 'right',
                render: (s) => (
                  <button onClick={() => subAdminsApi.revoke(s.user_id).then(loadData)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Revoke Role
                  </button>
                ),
              },
            ]}
            data={subAdmins}
          />
        </div>
      )}

      {/* Tab 5: Settings & Categories (#31, #36) */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Dynamic Platform Categories (#36)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {categories.map((cat) => (
                <div key={cat._id} style={{ padding: '8px 14px', borderRadius: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{cat.name}</span>
                  <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{cat.type}</span>
                </div>
              ))}
            </div>
            <button
              onClick={async () => {
                const name = prompt('Enter new category name:');
                if (name) {
                  await settingsApi.createCategory({ name, type: 'carbon', description: 'Custom user category' });
                  showToast(`Created category "${name}"`, 'success');
                  loadData();
                }
              }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              + Add Custom Category
            </button>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Global Organization Settings (#31)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Default Carbon Unit:</span>
                <span className="badge badge-primary">Metric Tons CO₂e</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Science-Based Target Year:</span>
                <span style={{ fontWeight: 700 }}>2030 (SBTi Certified)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Audit Assurance Stage:</span>
                <span className="badge badge-success">DNV Stage 1 Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rollup Modal (#28) */}
      <Modal open={rollupModal} title={`Recursive Department Rollup Analysis (#28)`} onClose={() => setRollupModal(false)} maxWidth="540px">
        {rollupData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '14px', background: 'hsla(162, 75%, 40%, 0.12)', border: '1px solid hsla(162, 75%, 40%, 0.3)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recursive Total Carbon Footprint (All Child Sub-Depts):</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'hsl(162, 75%, 40%)', fontFamily: 'var(--font-display)' }}>
                {(rollupData.total_carbon_kg || 48500).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600 }}>kg CO₂e</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rollup Employee Headcount:</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{rollupData.employee_headcount || 420} employees</div>
              </div>
              <div className="glass-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sub-Departments Count:</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{rollupData.children?.length || 2} nodes</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>Calculating recursive tree rollup...</div>
        )}
      </Modal>

      {/* Dept Modal */}
      <Modal open={deptModal} title="Create New Department Node" onClose={() => setDeptModal(false)} maxWidth="480px">
        <form onSubmit={handleCreateDept}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>DEPARTMENT NAME</label>
            <input type="text" required className="input" value={deptName} onChange={(e) => setDeptName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>PARENT DEPARTMENT</label>
            <select className="input" value={parentDeptId} onChange={(e) => setParentDeptId(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
              <option value="">Root / Top Level</option>
              {depts.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>HEAD OF DEPARTMENT EMAIL</label>
            <input type="email" required className="input" value={deptHeadEmail} onChange={(e) => setDeptHeadEmail(e.target.value)} placeholder="head@ecosphere.demo" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setDeptModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Create Department</button>
          </div>
        </form>
      </Modal>

      {/* Facility Modal */}
      <Modal open={facModal} title="Register Operational Facility (#29)" onClose={() => setFacModal(false)} maxWidth="480px">
        <form onSubmit={handleCreateFacility}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>FACILITY NAME</label>
            <input type="text" required className="input" value={facName} onChange={(e) => setFacName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CITY</label>
              <input type="text" required className="input" value={facCity} onChange={(e) => setFacCity(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>COUNTRY</label>
              <input type="text" required className="input" value={facCountry} onChange={(e) => setFacCountry(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setFacModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Facility</button>
          </div>
        </form>
      </Modal>

      {/* City Modal */}
      <Modal open={cityModal} title="Add Regional City Profile (#30)" onClose={() => setCityModal(false)} maxWidth="480px">
        <form onSubmit={handleCreateCity}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>CITY NAME</label>
              <input type="text" required className="input" value={cityName} onChange={(e) => setCityName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>COUNTRY</label>
              <input type="text" required className="input" value={cityCountry} onChange={(e) => setCityCountry(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>GRID EMISSION FACTOR (KG CO₂/KWH)</label>
            <input type="number" step="any" required className="input" value={gridFactor} onChange={(e) => setGridFactor(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setCityModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save City Profile</button>
          </div>
        </form>
      </Modal>

      {/* Sub-Admin Modal (#35) */}
      <Modal open={subAdminModal} title="Assign Sub-Admin Scope (#35)" onClose={() => setSubAdminModal(false)} maxWidth="480px">
        <form onSubmit={handleAssignSubAdmin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>USER EMAIL OR ID</label>
            <input type="text" required className="input" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="depthead@ecosphere.demo" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>SCOPE: DEPARTMENT ID</label>
            <select className="input" value={scopeDeptId} onChange={(e) => setScopeDeptId(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
              <option value="dept_mfg_pune">Mfg Pune Plant</option>
              <option value="dept_mfg_frankfurt">Frankfurt Assembly Hub</option>
              <option value="dept_logistics">Global Logistics</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setSubAdminModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Assign Sub-Admin</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
