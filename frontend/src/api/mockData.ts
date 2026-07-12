import type {
  User,
  TreeNode,
  DepartmentRollup,
  Facility,
  FacilityReading,
  CityProfile,
  Product,
  CarbonReferenceRow,
  CarbonReferenceHistoryEntry,
  ProductSale,
  Allocation,
  ProductLink,
  EmissionFactor,
  CarbonTransaction,
  EnvironmentalGoal,
  CsrActivity,
  EmployeeParticipation,
  DiversityMetric,
  Training,
  Policy,
  AuditRecord,
  ComplianceIssue,
  Challenge,
  Badge,
  Reward,
  LeaderboardEntry,
  AppNotification,
  CategoryItem,
  EsgOrganizationSettings,
} from '../types';

const INITIAL_USERS: User[] = [
  {
    _id: 'usr_master',
    org_id: 'org_acme',
    email: 'master@ecosphere.com',
    full_name: 'Elena Rostova (Master Admin)',
    roles: ['master_admin'],
    status: 'active',
    xp_total: 4500,
    points_balance: 1200,
    scope: { is_master: true, region: [], sector: [] },
  },
  {
    _id: 'usr_org_admin',
    org_id: 'org_acme',
    email: 'admin@ecosphere.com',
    full_name: 'Marcus Thorne (Org Admin)',
    department_id: 'dept_corp',
    roles: ['org_admin'],
    status: 'active',
    xp_total: 3200,
    points_balance: 850,
    scope: { is_master: false, region: [], sector: [] },
  },
  {
    _id: 'usr_dept_head',
    org_id: 'org_acme',
    email: 'head@ecosphere.com',
    full_name: 'Dr. Sarah Jenkins (Mfg Head)',
    department_id: 'dept_mfg',
    roles: ['dept_head'],
    status: 'active',
    xp_total: 2800,
    points_balance: 620,
    scope: { is_master: false, region: [], sector: [] },
  },
  {
    _id: 'usr_sub_admin',
    org_id: 'org_acme',
    email: 'subadmin@ecosphere.com',
    full_name: 'Aiden Vance (Region Sub-Admin)',
    department_id: 'dept_corp',
    roles: [{ role: 'sub_admin', scope: { kind: 'region', values: ['IN', 'DE'] } }],
    status: 'active',
    xp_total: 2100,
    points_balance: 400,
    scope: { is_master: false, region: ['IN', 'DE'], sector: [] },
  },
  {
    _id: 'usr_employee',
    org_id: 'org_acme',
    email: 'employee@ecosphere.com',
    full_name: 'Amara Chen (Sustainability Specialist)',
    department_id: 'dept_mfg',
    roles: ['employee'],
    status: 'active',
    xp_total: 1950,
    points_balance: 950,
    scope: { is_master: false, region: [], sector: [] },
  },
];

const INITIAL_DEPARTMENTS: TreeNode[] = [
  {
    _id: 'dept_corp',
    name: 'Corporate Headquarters',
    code: 'CORP',
    head: { _id: 'usr_org_admin', full_name: 'Marcus Thorne (Org Admin)', email: 'admin@ecosphere.com' },
    employee_count: 85,
    status: 'active',
    parent_id: null,
    children: [
      {
        _id: 'dept_hr',
        name: 'People & Culture (HR)',
        code: 'HR',
        head: null,
        employee_count: 24,
        status: 'active',
        parent_id: 'dept_corp',
        children: [],
      },
    ],
  },
  {
    _id: 'dept_mfg',
    name: 'Manufacturing & Operations',
    code: 'MFG',
    head: { _id: 'usr_dept_head', full_name: 'Dr. Sarah Jenkins (Mfg Head)', email: 'head@ecosphere.com' },
    employee_count: 320,
    status: 'active',
    parent_id: null,
    children: [
      {
        _id: 'dept_mfg_pune',
        name: 'Pune Assembly Plant',
        code: 'MFG-PUN',
        head: null,
        employee_count: 180,
        status: 'active',
        parent_id: 'dept_mfg',
        children: [],
      },
      {
        _id: 'dept_mfg_munich',
        name: 'Munich Precision Lab',
        code: 'MFG-MUN',
        head: null,
        employee_count: 140,
        status: 'active',
        parent_id: 'dept_mfg',
        children: [],
      },
    ],
  },
  {
    _id: 'dept_rnd',
    name: 'Research & Innovation',
    code: 'RND',
    head: null,
    employee_count: 65,
    status: 'active',
    parent_id: null,
    children: [],
  },
];

