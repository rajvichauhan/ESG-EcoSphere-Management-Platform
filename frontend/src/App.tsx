import React, { useState, useEffect } from "react";
import {
  Building2,
  FolderTree,
  AreaChart,
  ShoppingBag,
  Link2,
  Users2,
  UserCheck,
  Zap,
  TrendingUp,
  Settings,
  Plus,
  RefreshCw,
  LogOut,
  Calendar,
  DollarSign,
  AlertTriangle,
  Award,
  Globe2,
  PackageCheck
} from "lucide-react";

// Mock API base url
const API_BASE = "http://localhost:8000/api";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState("dashboard");

  // Mock Authentication / User Role Context
  const [currentUser, setCurrentUser] = useState({
    name: "Acme Admin",
    email: "admin@acme.com",
    role: "org_admin", // org_admin or master_admin or sub_admin
    org_id: "6650a2f4762c4a929baaaa01",
    token: "mock-org-admin-token",
    scope: { is_master: false, region: ["IN"], sector: ["steel"] }
  });

  const switchUser = (role: string) => {
    if (role === "master_admin") {
      setCurrentUser({
        name: "Master Admin",
        email: "master@acme.com",
        role: "master_admin",
        org_id: "6650a2f4762c4a929baaaa01",
        token: "mock-master-admin-token",
        scope: { is_master: true, region: [], sector: [] }
      });
    } else if (role === "sub_admin") {
      setCurrentUser({
        name: "Scoped Sub Admin",
        email: "sub@acme.com",
        role: "sub_admin",
        org_id: "6650a2f4762c4a929baaaa01",
        token: "mock-sub-admin-token",
        scope: { is_master: false, region: ["IN"], sector: ["steel"] }
      });
    } else {
      setCurrentUser({
        name: "Acme Admin",
        email: "admin@acme.com",
        role: "org_admin",
        org_id: "6650a2f4762c4a929baaaa01",
        token: "mock-org-admin-token",
        scope: { is_master: false, region: [], sector: [] }
      });
    }
  };

  // Mock State Data
  const [departments, setDepartments] = useState<any[]>([
    { _id: "d1", name: "Corporate Headquarters", code: "CORP", head: { full_name: "John Doe" }, employee_count: 45, status: "active", children: [] },
    { _id: "d2", name: "Manufacturing", code: "MFG", head: { full_name: "Bob Smith" }, employee_count: 120, status: "active", children: [] },
    { _id: "d3", name: "R&D", code: "RND", head: { full_name: "Alice Johnson" }, employee_count: 35, status: "active", children: [] }
  ]);

  const [facilities, setFacilities] = useState<any[]>([
    { _id: "f1", name: "Pune Fabrication Center", country: "IN", city: "Pune", employee_count: 120, status: "active", department_id: "d2" },
    { _id: "f2", name: "Mumbai Corp HQ", country: "IN", city: "Mumbai", employee_count: 45, status: "active", department_id: "d1" }
  ]);

  const [cityProfiles, setCityProfiles] = useState<any[]>([
    { _id: "c1", country: "IN", city: "Mumbai", year: 2026, avg_commute_km_per_day: 24, working_days_per_month: 22, grid_factor_kg_per_kwh: 0.82, grid_renewable_pct: 0.22 },
    { _id: "c2", country: "IN", city: "Pune", year: 2026, avg_commute_km_per_day: 18, working_days_per_month: 22, grid_factor_kg_per_kwh: 0.71, grid_renewable_pct: 0.32 }
  ]);

  const [carbonReferences, setCarbonReferences] = useState<any[]>([
    { _id: "cr1", country: "IN", city: "Pune", product_category: "steel", product_name: "structural_beam", carbon_value: 1.85, unit: "per_kg", year: 2026, source: "Audit 2026" },
    { _id: "cr2", country: "IN", city: null, product_category: "steel", product_name: "structural_beam", carbon_value: 2.10, unit: "per_kg", year: 2026, source: "National Index" },
    { _id: "cr3", country: "IN", city: null, product_category: "steel", product_name: null, carbon_value: 2.45, unit: "per_kg", year: 2026, source: "General Steel" }
  ]);

  const [products, setProducts] = useState<any[]>([
    { _id: "p1", name: "Heavy Steel Beam A", category: "steel", production_country: "IN", production_city: "Pune", unit_price: { amount: 120, currency: "USD" }, status: "active", department_id: "d2", carbon: { per_unit_kg: 222, match_tier: 1, is_approximation: false, calculated_at: "2026-07-12T00:00:00Z" } },
    { _id: "p2", name: "Component Bracket B", category: "steel", production_country: "IN", production_city: "Mumbai", unit_price: { amount: 35, currency: "USD" }, status: "active", department_id: "d2", carbon: null }
  ]);

  const [productSales, setProductSales] = useState<any[]>([
    { _id: "s1", product_id: "p1", period: { year: 2026, month: 6 }, units_sold: 500, unit_price: { amount: 120, currency: "USD" }, revenue: { amount: 60000, currency: "USD" } }
  ]);

  const [allocations, setAllocations] = useState<any[]>([
    { _id: "a1", period: { year: 2026, month: 6 }, overhead_total_kg: 18500, revenue_total: { amount: 60000, currency: "USD" }, unallocated_kg: 0, lines: [{ product_id: "p1", revenue: { amount: 60000, currency: "USD" }, revenue_share: 1.0, allocated_kg: 18500 }], status: "current" }
  ]);

  const [productLinks, setProductLinks] = useState<any[]>([
    { _id: "pl1", requester_org_id: "org1", requester_product_id: "p2", partner_org_id: "org2", partner_product_id: "p9", link_type: "component", status: "pending", shared: null, requested_by: "u1", created_at: "2026-07-12T00:00:00Z" }
  ]);

  const [subAdmins, setSubAdmins] = useState<any[]>([
    { _id: "sa1", full_name: "Rahul Sharma", email: "rahul@acme.com", roles: [{ role: "sub_admin", scope: { kind: "region", values: ["IN"] } }] }
  ]);

  // Calculations & Readings logging states
  const [selectedFacility, setSelectedFacility] = useState("f1");
  const [electricityKwh, setElectricityKwh] = useState("");
  const [readingsList, setReadingsList] = useState<any[]>([
    { _id: "r1", facility_id: "f1", period: { year: 2026, month: 6 }, inputs: { electricity_kwh: 12000 }, computed: { commute_kg: 5800, electricity_kg: 8184, total_kg: 13984 } }
  ]);

  // Rollups live selection state
  const [rollupDept, setRollupDept] = useState("d2");
  const [rollupYear, setRollupYear] = useState(2026);
  const [rollupMonth, setRollupMonth] = useState(6);
  const [rollupData, setRollupData] = useState<any>({
    total_carbon_kg: 18484,
    emissions_kg: 18484,
    offsets_kg: 0,
    esg: { e: 78.5, s: 82.0, g: 85.0, total: 81.3 },
    xp_total: 4200,
    open_compliance_issues: 1,
    by_child: [
      { department_id: "d2", name: "Manufacturing Sub-unit A", total_carbon_kg: 13984, emissions_kg: 13984, offsets_kg: 0, xp_total: 3000 }
    ]
  });

  // Action modals / state management triggers
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", code: "", parent_id: "", employee_count: "" });

  const [showAddFacility, setShowAddFacility] = useState(false);
  const [newFacility, setNewFacility] = useState({ name: "", country: "IN", city: "", employee_count: "", department_id: "" });

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "", production_country: "IN", production_city: "", unit_price: "", department_id: "" });

  const [showAddSale, setShowAddSale] = useState(false);
  const [newSale, setNewSale] = useState({ product_id: "", units_sold: "", price: "", year: "2026", month: "6" });

  const [showGrantScope, setShowGrantScope] = useState(false);
  const [grantForm, setGrantForm] = useState({ user_email: "", kind: "region", values: "" });

  // Log reading calculations
  const handleLogReading = (e: React.FormEvent) => {
    e.preventDefault();
    const fac = facilities.find(f => f._id === selectedFacility);
    const profile = cityProfiles.find(cp => cp.city.toLowerCase() === fac.city.toLowerCase());

    if (!profile) {
      alert(`No city profile found for ${fac.city}, ${fac.country}. Please add it under City Profiles first!`);
      return;
    }

    const kwh = parseFloat(electricityKwh) || 0;
    const workingDays = profile.working_days_per_month;
    const commuteKm = profile.avg_commute_km_per_day;
    const employees = fac.employee_count;

    // Mumbai: commute = 100 * 20 * 20 * factor -> let's compute mock value
    const transportFactor = 0.08;
    const commute_kg = employees * workingDays * commuteKm * transportFactor;
    const electricity_kg = kwh * (1 - profile.grid_renewable_pct) * profile.grid_factor_kg_per_kwh;
    const total_kg = commute_kg + electricity_kg;

    const newReading = {
      _id: "r_" + Date.now(),
      facility_id: selectedFacility,
      period: { year: 2026, month: 6 },
      inputs: { electricity_kwh: kwh },
      computed: {
        commute_kg: Math.round(commute_kg),
        electricity_kg: Math.round(electricity_kg),
        total_kg: Math.round(total_kg)
      }
    };

    setReadingsList([newReading, ...readingsList]);
    setElectricityKwh("");
    alert("Facility reading computed and logged successfully!");
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = {
      _id: "d_" + Date.now(),
      name: newDept.name,
      code: newDept.code,
      head: { full_name: "Unassigned" },
      employee_count: parseInt(newDept.employee_count) || 0,
      status: "active",
      parent_id: newDept.parent_id || null,
      children: []
    };
    setDepartments([...departments, doc]);
    setShowAddDept(false);
    setNewDept({ name: "", code: "", parent_id: "", employee_count: "" });
  };

  const handleCalculateProductCarbon = (productId: string) => {
    const prod = products.find(p => p._id === productId);
    // Find best match in references
    const matches = carbonReferences.filter(r => r.product_category === prod.category && r.country === prod.production_country);
    if (!matches.length) {
      alert("No carbon reference match found for product category!");
      return;
    }
    const match = matches[0]; // Tier 1
    const updated = products.map(p => {
      if (p._id === productId) {
        return {
          ...p,
          carbon: {
            per_unit_kg: match.carbon_value * 50, // mock weight per unit conversion
            match_tier: 1,
            is_approximation: false,
            calculated_at: new Date().toISOString()
          }
        };
      }
      return p;
    });
    setProducts(updated);
    alert("Carbon intensity calculated dynamically using reference database Tiers!");
  };

  const handleRunAllocation = () => {
    // Proportional overhead allocation run mock
    const overhead = readingsList.reduce((acc, r) => acc + r.computed.total_kg, 0);
    const revTotal = productSales.reduce((acc, s) => acc + s.revenue.amount, 0);
    
    if (revTotal === 0) {
      alert("No sales revenue recorded for this period. Allocation cannot compute proportion.");
      return;
    }

    const lines = productSales.map(s => {
      const share = s.revenue.amount / revTotal;
      return {
        product_id: s.product_id,
        revenue: s.revenue,
        revenue_share: share,
        allocated_kg: Math.round(overhead * share)
      };
    });

    const newAlloc = {
      _id: "a_" + Date.now(),
      period: { year: 2026, month: 6 },
      overhead_total_kg: overhead,
      revenue_total: { amount: revTotal, currency: "USD" },
      unallocated_kg: 0,
      lines: lines,
      status: "current"
    };

    setAllocations([newAlloc, ...allocations]);
    alert("Overhead allocation run executed proportionally for current period sales!");
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">E</div>
          <div className="logo-text">EcoSphere</div>
        </div>

        <nav style={{ flexGrow: 1 }}>
          <div className="nav-group">
            <div className="nav-label">Core Operations</div>
            <a href="#" className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
              <AreaChart size={18} /> Dashboard
            </a>
            <a href="#" className={`nav-link ${activeTab === "departments" ? "active" : ""}`} onClick={() => setActiveTab("departments")}>
              <FolderTree size={18} /> Corporate Hierarchy
            </a>
            <a href="#" className={`nav-link ${activeTab === "rollups" ? "active" : ""}`} onClick={() => setActiveTab("rollups")}>
              <TrendingUp size={18} /> Subtree Rollups
            </a>
          </div>

          <div className="nav-group">
            <div className="nav-label">ESG Assets</div>
            <a href="#" className={`nav-link ${activeTab === "facilities" ? "active" : ""}`} onClick={() => setActiveTab("facilities")}>
              <Building2 size={18} /> Facilities & Commute
            </a>
            <a href="#" className={`nav-link ${activeTab === "products" ? "active" : ""}`} onClick={() => setActiveTab("products")}>
              <ShoppingBag size={18} /> Products registry
            </a>
            <a href="#" className={`nav-link ${activeTab === "allocation" ? "active" : ""}`} onClick={() => setActiveTab("allocation")}>
              <Zap size={18} /> Overhead Allocation
            </a>
            <a href="#" className={`nav-link ${activeTab === "links" ? "active" : ""}`} onClick={() => setActiveTab("links")}>
              <Link2 size={18} /> Supplier Links
            </a>
          </div>

          {(currentUser.role === "master_admin" || currentUser.role === "sub_admin") && (
            <div className="nav-group">
              <div className="nav-label">Administration</div>
              <a href="#" className={`nav-link ${activeTab === "subadmins" ? "active" : ""}`} onClick={() => setActiveTab("subadmins")}>
                <Users2 size={18} /> Sub-Admin Scopes
              </a>
            </div>
          )}
        </nav>

        {/* User Gating Panel */}
        <div style={{ marginTop: "auto", borderTop: "1px solid #ffffff20", paddingTop: "20px" }}>
          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Active Role Gating</span>
            <select
              value={currentUser.role}
              onChange={(e) => switchUser(e.target.value)}
              style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "white" }}
            >
              <option value="org_admin" style={{ color: "black" }}>Org Admin (Full Access)</option>
              <option value="sub_admin" style={{ color: "black" }}>Scoped Sub-Admin (IN Region / Steel)</option>
              <option value="master_admin" style={{ color: "black" }}>Master Admin (Global Config)</option>
            </select>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              User: <strong>{currentUser.name}</strong>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Panel */}
      <main className="main-content">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div className="page-title">Operational ESG Dashboard</div>
            <div className="page-subtitle">Acme Corp Sustainability Platform Overview</div>

            <div className="metrics-grid">
              <div className="glass-card">
                <div className="metric-label">Total Scope 1 & 2 Emissions</div>
                <div className="metric-value" style={{ color: "var(--color-primary-light)" }}>22,984 <span style={{ fontSize: "14px" }}>kg CO2e</span></div>
                <div className="metric-trend" style={{ color: "hsl(150, 85%, 28%)" }}>-4.2% from last month</div>
              </div>
              <div className="glass-card">
                <div className="metric-label">Manufacturing Carbon</div>
                <div className="metric-value" style={{ color: "var(--color-secondary)" }}>4,500 <span style={{ fontSize: "14px" }}>kg CO2e</span></div>
                <div className="metric-trend">1 Product active</div>
              </div>
              <div className="glass-card">
                <div className="metric-label">HQ Energy Efficiency</div>
                <div className="metric-value" style={{ color: "var(--color-accent)" }}>78.5%</div>
                <div className="metric-trend" style={{ color: "hsl(150, 85%, 28%)" }}><Award size={14} /> Platinum rating</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "32px", marginBottom: "40px" }}>
              <h3>Carbon Intensity Trend</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>Active locations rollup footprint across all organization nodes.</p>
              
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {facilities.map(f => (
                  <div key={f._id} className="glass-card" style={{ flex: "1 1 300px" }}>
                    <h4>{f.name}</h4>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{f.city}, {f.country}</span>
                    <div style={{ fontSize: "24px", fontWeight: 700, margin: "10px 0" }}>
                      {readingsList.filter(r => r.facility_id === f._id).reduce((sum, current) => sum + current.computed.total_kg, 0).toLocaleString()} kg CO2e
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Commute & Grid electricity combined.</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CORPORATE HIERARCHY */}
        {activeTab === "departments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <div className="page-title">Corporate Hierarchy</div>
                <div className="page-subtitle">Manage organization structure, nested subtrees, and heads of departments.</div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddDept(true)}>
                <Plus size={16} /> Add Department
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Dept Name</th>
                    <th>Code</th>
                    <th>Subtree Ancestors</th>
                    <th>Employee Count</th>
                    <th>Dept Head</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept._id}>
                      <td style={{ fontWeight: 600 }}>{dept.name}</td>
                      <td><code>{dept.code}</code></td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {dept.parent_id ? `Parent: ${dept.parent_id}` : "Root Department"}
                      </td>
                      <td>{dept.employee_count}</td>
                      <td>{dept.head?.full_name || "Unassigned"}</td>
                      <td><span className="badge badge-success">{dept.status}</span></td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px" }}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showAddDept && (
              <div className="modal-overlay">
                <div className="modal-content glass-panel">
                  <div className="modal-header">
                    <h3>Add Department</h3>
                    <button className="btn btn-secondary" onClick={() => setShowAddDept(false)}>X</button>
                  </div>
                  <form onSubmit={handleAddDept}>
                    <div className="modal-body">
                      <label>Department Name</label>
                      <input type="text" required value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} style={{ marginBottom: "16px" }} />

                      <label>Department Code</label>
                      <input type="text" required value={newDept.code} onChange={e => setNewDept({ ...newDept, code: e.target.value })} style={{ marginBottom: "16px" }} />

                      <label>Parent Department (Optional)</label>
                      <select value={newDept.parent_id} onChange={e => setNewDept({ ...newDept, parent_id: e.target.value })} style={{ marginBottom: "16px" }}>
                        <option value="">No Parent (Root Node)</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>

                      <label>Initial Employee Count</label>
                      <input type="number" required value={newDept.employee_count} onChange={e => setNewDept({ ...newDept, employee_count: e.target.value })} />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAddDept(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save Department</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: LIVE SUBTREE ROLLUPS */}
        {activeTab === "rollups" && (
          <div>
            <div className="page-title">Subtree Aggregation & Rollups</div>
            <div className="page-subtitle">Aggregate real-time ESG metrics dynamically for any selected node in the hierarchy.</div>

            <div className="glass-panel" style={{ padding: "32px", marginBottom: "40px" }}>
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label>Target Department Tree Node</label>
                  <select value={rollupDept} onChange={e => setRollupDept(e.target.value)}>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Period Year</label>
                  <select value={rollupYear} onChange={e => setRollupYear(parseInt(e.target.value))}>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
                <div>
                  <label>Period Month</label>
                  <select value={rollupMonth} onChange={e => setRollupMonth(parseInt(e.target.value))}>
                    <option value="6">June</option>
                    <option value="5">May</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={() => {
                  alert("Live query executed. Root aggregates compiled dynamically!");
                }}>
                  <RefreshCw size={16} /> Aggregate Rollups
                </button>
              </div>
            </div>

            <div className="metrics-grid">
              <div className="glass-card">
                <div className="metric-label">Aggregated Carbon Footprint</div>
                <div className="metric-value" style={{ color: "var(--color-primary-light)" }}>{rollupData.total_carbon_kg.toLocaleString()} <span style={{ fontSize: "14px" }}>kg CO2e</span></div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Includes all child departments</div>
              </div>
              <div className="glass-card">
                <div className="metric-label">Average ESG Score</div>
                <div className="metric-value" style={{ color: "var(--color-secondary)" }}>{rollupData.esg.total}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>E: {rollupData.esg.e} | S: {rollupData.esg.s} | G: {rollupData.esg.g}</div>
              </div>
              <div className="glass-card">
                <div className="metric-label">Accumulated gamification XP</div>
                <div className="metric-value" style={{ color: "var(--color-accent)" }}>{rollupData.xp_total.toLocaleString()}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Subtree total delta</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "32px" }}>
              <h3>Sub-Department Contributions</h3>
              <div className="table-container" style={{ marginTop: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Child Department</th>
                      <th>Direct Carbon Contribution</th>
                      <th>Emissions</th>
                      <th>Offsets</th>
                      <th>XP Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollupData.by_child.map((child: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{child.name}</td>
                        <td>{child.total_carbon_kg.toLocaleString()} kg CO2e</td>
                        <td>{child.emissions_kg.toLocaleString()} kg</td>
                        <td>{child.offsets_kg.toLocaleString()} kg</td>
                        <td>+{child.xp_total} XP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: FACILITIES & COMMUTE READINGS */}
        {activeTab === "facilities" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <div className="page-title">Facilities & Activity Logs</div>
                <div className="page-subtitle">Enter monthly energy profiles and trigger commute carbon computations.</div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddFacility(true)}>
                <Plus size={16} /> Register Facility
              </button>
            </div>

            <div className="glass-panel" style={{ padding: "32px", marginBottom: "40px" }}>
              <h3>Log Monthly Facility Activity</h3>
              <form onSubmit={handleLogReading} style={{ marginTop: "20px", display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label>Select Corporate Office/HQ</label>
                  <select value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)}>
                    {facilities.map(f => (
                      <option key={f._id} value={f._id}>{f.name} ({f.city}, {f.country})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label>Electricity Grid Consumption (kWh)</label>
                  <input type="number" required placeholder="e.g. 12000" value={electricityKwh} onChange={e => setElectricityKwh(e.target.value)} />
                </div>
                <div>
                  <label>Reporting Month</label>
                  <select disabled style={{ opacity: 0.7 }}>
                    <option>June 2026</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  Compute & Save Logs
                </button>
              </form>
            </div>

            <h3>Monthly Reading Records</h3>
            <div className="table-container" style={{ marginTop: "20px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Period</th>
                    <th>Electricity Input</th>
                    <th>Electricity Carbon</th>
                    <th>Employee Transit Carbon</th>
                    <th>Total Scope 1+2</th>
                  </tr>
                </thead>
                <tbody>
                  {readingsList.map((reading) => {
                    const fac = facilities.find(f => f._id === reading.facility_id);
                    return (
                      <tr key={reading._id}>
                        <td style={{ fontWeight: 600 }}>{fac?.name}</td>
                        <td>{reading.period.month}/{reading.period.year}</td>
                        <td>{reading.inputs.electricity_kwh.toLocaleString()} kWh</td>
                        <td style={{ color: "hsl(0, 75%, 55%)" }}>{reading.computed.electricity_kg.toLocaleString()} kg</td>
                        <td style={{ color: "hsl(0, 75%, 55%)" }}>{reading.computed.commute_kg.toLocaleString()} kg</td>
                        <td style={{ fontWeight: 700, color: "var(--color-primary-light)" }}>
                          {reading.computed.total_kg.toLocaleString()} kg CO2e
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showAddFacility && (
              <div className="modal-overlay">
                <div className="modal-content glass-panel">
                  <div className="modal-header">
                    <h3>Register New Facility</h3>
                    <button className="btn btn-secondary" onClick={() => setShowAddFacility(false)}>X</button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newF = {
                      _id: "f_" + Date.now(),
                      name: newFacility.name,
                      country: newFacility.country,
                      city: newFacility.city,
                      employee_count: parseInt(newFacility.employee_count) || 0,
                      status: "active",
                      department_id: newFacility.department_id || null
                    };
                    setFacilities([...facilities, newF]);
                    setShowAddFacility(false);
                    setNewFacility({ name: "", country: "IN", city: "", employee_count: "", department_id: "" });
                  }}>
                    <div className="modal-body">
                      <label>Facility/Office Name</label>
                      <input type="text" required value={newFacility.name} onChange={e => setNewFacility({ ...newFacility, name: e.target.value })} style={{ marginBottom: "16px" }} />

                      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                        <div style={{ flex: 1 }}>
                          <label>Country Code (ISO 2-char)</label>
                          <input type="text" required maxLength={2} value={newFacility.country} onChange={e => setNewFacility({ ...newFacility, country: e.target.value })} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label>City Location</label>
                          <input type="text" required value={newFacility.city} onChange={e => setNewFacility({ ...newFacility, city: e.target.value })} />
                        </div>
                      </div>

                      <label>Employee Base Count</label>
                      <input type="number" required value={newFacility.employee_count} onChange={e => setNewFacility({ ...newFacility, employee_count: e.target.value })} style={{ marginBottom: "16px" }} />

                      <label>Owning Department</label>
                      <select value={newFacility.department_id} onChange={e => setNewFacility({ ...newFacility, department_id: e.target.value })}>
                        <option value="">Select department...</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAddFacility(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save Facility</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: PRODUCTS REGISTRY & CALCULATION */}
        {activeTab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <div className="page-title">Products ESG Profiles</div>
                <div className="page-subtitle">Registry of manufactured goods, carbon intensity lookups, and outputs records.</div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddProduct(true)}>
                <Plus size={16} /> Register Product
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Unit Price</th>
                    <th>Carbon Intensity</th>
                    <th>Lookup Tier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => (
                    <tr key={prod._id}>
                      <td style={{ fontWeight: 600 }}>{prod.name}</td>
                      <td><code>{prod.category}</code></td>
                      <td>{prod.production_city}, {prod.production_country}</td>
                      <td>{prod.unit_price.amount} {prod.unit_price.currency}</td>
                      <td style={{ fontWeight: 700 }}>
                        {prod.carbon ? `${prod.carbon.per_unit_kg} kg CO2e / unit` : (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not Calculated</span>
                        )}
                      </td>
                      <td>
                        {prod.carbon ? (
                          <span className={`badge ${prod.carbon.match_tier === 0 ? "badge-info" : "badge-success"}`}>
                            {prod.carbon.match_tier === 0 ? "Adopted link" : `Tier ${prod.carbon.match_tier}`}
                          </span>
                        ) : "N/A"}
                      </td>
                      <td style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleCalculateProductCarbon(prod._id)}>
                          Calculate Carbon
                        </button>
                        <button className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => {
                          const qty = prompt("Enter quantity units produced for June 2026:");
                          if (qty) {
                            alert(`Recorded production. Generated carbon ledger tx: ${parseFloat(qty) * (prod.carbon?.per_unit_kg || 0)} kg CO2e`);
                          }
                        }}>
                          Log Production
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showAddProduct && (
              <div className="modal-overlay">
                <div className="modal-content glass-panel">
                  <div className="modal-header">
                    <h3>Register New Product</h3>
                    <button className="btn btn-secondary" onClick={() => setShowAddProduct(false)}>X</button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newP = {
                      _id: "p_" + Date.now(),
                      name: newProduct.name,
                      category: newProduct.category,
                      production_country: newProduct.production_country,
                      production_city: newProduct.production_city,
                      unit_price: { amount: parseFloat(newProduct.unit_price) || 0, currency: "USD" },
                      status: "active",
                      department_id: newProduct.department_id || null,
                      carbon: null
                    };
                    setProducts([...products, newP]);
                    setShowAddProduct(false);
                    setNewProduct({ name: "", category: "", production_country: "IN", production_city: "", unit_price: "", department_id: "" });
                  }}>
                    <div className="modal-body">
                      <label>Product Name</label>
                      <input type="text" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} style={{ marginBottom: "16px" }} />

                      <label>Product Category</label>
                      <input type="text" required placeholder="e.g. steel, electronics" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} style={{ marginBottom: "16px" }} />

                      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                        <div style={{ flex: 1 }}>
                          <label>Country Code (ISO 2-char)</label>
                          <input type="text" required maxLength={2} value={newProduct.production_country} onChange={e => setNewProduct({ ...newProduct, production_country: e.target.value })} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label>Production City</label>
                          <input type="text" required value={newProduct.production_city} onChange={e => setNewProduct({ ...newProduct, production_city: e.target.value })} />
                        </div>
                      </div>

                      <label>Unit Sales Price (USD)</label>
                      <input type="number" required value={newProduct.unit_price} onChange={e => setNewProduct({ ...newProduct, unit_price: e.target.value })} style={{ marginBottom: "16px" }} />

                      <label>Owning Department</label>
                      <select value={newProduct.department_id} onChange={e => setNewProduct({ ...newProduct, department_id: e.target.value })}>
                        <option value="">Select department...</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAddProduct(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save Product</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: OVERHEAD ALLOCATION */}
        {activeTab === "allocation" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <div className="page-title">Overhead Allocation</div>
                <div className="page-subtitle">Distribute operational facility emissions to products proportionally by revenue.</div>
              </div>
              <button className="btn btn-primary" onClick={handleRunAllocation}>
                <RefreshCw size={16} /> Run Allocation
              </button>
            </div>

            <div className="glass-panel" style={{ padding: "32px", marginBottom: "40px" }}>
              <h3>Current Allocations List</h3>
              <div className="table-container" style={{ marginTop: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Overhead emissions (Total)</th>
                      <th>Revenue (Total)</th>
                      <th>Allocation breakdown</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc) => (
                      <tr key={alloc._id}>
                        <td>{alloc.period.month}/{alloc.period.year}</td>
                        <td>{alloc.overhead_total_kg.toLocaleString()} kg CO2e</td>
                        <td>{alloc.revenue_total.amount.toLocaleString()} {alloc.revenue_total.currency}</td>
                        <td>
                          {alloc.lines.map((l: any, i: number) => {
                            const p = products.find(prod => prod._id === l.product_id);
                            return (
                              <div key={i} style={{ fontSize: "13px" }}>
                                <strong>{p?.name}</strong>: {l.allocated_kg.toLocaleString()} kg ({(l.revenue_share * 100).toFixed(1)}% share)
                              </div>
                            );
                          })}
                        </td>
                        <td><span className="badge badge-success">{alloc.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: SUPPLIER LINKS */}
        {activeTab === "links" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <div className="page-title">Supplier Partner Links</div>
                <div className="page-subtitle">Establish links with supplier products to adopt real-time lifecycle carbon snapshots.</div>
              </div>
              <button className="btn btn-primary" onClick={() => {
                const partner_prod = prompt("Enter supplier partner product ID:");
                if (partner_prod) {
                  const newLink = {
                    _id: "pl_" + Date.now(),
                    requester_org_id: "org1",
                    requester_product_id: "p2",
                    partner_org_id: "org2",
                    partner_product_id: partner_prod,
                    link_type: "component",
                    status: "pending",
                    shared: null,
                    requested_by: "u1",
                    created_at: new Date().toISOString()
                  };
                  setProductLinks([...productLinks, newLink]);
                  alert("Supplier partner link request submitted successfully!");
                }
              }}>
                <Plus size={16} /> Link Supplier Product
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Local Product ID</th>
                    <th>Partner Org</th>
                    <th>Partner Product ID</th>
                    <th>Link Type</th>
                    <th>Status</th>
                    <th>Shared Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productLinks.map((link) => (
                    <tr key={link._id}>
                      <td>{link.requester_product_id}</td>
                      <td>Acme Partner Inc.</td>
                      <td><code>{link.partner_product_id}</code></td>
                      <td><code>{link.link_type}</code></td>
                      <td>
                        <span className={`badge ${link.status === "pending" ? "badge-warning" : "badge-success"}`}>
                          {link.status}
                        </span>
                      </td>
                      <td>
                        {link.shared ? `${link.shared.value_kg} kg CO2e / unit` : "None"}
                      </td>
                      <td style={{ display: "flex", gap: "8px" }}>
                        {link.status === "pending" && (
                          <>
                            <button className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => {
                              const updated = productLinks.map(l => {
                                if (l._id === link._id) {
                                  return { ...l, status: "confirmed", shared: { value_kg: 85.5, mode: "partner_per_unit_carbon", snapshot_at: new Date().toISOString() } };
                                }
                                return l;
                              });
                              setProductLinks(updated);
                              alert("Supplier partner confirmed and locked carbon footprint snapshot!");
                            }}>
                              Accept Partner Value
                            </button>
                          </>
                        )}
                        {link.status === "confirmed" && (
                          <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => {
                            // Adopt the carbon
                            const updatedProds = products.map(p => {
                              if (p._id === link.requester_product_id) {
                                return {
                                  ...p,
                                  carbon: {
                                    per_unit_kg: link.shared.value_kg,
                                    match_tier: 0,
                                    is_approximation: false,
                                    calculated_at: new Date().toISOString(),
                                    source_link_id: link._id
                                  }
                                };
                              }
                              return p;
                            });
                            setProducts(updatedProds);
                            alert("Supplier carbon value adopted for local product registry!");
                          }}>
                            Adopt In Registry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 8: SUB-ADMIN SCOPES */}
        {activeTab === "subadmins" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <div className="page-title">Sub-Admin Authorization Scopes</div>
                <div className="page-subtitle">Master Admin can assign specific region or sector permissions to sub-admins.</div>
              </div>
              {currentUser.role === "master_admin" && (
                <button className="btn btn-primary" onClick={() => setShowGrantScope(true)}>
                  <Plus size={16} /> Grant Admin Scope
                </button>
              )}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sub-Admin Name</th>
                    <th>Email Address</th>
                    <th>Scope Type</th>
                    <th>Authorized Values</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subAdmins.map((sub, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{sub.full_name}</td>
                      <td>{sub.email}</td>
                      <td><code>{sub.roles[0].scope.kind}</code></td>
                      <td>
                        {sub.roles[0].scope.values.map((v: string) => (
                          <span key={v} className="badge badge-info" style={{ marginRight: "4px" }}>{v}</span>
                        ))}
                      </td>
                      <td>
                        {currentUser.role === "master_admin" && (
                          <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => {
                            setSubAdmins(subAdmins.filter(sa => sa._id !== sub._id));
                          }}>
                            Revoke Scope
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showGrantScope && (
              <div className="modal-overlay">
                <div className="modal-content glass-panel">
                  <div className="modal-header">
                    <h3>Grant Sub-Admin Scope</h3>
                    <button className="btn btn-secondary" onClick={() => setShowGrantScope(false)}>X</button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newSa = {
                      _id: "sa_" + Date.now(),
                      full_name: grantForm.user_email.split("@")[0],
                      email: grantForm.user_email,
                      roles: [{ role: "sub_admin", scope: { kind: grantForm.kind, values: grantForm.values.split(",") } }]
                    };
                    setSubAdmins([...subAdmins, newSa]);
                    setShowGrantScope(false);
                    setGrantForm({ user_email: "", kind: "region", values: "" });
                  }}>
                    <div className="modal-body">
                      <label>User Email Address</label>
                      <input type="email" required value={grantForm.user_email} onChange={e => setGrantForm({ ...grantForm, user_email: e.target.value })} style={{ marginBottom: "16px" }} />

                      <label>Scope Kind</label>
                      <select value={grantForm.kind} onChange={e => setGrantForm({ ...grantForm, kind: e.target.value })} style={{ marginBottom: "16px" }}>
                        <option value="region">Region Scope (gated by country code)</option>
                        <option value="sector">Sector Scope (gated by product category)</option>
                      </select>

                      <label>Authorized Values (comma separated)</label>
                      <input type="text" required placeholder="e.g. IN,US or steel,electronics" value={grantForm.values} onChange={e => setGrantForm({ ...grantForm, values: e.target.value })} />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowGrantScope(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Grant Authorization</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
