export type RoleType = 'master_admin' | 'org_admin' | 'dept_head' | 'employee' | 'sub_admin' | 'ngo_member';

export interface Money {
  amount: number;
  currency: string; // ISO-4217 e.g. USD, EUR, INR
}

export interface Period {
  year: number;
  month?: number;
}

export interface UserScope {
  is_master: boolean;
  region: string[]; // ISO-2 country codes e.g. ["IN", "US"]
  sector: string[]; // product categories e.g. ["steel", "electronics"]
}

export interface User {
  _id: string;
  org_id: string;
  email: string;
  full_name: string;
  department_id?: string | null;
  roles: Array<RoleType | { role: RoleType; scope?: { kind: 'region' | 'sector'; values: string[] } }>;
  status: 'active' | 'suspended' | 'invited';
  xp_total: number;
  points_balance: number;
  scope?: UserScope;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface ApiError {
  status: number;
  detail: string;
}

export interface TreeNode {
  _id: string;
  name: string;
  code: string;
  head: { _id: string; full_name: string; email: string } | null;
  employee_count: number;
  status: 'active' | 'archived';
  children: TreeNode[];
  parent_id?: string | null;
}

export interface Department {
  _id: string;
  org_id: string;
  name: string;
  code: string;
  parent_id?: string | null;
  ancestors: string[];
  head_user_id?: string | null;
  head_email?: string;
  employee_count: number;
  status: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface RollupChildEntry {
  department_id: string;
  name: string;
  total_carbon_kg: number;
  emissions_kg: number;
  offsets_kg: number;
  xp_total: number;
  [key: string]: any;
}

export interface DepartmentRollup {
  department_id: string;
  period?: Period;
  total_carbon_kg: number;
  emissions_kg: number;
  offsets_kg: number;
  esg: { e: number; s: number; g: number; total: number };
  xp_total: number;
  open_compliance_issues: number;
  direct: RollupChildEntry;
  by_child: RollupChildEntry[];
  [key: string]: any;
}

export interface Facility {
  _id: string;
  org_id: string;
  department_id?: string | null;
  name: string;
  country: string; // 2-letter
  city: string;
  employee_count: number;
  status: 'active' | 'closed' | string;
  created_at?: string;
  updated_at?: string;
  warning?: string;
  type?: string;
  [key: string]: any;
}

export interface FacilityReading {
  _id: string;
  org_id: string;
  facility_id: string;
  department_id?: string | null;
  period: { year: number; month: number };
  inputs: {
    electricity_kwh?: number;
    electricity_bill?: Money;
    employee_count_override?: number;
    [key: string]: any;
  };
  computed: {
    commute_kg: number;
    electricity_kg: number;
    total_kg: number;
    city_profile_id: string;
    is_approximation: boolean;
    assumptions: {
      avg_commute_km_per_day: number;
      transport_mix: Array<{ mode: string; share: number; factor_kg_per_km: number }>;
      grid_renewable_pct: number;
      grid_factor_kg_per_kwh: number;
      working_days_per_month: number;
      employees_used: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CityProfile {
  _id: string;
  country: string;
  city: string;
  year: number;
  avg_commute_km_per_day: number;
  transport_mix: Array<{ mode: 'car' | 'bus' | 'rail' | 'two_wheeler' | 'walk' | string; share: number; factor_kg_per_km: number }>;
  grid_renewable_pct: number;
  grid_factor_kg_per_kwh: number;
  electricity_tariff_per_kwh?: Money;
  working_days_per_month: number;
  source?: string;
  climate_zone?: string;
  grid_emission_factor_kg_kwh?: number;
  water_stress_index?: string;
  [key: string]: any;
}

export interface ProductCarbon {
  per_unit_kg: number;
  reference_id?: string | null;
  match_tier: 0 | 1 | 2 | 3 | 4 | number;
  is_approximation: boolean;
  unit: string;
  calculated_at: string;
  source_link_id?: string | null;
  [key: string]: any;
}

export interface Product {
  _id: string;
  org_id: string;
  department_id?: string | null;
  name: string;
  category: string;
  description?: string;
  production_country: string;
  production_city: string;
  unit_price: Money;
  carbon: ProductCarbon | null;
  status: 'active' | 'discontinued' | string;
  sku?: string;
  code?: string;
  unit_carbon_footprint_kg?: number;
  carbon_footprint_kg?: number;
  [key: string]: any;
}

export interface CarbonReferenceRow {
  _id: string;
  country: string;
  city: string | null;
  product_category: string;
  product_name: string | null;
  description?: string;
  year: number;
  carbon_value: number;
  unit: 'per_unit' | 'per_kg' | 'per_kwh' | string;
  source?: string;
  updated_by?: string;
  name?: string;
  category?: string;
  kg_co2_per_unit?: number;
  [key: string]: any;
}

export interface CarbonReferenceHistoryEntry {
  _id: string;
  reference_id: string;
  ref_collection?: string;
  old_value: number;
  new_value: number;
  old_source?: string;
  new_source?: string;
  changed_by?: string;
  changed_at?: string;
  reason?: string;
  [key: string]: any;
}

export interface ProductSale {
  _id: string;
  org_id: string;
  product_id: string;
  department_id?: string | null;
  period: { year: number; month: number };
  units_sold: number;
  unit_price: Money;
  revenue: Money;
  [key: string]: any;
}

export interface AllocationLine {
  product_id: string;
  revenue: Money;
  revenue_share: number;
  allocated_kg: number;
  [key: string]: any;
}

export interface Allocation {
  _id: string;
  org_id: string;
  department_id?: string | null;
  period: { year: number; month: number };
  overhead_total_kg: number;
  revenue_total: Money;
  lines: AllocationLine[];
  unallocated_kg: number;
  status: 'current' | 'superseded' | string;
  run_by?: string;
  created_at?: string;
  [key: string]: any;
}

export interface ProductLink {
  _id: string;
  requester_org_id: string;
  requester_product_id: string;
  partner_org_id: string;
  partner_product_id: string;
  link_type: 'component' | 'carbon_credit' | string;
  status: 'pending' | 'confirmed' | 'rejected' | 'revoked' | string;
  shared: { mode: string; value_kg: number; snapshot_at: string } | null;
  requested_by?: string;
  responded_by?: string;
  responded_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// Module specific inferred types
export interface EmissionFactor {
  _id: string;
  activity: string;
  item: string;
  factor_kg_per_unit: number;
  unit_label: string;
  year: number;
  source: string;
  status: 'active' | 'retired' | string;
  [key: string]: any;
}

export interface CarbonTransaction {
  _id: string;
  period: { year: number; month: number };
  department_id?: string | null;
  source_type: 'facility_reading' | 'production_record' | 'manual_entry' | 'fleet' | 'expense' | string;
  amount_kg: number;
  note?: string;
  is_approximation?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface EnvironmentalGoal {
  _id: string;
  name: string;
  department_id?: string | null;
  metric: string;
  baseline_co2_kg: number;
  target_co2_kg: number;
  current_co2_kg: number;
  unit: string;
  start_date: string;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'missed' | 'achieved' | string;
  [key: string]: any;
}

export interface CsrActivity {
  _id: string;
  title: string;
  description: string;
  category: string;
  activity_date: string;
  location: string;
  evidence_required: boolean;
  points: number;
  xp: number;
  joined_count: number;
  status: 'planned' | 'active' | 'completed' | string;
  [key: string]: any;
}

export interface EmployeeParticipation {
  _id: string;
  user_id: string;
  user_name?: string;
  activity_id?: string;
  challenge_id?: string;
  activity_title?: string;
  proof_file_ids: string[];
  points: number;
  status: 'pending' | 'approved' | 'rejected' | string;
  submitted_at: string;
  [key: string]: any;
}

export interface DiversityMetric {
  _id: string;
  department_id?: string | null;
  period: { year: number; month: number };
  dimension: 'gender' | 'age' | 'ethnicity' | 'role_level' | string;
  breakdown: Record<string, number>; // e.g. { "Female": 45, "Male": 52, "Other": 3 }
  [key: string]: any;
}

export interface Training {
  _id: string;
  title: string;
  category: string;
  duration_minutes: number;
  points: number;
  completion_count: number;
  is_completed?: boolean;
  completed_at?: string;
  completion_rate_percentage?: number;
  status?: string;
  xp_reward?: number;
  [key: string]: any;
}

export interface Policy {
  _id: string;
  title: string;
  group: string;
  version: string;
  body_text?: string;
  file_id?: string;
  published_at: string;
  status: 'published' | 'retired' | string;
  user_acknowledged?: boolean;
  acknowledged_at?: string;
  category?: string;
  updated_at?: string;
  document_url?: string;
  [key: string]: any;
}

export interface AuditRecord {
  _id: string;
  title: string;
  department_id?: string | null;
  auditor_name: string;
  audit_date: string;
  findings_summary: string;
  status: 'scheduled' | 'in_progress' | 'under_review' | 'completed' | string;
  [key: string]: any;
}

export interface ComplianceIssue {
  _id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  department_id?: string | null;
  owner_user_id: string;
  owner_name?: string;
  due_date: string; // YYYY-MM-DD
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  audit_id?: string;
  resolution_note?: string;
  [key: string]: any;
}

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  xp: number;
  points: number;
  evidence_required: boolean;
  starts_at: string;
  deadline: string;
  status: 'draft' | 'active' | 'under_review' | 'completed' | 'archived' | string;
  joined?: boolean;
  [key: string]: any;
}

export interface Badge {
  _id: string;
  name: string;
  description: string;
  icon_url?: string;
  unlock_rule: string;
  progress_pct: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  [key: string]: any;
}

export interface Reward {
  _id: string;
  name: string;
  description: string;
  cost_points: number;
  stock: number;
  image_url?: string;
  [key: string]: any;
}

export interface LeaderboardEntry {
  rank: number;
  entity_id: string;
  name: string;
  xp: number;
  department_name?: string;
  is_current_user?: boolean;
  [key: string]: any;
}

export interface AppNotification {
  _id: string;
  type: 'compliance_raised' | 'compliance_overdue' | 'csr_decision' | 'challenge_decision' | 'policy_reminder' | 'badge_unlock' | string;
  title: string;
  message: string;
  read: boolean;
  source_path?: string;
  created_at: string;
  [key: string]: any;
}

export interface CategoryItem {
  _id: string;
  name: string;
  type: 'csr_activity' | 'challenge' | 'carbon' | string;
  status: 'active' | 'archived' | string;
  description?: string;
  [key: string]: any;
}

export interface EsgOrganizationSettings {
  name: string;
  settings: {
    esg_weights: { e: number; s: number; g: number };
    auto_emission_calculation: boolean;
    require_csr_evidence: boolean;
    badge_auto_award: boolean;
    email_compliance_alerts: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export type PlatformSettings = EsgOrganizationSettings;

export interface SubAdminRole {
  user_id: string;
  scope: {
    department_ids?: string[];
    facility_ids?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