const INITIAL_FACILITIES: Facility[] = [
  {
    _id: 'fac_pune_1',
    org_id: 'org_acme',
    department_id: 'dept_mfg_pune',
    name: 'Chakan Industrial Campus Block A',
    country: 'IN',
    city: 'Pune',
    employee_count: 180,
    status: 'active',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
  },
  {
    _id: 'fac_munich_1',
    org_id: 'org_acme',
    department_id: 'dept_mfg_munich',
    name: 'Bavaria Eco Tech Center',
    country: 'DE',
    city: 'Munich',
    employee_count: 140,
    status: 'active',
    created_at: '2026-02-10T09:30:00Z',
    updated_at: '2026-06-15T11:00:00Z',
  },
  {
    _id: 'fac_hq_1',
    org_id: 'org_acme',
    department_id: 'dept_corp',
    name: 'Global Executive Tower',
    country: 'US',
    city: 'San Francisco',
    employee_count: 85,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    warning: 'No city profile yet — add one under Settings → City Profiles',
  },
];

const INITIAL_READINGS: FacilityReading[] = [
  {
    _id: 'read_1',
    org_id: 'org_acme',
    facility_id: 'fac_pune_1',
    department_id: 'dept_mfg_pune',
    period: { year: 2026, month: 6 },
    inputs: { electricity_kwh: 45000, employee_count_override: 180 },
    computed: {
      commute_kg: 8420,
      electricity_kg: 31950,
      total_kg: 40370,
      city_profile_id: 'city_pune',
      is_approximation: false,
      assumptions: {
        avg_commute_km_per_day: 18,
        transport_mix: [
          { mode: 'two_wheeler', share: 0.5, factor_kg_per_km: 0.04 },
          { mode: 'bus', share: 0.3, factor_kg_per_km: 0.08 },
          { mode: 'car', share: 0.2, factor_kg_per_km: 0.19 },
        ],
        grid_renewable_pct: 0.28,
        grid_factor_kg_per_kwh: 0.71,
        working_days_per_month: 22,
        employees_used: 180,
      },
    },
    created_by: 'Dr. Sarah Jenkins (Mfg Head)',
    created_at: '2026-07-01T12:00:00Z',
  },
  {
    _id: 'read_2',
    org_id: 'org_acme',
    facility_id: 'fac_munich_1',
    department_id: 'dept_mfg_munich',
    period: { year: 2026, month: 6 },
    inputs: { electricity_kwh: 28000, employee_count_override: 140 },
    computed: {
      commute_kg: 3150,
      electricity_kg: 9800,
      total_kg: 12950,
      city_profile_id: 'city_munich',
      is_approximation: false,
      assumptions: {
        avg_commute_km_per_day: 14,
        transport_mix: [
          { mode: 'rail', share: 0.6, factor_kg_per_km: 0.03 },
          { mode: 'bus', share: 0.25, factor_kg_per_km: 0.06 },
          { mode: 'car', share: 0.15, factor_kg_per_km: 0.17 },
        ],
        grid_renewable_pct: 0.65,
        grid_factor_kg_per_kwh: 0.35,
        working_days_per_month: 21,
        employees_used: 140,
      },
    },
    created_by: 'Dr. Sarah Jenkins (Mfg Head)',
    created_at: '2026-07-02T14:30:00Z',
  },
];

const INITIAL_CITY_PROFILES: CityProfile[] = [
  {
    _id: 'city_pune',
    country: 'IN',
    city: 'Pune',
    year: 2026,
    avg_commute_km_per_day: 18,
    transport_mix: [
      { mode: 'two_wheeler', share: 0.5, factor_kg_per_km: 0.04 },
      { mode: 'bus', share: 0.3, factor_kg_per_km: 0.08 },
      { mode: 'car', share: 0.2, factor_kg_per_km: 0.19 },
    ],
    grid_renewable_pct: 0.28,
    grid_factor_kg_per_kwh: 0.71,
    electricity_tariff_per_kwh: { amount: 0.12, currency: 'USD' },
    working_days_per_month: 22,
    source: 'National Electricity Grid Audit 2026',
  },
  {
    _id: 'city_munich',
    country: 'DE',
    city: 'Munich',
    year: 2026,
    avg_commute_km_per_day: 14,
    transport_mix: [
      { mode: 'rail', share: 0.6, factor_kg_per_km: 0.03 },
      { mode: 'bus', share: 0.25, factor_kg_per_km: 0.06 },
      { mode: 'car', share: 0.15, factor_kg_per_km: 0.17 },
    ],
    grid_renewable_pct: 0.65,
    grid_factor_kg_per_kwh: 0.35,
    electricity_tariff_per_kwh: { amount: 0.32, currency: 'EUR' },
    working_days_per_month: 21,
    source: 'EU Green Transit Index 2026',
  },
  {
    _id: 'city_mumbai',
    country: 'IN',
    city: 'Mumbai',
    year: 2026,
    avg_commute_km_per_day: 24,
    transport_mix: [
      { mode: 'rail', share: 0.55, factor_kg_per_km: 0.02 },
      { mode: 'bus', share: 0.25, factor_kg_per_km: 0.07 },
      { mode: 'car', share: 0.2, factor_kg_per_km: 0.21 },
    ],
    grid_renewable_pct: 0.22,
    grid_factor_kg_per_kwh: 0.82,
    electricity_tariff_per_kwh: { amount: 0.14, currency: 'USD' },
    working_days_per_month: 23,
    source: 'Maharashtra Energy Bureau',
  },
];

const INITIAL_CARBON_REFS: CarbonReferenceRow[] = [
  {
    _id: 'cref_steel_pune',
    country: 'IN',
    city: 'Pune',
    product_category: 'steel',
    product_name: 'structural_beam_alloy',
    description: 'High-tensile alloy structural steel manufactured in Maharashtra',
    year: 2026,
    carbon_value: 1.85,
    unit: 'per_kg',
    source: 'TATA Industrial Baseline 2026',
    updated_by: 'Elena Rostova (Master Admin)',
  },
  {
    _id: 'cref_steel_general_in',
    country: 'IN',
    city: null,
    product_category: 'steel',
    product_name: null,
    description: 'Country-level approximate carbon average for raw steel products in India',
    year: 2026,
    carbon_value: 2.3,
    unit: 'per_kg',
    source: 'Ministry of Steel Annual Report',
    updated_by: 'Elena Rostova (Master Admin)',
  },
  {
    _id: 'cref_electronics_de',
    country: 'DE',
    city: 'Munich',
    product_category: 'electronics',
    product_name: 'solar_inverter_circuit_v3',
    description: 'Precision clean-room assembled inverter controller unit',
    year: 2026,
    carbon_value: 42.5,
    unit: 'per_unit',
    source: 'Fraunhofer Sustainability Institute',
    updated_by: 'Elena Rostova (Master Admin)',
  },
  {
    _id: 'cref_electronics_general_de',
    country: 'DE',
    city: null,
    product_category: 'electronics',
    product_name: null,
    description: 'Germany regional approximate average for industrial electronic components',
    year: 2026,
    carbon_value: 55.0,
    unit: 'per_unit',
    source: 'EuroStat Industrial Index 2026',
    updated_by: 'Elena Rostova (Master Admin)',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    _id: 'prod_1',
    org_id: 'org_acme',
    department_id: 'dept_mfg_pune',
    name: 'EcoShield Structural Steel Beam X500',
    category: 'steel',
    description: 'Heavy duty construction beam with low-carbon smelting process',
    production_country: 'IN',
    production_city: 'Pune',
    unit_price: { amount: 150, currency: 'USD' },
    status: 'active',
    carbon: {
      per_unit_kg: 185,
      reference_id: 'cref_steel_pune',
      match_tier: 1,
      is_approximation: false,
      unit: 'per_unit',
      calculated_at: '2026-06-20T10:00:00Z',
    },
  },
  {
    _id: 'prod_2',
    org_id: 'org_acme',
    department_id: 'dept_mfg_munich',
    name: 'Solar Inverter Logic Module V3',
    category: 'electronics',
    description: 'Smart grid tie-in logic board with high efficiency regulators',
    production_country: 'DE',
    production_city: 'Munich',
    unit_price: { amount: 480, currency: 'EUR' },
    status: 'active',
    carbon: {
      per_unit_kg: 42.5,
      reference_id: 'cref_electronics_de',
      match_tier: 1,
      is_approximation: false,
      unit: 'per_unit',
      calculated_at: '2026-06-22T14:00:00Z',
    },
  },
  {
    _id: 'prod_3',
    org_id: 'org_acme',
    department_id: 'dept_rnd',
    name: 'Prototype Battery Case Alloy C2',
    category: 'steel',
    description: 'Lightweight battery encapsulation structural steel housing',
    production_country: 'IN',
    production_city: 'Nagpur',
    unit_price: { amount: 95, currency: 'USD' },
    status: 'active',
    carbon: {
      per_unit_kg: 230,
      reference_id: 'cref_steel_general_in',
      match_tier: 2,
      is_approximation: true,
      unit: 'per_unit',
      calculated_at: '2026-06-25T09:00:00Z',
    },
  },
  {
    _id: 'prod_4',
    org_id: 'org_acme',
    department_id: 'dept_mfg',
    name: 'Standard Galvanized Fastener Pack (1000 pcs)',
    category: 'fasteners',
    description: 'Corrosion resistant industrial screws and bolts',
    production_country: 'IN',
    production_city: 'Pune',
    unit_price: { amount: 25, currency: 'USD' },
    status: 'active',
    carbon: null,
  },
];

const INITIAL_SALES: ProductSale[] = [
  {
    _id: 'sale_1',
    org_id: 'org_acme',
    product_id: 'prod_1',
    department_id: 'dept_mfg_pune',
    period: { year: 2026, month: 6 },
    units_sold: 1200,
    unit_price: { amount: 150, currency: 'USD' },
    revenue: { amount: 180000, currency: 'USD' },
  },
  {
    _id: 'sale_2',
    org_id: 'org_acme',
    product_id: 'prod_3',
    department_id: 'dept_rnd',
    period: { year: 2026, month: 6 },
    units_sold: 400,
    unit_price: { amount: 95, currency: 'USD' },
    revenue: { amount: 38000, currency: 'USD' },
  },
];

const INITIAL_ALLOCATIONS: Allocation[] = [
  {
    _id: 'alloc_2026_06',
    org_id: 'org_acme',
    department_id: null,
    period: { year: 2026, month: 6 },
    overhead_total_kg: 53320,
    revenue_total: { amount: 218000, currency: 'USD' },
    lines: [
      {
        product_id: 'prod_1',
        revenue: { amount: 180000, currency: 'USD' },
        revenue_share: 0.8257,
        allocated_kg: 44026,
      },
      {
        product_id: 'prod_3',
        revenue: { amount: 38000, currency: 'USD' },
        revenue_share: 0.1743,
        allocated_kg: 9294,
      },
    ],
    unallocated_kg: 0,
    status: 'current',
    run_by: 'Marcus Thorne (Org Admin)',
    created_at: '2026-07-02T16:00:00Z',
  },
];

const INITIAL_LINKS: ProductLink[] = [
  {
    _id: 'link_1',
    requester_org_id: 'org_acme',
    requester_product_id: 'prod_1',
    partner_org_id: 'org_global_smelting',
    partner_product_id: 'partner_prod_pig_iron',
    link_type: 'component',
    status: 'confirmed',
    shared: {
      mode: 'exact',
      value_kg: 62.4,
      snapshot_at: '2026-06-10T12:00:00Z',
    },
    requested_by: 'Dr. Sarah Jenkins (Mfg Head)',
    responded_by: 'Partner Tech Director',
    responded_at: '2026-06-11T08:30:00Z',
  },
  {
    _id: 'link_2',
    requester_org_id: 'org_acme',
    requester_product_id: 'prod_2',
    partner_org_id: 'org_semi_tech',
    partner_product_id: 'partner_prod_silicon_wafer',
    link_type: 'component',
    status: 'pending',
    shared: null,
    requested_by: 'Marcus Thorne (Org Admin)',
  },
];

const INITIAL_EMISSION_FACTORS: EmissionFactor[] = [
  {
    _id: 'ef_1',
    activity: 'Electricity Grid Consumption',
    item: 'Maharashtra Industrial Feed (Grid)',
    factor_kg_per_unit: 0.71,
    unit_label: 'per kWh',
    year: 2026,
    source: 'India Central Electricity Authority (CEA)',
    status: 'active',
  },
  {
    _id: 'ef_2',
    activity: 'Company Fleet & Logistics',
    item: 'Diesel Heavy Duty Freight Trucking',
    factor_kg_per_unit: 2.68,
    unit_label: 'per liter diesel',
    year: 2026,
    source: 'IPCC Emission Factor Database',
    status: 'active',
  },
  {
    _id: 'ef_3',
    activity: 'Air Travel & Business Commute',
    item: 'International Commercial Flight (Economy)',
    factor_kg_per_unit: 0.15,
    unit_label: 'per passenger km',
    year: 2026,
    source: 'IATA Aviation Standard 2026',
    status: 'active',
  },
];

const INITIAL_TRANSACTIONS: CarbonTransaction[] = [
  {
    _id: 'txn_1',
    period: { year: 2026, month: 6 },
    department_id: 'dept_mfg_pune',
    source_type: 'facility_reading',
    amount_kg: 40370,
    note: 'Auto-computed from facility monthly electricity & commute reading (Chakan Campus)',
    is_approximation: false,
    created_at: '2026-07-01T12:00:00Z',
  },
  {
    _id: 'txn_2',
    period: { year: 2026, month: 6 },
    department_id: 'dept_mfg_munich',
    source_type: 'facility_reading',
    amount_kg: 12950,
    note: 'Auto-computed from facility monthly electricity & commute reading (Munich Center)',
    is_approximation: false,
    created_at: '2026-07-02T14:30:00Z',
  },
  {
    _id: 'txn_3',
    period: { year: 2026, month: 6 },
    department_id: 'dept_mfg_pune',
    source_type: 'production_record',
    amount_kg: 222000,
    note: 'Production of 1,200 units of EcoShield Structural Steel Beam X500 (@185 kg CO2/unit)',
    is_approximation: false,
    created_at: '2026-07-02T15:00:00Z',
  },
  {
    _id: 'txn_4',
    period: { year: 2026, month: 6 },
    department_id: 'dept_corp',
    source_type: 'fleet',
    amount_kg: 4850,
    note: 'Quarterly corporate courier & executive transport fuel expenditure',
    is_approximation: true,
    created_at: '2026-06-28T10:00:00Z',
  },
];

const INITIAL_GOALS: EnvironmentalGoal[] = [
  {
    _id: 'goal_1',
    name: 'Net-Zero Scope 1 & 2 Manufacturing Footprint',
    department_id: 'dept_mfg',
    metric: 'Annual Carbon Intensity',
    baseline_co2_kg: 450000,
    target_co2_kg: 280000,
    current_co2_kg: 335000,
    unit: 'kg CO2e / Year',
    start_date: '2026-01-01',
    deadline: '2026-12-31',
    status: 'on_track',
  },
  {
    _id: 'goal_2',
    name: '100% Renewable Powered Headquarters Commute & Grid',
    department_id: 'dept_corp',
    metric: 'Monthly Electricity & Commute Emissions',
    baseline_co2_kg: 65000,
    target_co2_kg: 15000,
    current_co2_kg: 42000,
    unit: 'kg CO2e / Month',
    start_date: '2026-01-01',
    deadline: '2026-09-30',
    status: 'at_risk',
  },
];

const INITIAL_CSR_ACTIVITIES: CsrActivity[] = [
  {
    _id: 'csr_1',
    title: 'Mula-Mutha Riverbank Eco-Clean & Tree Plantation',
    description: 'Join volunteers to plant 500 native saplings along Pune riverbanks and clean plastic litter.',
    category: 'Environmental Restoration',
    activity_date: '2026-07-25',
    location: 'Kalyani Nagar Riverfront, Pune',
    evidence_required: true,
    points: 300,
    xp: 450,
    joined_count: 42,
    status: 'active',
  },
  {
    _id: 'csr_2',
    title: 'STEM & Sustainability Mentorship for Underprivileged Youth',
    description: 'Weekend online mentoring session guiding high school students on clean tech careers.',
    category: 'Community Education',
    activity_date: '2026-08-05',
    location: 'Virtual Zoom Campus / Pune Center',
    evidence_required: true,
    points: 250,
    xp: 380,
    joined_count: 28,
    status: 'active',
  },
];

const INITIAL_PARTICIPATIONS: EmployeeParticipation[] = [
  {
    _id: 'part_1',
    user_id: 'usr_employee',
    user_name: 'Amara Chen (Sustainability Specialist)',
    activity_id: 'csr_1',
    activity_title: 'Mula-Mutha Riverbank Eco-Clean & Tree Plantation',
    proof_file_ids: ['file_tree_planting_photo.jpg'],
    points: 300,
    status: 'approved',
    submitted_at: '2026-06-20T16:45:00Z',
  },
  {
    _id: 'part_2',
    user_id: 'usr_sub_admin',
    user_name: 'Aiden Vance (Region Sub-Admin)',
    activity_id: 'csr_2',
    activity_title: 'STEM & Sustainability Mentorship for Underprivileged Youth',
    proof_file_ids: ['file_zoom_mentorship_certificate.pdf'],
    points: 250,
    status: 'pending',
    submitted_at: '2026-07-10T11:20:00Z',
  },
];

const INITIAL_DIVERSITY: DiversityMetric[] = [
  {
    _id: 'div_1',
    department_id: 'dept_corp',
    period: { year: 2026, month: 6 },
    dimension: 'gender',
    breakdown: { Female: 46, Male: 37, Other: 2 },
  },
  {
    _id: 'div_2',
    department_id: 'dept_mfg',
    period: { year: 2026, month: 6 },
    dimension: 'gender',
    breakdown: { Female: 112, Male: 204, Other: 4 },
  },
  {
    _id: 'div_3',
    department_id: 'dept_corp',
    period: { year: 2026, month: 6 },
    dimension: 'age',
    breakdown: { '<30 Years': 28, '30-45 Years': 44, '46-60 Years': 13 },
  },
];

const INITIAL_TRAININGS: Training[] = [
  {
    _id: 'train_1',
    title: 'ISO 14001: Environmental Management Systems Fundamentals',
    category: 'Compliance & Governance',
    duration_minutes: 45,
    points: 150,
    completion_count: 164,
    is_completed: true,
    completed_at: '2026-05-12T10:00:00Z',
  },
  {
    _id: 'train_2',
    title: 'Anti-Bribery, Diversity & Human Rights at Work',
    category: 'Social Responsibility',
    duration_minutes: 60,
    points: 200,
    completion_count: 210,
    is_completed: true,
    completed_at: '2026-04-18T14:30:00Z',
  },
  {
    _id: 'train_3',
    title: 'Carbon Accounting & Scope 1-2-3 Reporting Mastery',
    category: 'Environmental Assessment',
    duration_minutes: 90,
    points: 350,
    completion_count: 48,
    is_completed: false,
  },
];

const INITIAL_POLICIES: Policy[] = [
  {
    _id: 'pol_1',
    title: 'Global Code of Ethics & Human Rights Charter',
    group: 'Social & Ethics',
    version: '2.4',
    body_text: 'EcoSphere organization is firmly committed to zero tolerance against discrimination, forced labor, and ethical misconduct across all global operations and supply chains.',
    file_id: 'file_policy_code_of_ethics_v2.4.pdf',
    published_at: '2026-01-10T00:00:00Z',
    status: 'published',
    user_acknowledged: true,
    acknowledged_at: '2026-01-15T09:00:00Z',
  },
  {
    _id: 'pol_2',
    title: 'Zero Waste & Circular Economy Manufacturing Standard',
    group: 'Environmental Operations',
    version: '3.1',
    body_text: 'All manufacturing centers must achieve 90% solid waste recycling and phase out non-degradable packaging materials by Q4 2026.',
    file_id: 'file_policy_circular_economy_v3.1.pdf',
    published_at: '2026-04-01T00:00:00Z',
    status: 'published',
    user_acknowledged: false,
  },
];

const INITIAL_AUDITS: AuditRecord[] = [
  {
    _id: 'aud_1',
    title: 'Q2 2026 Pune Plant Environmental & Safety Audit',
    department_id: 'dept_mfg_pune',
    auditor_name: 'Bureau Veritas Quality Certification',
    audit_date: '2026-06-14',
    findings_summary: 'Excellent compliance with wastewater treatment protocols. Minor observation regarding coolant recycling tracking in Block B.',
    status: 'completed',
  },
  {
    _id: 'aud_2',
    title: 'Annual Corporate Governance & Supply Chain Human Rights Audit',
    department_id: 'dept_corp',
    auditor_name: 'KPMG Sustainability Advisory',
    audit_date: '2026-07-18',
    findings_summary: 'Pending document verification for tier-2 supplier diversity audits.',
    status: 'in_progress',
  },
];

const INITIAL_COMPLIANCE_ISSUES: ComplianceIssue[] = [
  {
    _id: 'comp_1',
    title: 'Coolant Recycling Log Verification Delay (Block B)',
    description: 'Auditors noted that weekly coolant filtration logs in Pune Block B were missing signatures for May week 3 and 4.',
    severity: 'medium',
    department_id: 'dept_mfg_pune',
    owner_user_id: 'usr_dept_head',
    owner_name: 'Dr. Sarah Jenkins (Mfg Head)',
    due_date: '2026-07-05', // Overdue since current date is 2026-07-12!
    status: 'open',
    audit_id: 'aud_1',
  },
  {
    _id: 'comp_2',
    title: 'Quarterly Vendor Diversity Scorecard Submission',
    description: 'Ensure 100% of primary procurement vendors submit their annual diversity & inclusion disclosure certificates.',
    severity: 'high',
    department_id: 'dept_corp',
    owner_user_id: 'usr_org_admin',
    owner_name: 'Marcus Thorne (Org Admin)',
    due_date: '2026-07-30',
    status: 'in_progress',
  },
];

const INITIAL_CHALLENGES: Challenge[] = [
  {
    _id: 'chal_1',
    title: '30-Day Zero Plastic & Carpool Commute Challenge',
    description: 'Switch your commute to public transit, cycling, or carpooling for 20 working days and eliminate single-use plastics.',
    category: 'Eco Habit Sprint',
    difficulty: 'medium',
    xp: 600,
    points: 450,
    evidence_required: true,
    starts_at: '2026-07-01',
    deadline: '2026-07-31',
    status: 'active',
    joined: true,
  },
  {
    _id: 'chal_2',
    title: 'Green Innovation Idea Hackathon: Energy Optimization',
    description: 'Submit a technical proposal or prototype script to reduce plant machinery idle power draw by at least 10%.',
    category: 'Innovation',
    difficulty: 'hard',
    xp: 1200,
    points: 800,
    evidence_required: true,
    starts_at: '2026-08-01',
    deadline: '2026-08-31',
    status: 'draft',
    joined: false,
  },
];

const INITIAL_BADGES: Badge[] = [
  {
    _id: 'badge_1',
    name: 'Carbon Pioneer',
    description: 'Log or verify 10 accurate facility carbon readings or product LCA calculations.',
    unlock_rule: 'Log 10 Environmental Records',
    progress_pct: 100,
    is_unlocked: true,
    unlocked_at: '2026-06-15T12:00:00Z',
  },
  {
    _id: 'badge_2',
    name: 'CSR Guardian',
    description: 'Participate in and successfully submit evidence for 5 social responsibility activities.',
    unlock_rule: 'Complete 5 CSR Activities',
    progress_pct: 60,
    is_unlocked: false,
  },
  {
    _id: 'badge_3',
    name: 'Governance Sentinel',
    description: 'Acknowledge all published company policies within 48 hours of release.',
    unlock_rule: '100% Policy Acknowledgement Rate',
    progress_pct: 50,
    is_unlocked: false,
  },
  {
    _id: 'badge_4',
    name: 'Eco Marathoner',
    description: 'Win or achieve top 3 ranking in a 30-Day organization sustainability challenge.',
    unlock_rule: 'Top 3 Challenge Finish',
    progress_pct: 100,
    is_unlocked: true,
    unlocked_at: '2026-05-30T10:00:00Z',
  },
];

const INITIAL_REWARDS: Reward[] = [
  {
    _id: 'rew_1',
    name: 'EcoSphere Branded Solar Power Bank (20,000mAh)',
    description: 'High-efficiency rugged solar portable charger made from 100% ocean-bound recycled plastics.',
    cost_points: 600,
    stock: 24,
  },
  {
    _id: 'rew_2',
    name: 'Additional Paid Sustainability Leave Day (1 Day Off)',
    description: 'Redeem points for one extra paid personal day off dedicated to community volunteering or eco-wellness.',
    cost_points: 1500,
    stock: 10,
  },
  {
    _id: 'rew_3',
    name: '$50 Donation in Your Name to Rainforest Trust',
    description: 'We will donate $50 directly to protect tropical rainforest acreage and issue you a personalized conservation certificate.',
    cost_points: 400,
    stock: 50,
  },
];

const INITIAL_CATEGORIES: CategoryItem[] = [
  { _id: 'cat_1', name: 'Environmental Restoration', type: 'csr_activity', status: 'active' },
  { _id: 'cat_2', name: 'Community Education', type: 'csr_activity', status: 'active' },
  { _id: 'cat_3', name: 'Eco Habit Sprint', type: 'challenge', status: 'active' },
  { _id: 'cat_4', name: 'Innovation & Tech', type: 'challenge', status: 'active' },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    _id: 'notif_1',
    type: 'compliance_overdue',
    title: 'Overdue Compliance Action Required',
    message: 'Coolant Recycling Log Verification Delay (Block B) is now past due (Due: 2026-07-05). Immediate action required.',
    read: false,
    source_path: '/governance/compliance',
    created_at: '2026-07-06T08:00:00Z',
  },
  {
    _id: 'notif_2',
    type: 'csr_decision',
    title: 'CSR Proof Approved!',
    message: 'Your evidence submission for Mula-Mutha Riverbank Eco-Clean has been verified (+300 pts, +450 XP).',
    read: false,
    source_path: '/social/participation',
    created_at: '2026-07-01T14:00:00Z',
  },
  {
    _id: 'notif_3',
    type: 'badge_unlock',
    title: 'New Badge Unlocked: Carbon Pioneer!',
    message: 'Congratulations! You unlocked the Carbon Pioneer badge for outstanding environmental contribution.',
    read: true,
    source_path: '/gamification/badges',
    created_at: '2026-06-15T12:00:00Z',
  },
];

export const INITIAL_SETTINGS: EsgOrganizationSettings = {
  name: 'Acme Global Industrials Corp',
  settings: {
    esg_weights: { e: 40, s: 35, g: 25 },
    auto_emission_calculation: true,
    require_csr_evidence: true,
    badge_auto_award: true,
    email_compliance_alerts: true,
  },
};

// LocalStorage Persistence Wrapper
export class MockStorage {
  static get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(`ecosphere_mock_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`ecosphere_mock_${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
}

// Ensure mock state initialized
export function initMockState() {
  if (!localStorage.getItem('ecosphere_mock_users')) {
    MockStorage.set('users', INITIAL_USERS);
    MockStorage.set('departments', INITIAL_DEPARTMENTS);
    MockStorage.set('facilities', INITIAL_FACILITIES);
    MockStorage.set('readings', INITIAL_READINGS);
    MockStorage.set('cityProfiles', INITIAL_CITY_PROFILES);
    MockStorage.set('carbonRefs', INITIAL_CARBON_REFS);
    MockStorage.set('products', INITIAL_PRODUCTS);
    MockStorage.set('sales', INITIAL_SALES);
    MockStorage.set('allocations', INITIAL_ALLOCATIONS);
    MockStorage.set('links', INITIAL_LINKS);
    MockStorage.set('emissionFactors', INITIAL_EMISSION_FACTORS);
    MockStorage.set('transactions', INITIAL_TRANSACTIONS);
    MockStorage.set('goals', INITIAL_GOALS);
    MockStorage.set('csrActivities', INITIAL_CSR_ACTIVITIES);
    MockStorage.set('participations', INITIAL_PARTICIPATIONS);
    MockStorage.set('diversity', INITIAL_DIVERSITY);
    MockStorage.set('trainings', INITIAL_TRAININGS);
    MockStorage.set('policies', INITIAL_POLICIES);
    MockStorage.set('audits', INITIAL_AUDITS);
    MockStorage.set('complianceIssues', INITIAL_COMPLIANCE_ISSUES);
    MockStorage.set('challenges', INITIAL_CHALLENGES);
    MockStorage.set('badges', INITIAL_BADGES);
    MockStorage.set('rewards', INITIAL_REWARDS);
    MockStorage.set('categories', INITIAL_CATEGORIES);
    MockStorage.set('notifications', INITIAL_NOTIFICATIONS);
    MockStorage.set('settings', INITIAL_SETTINGS);
  }
}
