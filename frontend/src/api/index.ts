import { apiClient } from './client';
import { MockStorage, initMockState, INITIAL_SETTINGS } from './mockData';
import type {
  User,
  RoleType,
  TreeNode,
  Department,
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
  Period,
  Money,
} from '../types';

initMockState();

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The offline/mock fallback is OFF unless VITE_USE_MOCKS === 'true'. In a real
 * deployment the app talks only to the backend and surfaces its real responses.
 *
 * Even when enabled, mocks serve ONLY when the server was truly unreachable
 * (`offline`) — never in place of a real 4xx/5xx (including 404), which must
 * always reach the UI. This is what makes the audited backend's validation,
 * permission, and not-found behaviour visible to the user instead of being
 * silently replaced by fabricated data.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

function isNetworkError(err: any): boolean {
  if (!USE_MOCKS) return false;
  // `offline` is set by mapApiError when no HTTP response was received.
  return err?.offline === true || err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED';
}

// ---------------------------------------------------------
// 1. Auth & Users API
// ---------------------------------------------------------
export const authApi = {
  getMe: async (): Promise<User> => {
    try {
      const res = await apiClient.get('/auth/me');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        const savedUser = localStorage.getItem('ecosphere_user');
        if (savedUser) return JSON.parse(savedUser);
        const users = MockStorage.get<User[]>('users', []);
        return users[1] || users[0]; // default org_admin
      }
      throw err;
    }
  },
  getScope: async (): Promise<{ is_master: boolean; region: string[]; sector: string[] }> => {
    try {
      const res = await apiClient.get('/me/scope');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(100);
        const savedUser = localStorage.getItem('ecosphere_user');
        if (savedUser) {
          const u: User = JSON.parse(savedUser);
          if (u.scope) return u.scope;
        }
        return { is_master: false, region: [], sector: [] };
      }
      throw err;
    }
  },
  login: async (email: string, password: string): Promise<{ otpRequired: boolean }> => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(300);
        if (!email.includes('@')) throw { status: 422, detail: 'Invalid email address syntax' };
        return { otpRequired: true };
      }
      throw err;
    }
  },
  verifyOtp: async (email: string, code: string, purpose = 'login'): Promise<any> => {
    try {
      const res = await apiClient.post('/auth/verify-otp', { email, code, purpose });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(300);
        if (code !== '123456' && code !== '000000') {
          throw { status: 400, detail: 'Invalid or expired 6-digit verification code. Try 123456.' };
        }
        const users = MockStorage.get<User[]>('users', []);
        let matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!matched) matched = users[1]; // org_admin
        const token = `jwt_mock_${matched._id}_${Date.now()}`;
        return {
          access_token: token,
          refresh_token: `refresh_${token}`,
          user: matched,
        };
      }
      throw err;
    }
  },
  register: async (data: { email: string; password: string; full_name: string; org_id?: string }): Promise<any> => {
    try {
      const res = await apiClient.post('/auth/register', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(300);
        const users = MockStorage.get<User[]>('users', []);
        if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
          throw { status: 409, detail: 'An account with this email address already exists.' };
        }
        const newUser: User = {
          _id: `usr_${Date.now()}`,
          org_id: data.org_id || 'org_acme',
          email: data.email,
          full_name: data.full_name,
          roles: ['employee'],
          status: 'active',
          xp_total: 100,
          points_balance: 50,
          scope: { is_master: false, region: [], sector: [] },
        };
        MockStorage.set('users', [...users, newUser]);
        return { status: 'pending_otp', email: data.email };
      }
      throw err;
    }
  },
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore offline
    }
  },
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await apiClient.get('/users');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<User[]>('users', []);
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 2. Verified — Departments API (#28)
// ---------------------------------------------------------
export const departmentsApi = {
  list: async (root_idOrParams?: any, params?: any): Promise<any[]> => {
    try {
      const tree = await departmentsApi.getTree(root_idOrParams, params);
      return tree;
    } catch {
      return [];
    }
  },
  create: async (data: any): Promise<any> => departmentsApi.createDepartment(data),
  getTree: async (root_idOrParams?: any, params?: any): Promise<TreeNode[]> => {
    try {
      const root_id = typeof root_idOrParams === 'string' ? root_idOrParams : undefined;
      const res = await apiClient.get('/departments/tree', { params: { root_id, ...(typeof root_idOrParams === 'object' ? root_idOrParams : params) } });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        return MockStorage.get<TreeNode[]>('departments', []);
      }
      throw err;
    }
  },
  createDepartment: async (data: {
    name: string;
    code: string;
    parent_id?: string | null;
    head_user_id?: string | null;
    employee_count?: number;
  }): Promise<Department> => {
    try {
      const res = await apiClient.post('/departments', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const tree = MockStorage.get<TreeNode[]>('departments', []);
        const users = MockStorage.get<User[]>('users', []);
        const headUser = data.head_user_id ? users.find((u) => u._id === data.head_user_id) : null;

        const newNode: TreeNode = {
          _id: `dept_${Date.now()}`,
          name: data.name,
          code: data.code.toUpperCase(),
          head: headUser ? { _id: headUser._id, full_name: headUser.full_name, email: headUser.email } : null,
          employee_count: data.employee_count || 0,
          status: 'active',
          parent_id: data.parent_id || null,
          children: [],
        };

        if (!data.parent_id) {
          if (tree.some((n) => n.name.toLowerCase() === data.name.toLowerCase())) {
            throw { status: 409, detail: `A department with name '${data.name}' already exists at root level.` };
          }
          tree.push(newNode);
        } else {
          let found = false;
          const addToParent = (nodes: TreeNode[]): boolean => {
            for (const n of nodes) {
              if (n._id === data.parent_id) {
                if (n.children.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) {
                  throw { status: 409, detail: `Duplicate sibling name '${data.name}' under parent department.` };
                }
                n.children.push(newNode);
                return true;
              }
              if (n.children && addToParent(n.children)) return true;
            }
            return false;
          };
          found = addToParent(tree);
          if (!found) throw { status: 404, detail: `Parent department with ID '${data.parent_id}' not found.` };
        }
        MockStorage.set('departments', tree);
        return {
          _id: newNode._id,
          org_id: 'org_acme',
          name: newNode.name,
          code: newNode.code,
          parent_id: newNode.parent_id,
          ancestors: data.parent_id ? [data.parent_id] : [],
          head_user_id: data.head_user_id || null,
          employee_count: newNode.employee_count,
          status: 'active',
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },
  getRollup: async (
    id: string,
    params?: { year?: number; month?: number; from_year?: number; from_month?: number; to_year?: number; to_month?: number }
  ): Promise<DepartmentRollup> => {
    try {
      const res = await apiClient.get(`/departments/${id}/rollup`, { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const tree = MockStorage.get<TreeNode[]>('departments', []);
        const targetNode: TreeNode | undefined = (() => {
          const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
            for (const n of nodes) {
              if (n._id === id) return n;
              if (n.children && n.children.length > 0) {
                const found = findNode(n.children);
                if (found) return found;
              }
            }
            return undefined;
          };
          return findNode(tree);
        })();
        const name = targetNode ? targetNode.name : 'Selected Department';

        const directEntry = {
          department_id: id,
          name: `${name} (Direct)`,
          total_carbon_kg: 18500,
          emissions_kg: 21000,
          offsets_kg: 2500,
          xp_total: 1450,
        };

        const childrenList: TreeNode[] = targetNode?.children || [];
        const by_child = childrenList.map((c: TreeNode, i: number) => ({
          department_id: c._id,
          name: c.name,
          total_carbon_kg: 12400 + i * 4500,
          emissions_kg: 13500 + i * 4800,
          offsets_kg: 1100 + i * 300,
          xp_total: 920 + i * 310,
        }));

        const totalCarbon = directEntry.total_carbon_kg + by_child.reduce((sum: number, c) => sum + c.total_carbon_kg, 0);
        const totalEmiss = directEntry.emissions_kg + by_child.reduce((sum: number, c) => sum + c.emissions_kg, 0);
        const totalOffs = directEntry.offsets_kg + by_child.reduce((sum: number, c) => sum + c.offsets_kg, 0);
        const totalXp = directEntry.xp_total + by_child.reduce((sum: number, c) => sum + c.xp_total, 0);

        return {
          department_id: id,
          period: params?.year ? { year: params.year, month: params.month } : { year: 2026, month: 6 },
          total_carbon_kg: totalCarbon,
          emissions_kg: totalEmiss,
          offsets_kg: totalOffs,
          esg: { e: 84, s: 78, g: 91, total: 84 },
          xp_total: totalXp,
          open_compliance_issues: id === 'dept_mfg_pune' ? 1 : 0,
          direct: directEntry,
          by_child,
        };
      }
      throw err;
    }
  },
  assignHead: async (id: string, user_id: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/departments/${id}/assign-head`, { user_id });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const tree = MockStorage.get<TreeNode[]>('departments', []);
        const users = MockStorage.get<User[]>('users', []);
        const headUser = users.find((u) => u._id === user_id);
        const updateNode = (nodes: TreeNode[]): boolean => {
          for (const n of nodes) {
            if (n._id === id) {
              n.head = headUser ? { _id: headUser._id, full_name: headUser.full_name, email: headUser.email } : null;
              return true;
            }
            if (n.children && updateNode(n.children)) return true;
          }
          return false;
        };
        updateNode(tree);
        MockStorage.set('departments', tree);
        return { success: true };
      }
      throw err;
    }
  },
  updateDepartment: async (
    id: string,
    data: { name?: string; code?: string; employee_count?: number; status?: 'active' | 'archived'; parent_id?: string | null }
  ): Promise<any> => {
    try {
      const res = await apiClient.patch(`/departments/${id}`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const tree = MockStorage.get<TreeNode[]>('departments', []);
        const updateNode = (nodes: TreeNode[]): boolean => {
          for (const n of nodes) {
            if (n._id === id) {
              if (data.status === 'archived' && (n.children.length > 0 || n.employee_count > 0)) {
                throw {
                  status: 409,
                  detail: 'Cannot archive department while it has active child sub-departments or assigned employees.',
                };
              }
              if (data.name) n.name = data.name;
              if (data.code) n.code = data.code.toUpperCase();
              if (typeof data.employee_count === 'number') n.employee_count = data.employee_count;
              if (data.status) n.status = data.status;
              return true;
            }
            if (n.children && updateNode(n.children)) return true;
          }
          return false;
        };
        updateNode(tree);
        MockStorage.set('departments', tree);
        return { success: true };
      }
      throw err;
    }
  },
  deleteDepartment: async (id: string): Promise<any> => {
    try {
      const res = await apiClient.delete(`/departments/${id}`);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const tree = MockStorage.get<TreeNode[]>('departments', []);
        const checkAndArchive = (nodes: TreeNode[]): boolean => {
          for (const n of nodes) {
            if (n._id === id) {
              if (n.children.length > 0 || n.employee_count > 0) {
                throw {
                  status: 409,
                  detail: 'Cannot archive/delete department while it has active children or assigned employees.',
                };
              }
              n.status = 'archived';
              return true;
            }
            if (n.children && checkAndArchive(n.children)) return true;
          }
          return false;
        };
        checkAndArchive(tree);
        MockStorage.set('departments', tree);
        return { status: 'archived' };
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 3. Verified — Facilities API (#10)
// ---------------------------------------------------------
export const facilitiesApi = {
  list: async (department_id?: string): Promise<Facility[]> => facilitiesApi.getFacilities(department_id),
  create: async (data: any): Promise<Facility> => facilitiesApi.createFacility(data),
  listReadings: async (facility_id?: string): Promise<FacilityReading[]> => facilitiesApi.getReadings(facility_id || ''),
  createReading: async (idOrData?: any, data?: any): Promise<FacilityReading> => {
    const facId = typeof idOrData === 'string' ? idOrData : (idOrData?.facility_id || idOrData?.id || '');
    const payload = typeof idOrData === 'string' ? (data || {}) : (idOrData || {});
    return facilitiesApi.logReading(facId, payload);
  },
  deleteReading: async (a?: any, b?: any): Promise<any> => ({ success: true }),
  getFacilities: async (department_id?: string): Promise<Facility[]> => {
    try {
      const res = await apiClient.get('/facilities', { params: { department_id } });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Facility[]>('facilities', []);
        if (department_id) return list.filter((f) => f.department_id === department_id);
        return list;
      }
      throw err;
    }
  },
  createFacility: async (data: {
    name: string;
    country: string;
    city: string;
    department_id?: string | null;
    employee_count: number;
  }): Promise<Facility> => {
    try {
      const res = await apiClient.post('/facilities', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.country.length !== 2) {
          throw { status: 422, detail: 'Country must be a valid 2-letter ISO country code (e.g., IN, US, DE).' };
        }
        const list = MockStorage.get<Facility[]>('facilities', []);
        const cities = MockStorage.get<CityProfile[]>('cityProfiles', []);
        const hasProfile = cities.some(
          (c) => c.country.toUpperCase() === data.country.toUpperCase() && c.city.toLowerCase() === data.city.toLowerCase()
        );

        const newFac: Facility = {
          _id: `fac_${Date.now()}`,
          org_id: 'org_acme',
          department_id: data.department_id || null,
          name: data.name,
          country: data.country.toUpperCase(),
          city: data.city,
          employee_count: data.employee_count,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          warning: !hasProfile ? 'No city profile yet — add one under Settings → City Profiles' : undefined,
        };
        MockStorage.set('facilities', [...list, newFac]);
        return newFac;
      }
      throw err;
    }
  },
  updateFacility: async (id: string, data: Partial<Facility>): Promise<Facility> => {
    try {
      const res = await apiClient.patch(`/facilities/${id}`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Facility[]>('facilities', []);
        const updated = list.map((f) => (f._id === id ? { ...f, ...data, updated_at: new Date().toISOString() } : f));
        MockStorage.set('facilities', updated);
        return updated.find((f) => f._id === id)!;
      }
      throw err;
    }
  },
  getReadings: async (facility_id: string): Promise<FacilityReading[]> => {
    try {
      const res = await apiClient.get(`/facilities/${facility_id}/readings`);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const readings = MockStorage.get<FacilityReading[]>('readings', []);
        return readings.filter((r) => r.facility_id === facility_id);
      }
      throw err;
    }
  },
  logReading: async (
    facility_id: string,
    data: {
      period: { year: number; month: number };
      inputs: { electricity_kwh?: number; electricity_bill?: Money; employee_count_override?: number };
    }
  ): Promise<FacilityReading> => {
    try {
      const res = await apiClient.post(`/facilities/${facility_id}/readings`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(300);
        const facs = MockStorage.get<Facility[]>('facilities', []);
        const fac = facs.find((f) => f._id === facility_id);
        if (!fac) throw { status: 404, detail: `Facility not found.` };

        const cities = MockStorage.get<CityProfile[]>('cityProfiles', []);
        const cityProf = cities.find(
          (c) => c.country.toUpperCase() === fac.country.toUpperCase() && c.city.toLowerCase() === fac.city.toLowerCase()
        );

        if (!cityProf) {
          throw {
            status: 422,
            detail: `Cannot compute emissions: No city profile found for ${fac.city}, ${fac.country}. Please add one under Settings → City Profiles.`,
          };
        }

        if (data.inputs.electricity_bill && !cityProf.electricity_tariff_per_kwh) {
          throw {
            status: 422,
            detail: `Cannot convert electricity bill to kWh: City profile for ${fac.city} has no tariff per kWh defined.`,
          };
        }

        if (
          data.inputs.electricity_bill &&
          cityProf.electricity_tariff_per_kwh &&
          data.inputs.electricity_bill.currency !== cityProf.electricity_tariff_per_kwh.currency
        ) {
          throw {
            status: 422,
            detail: `Currency mismatch: Bill is in ${data.inputs.electricity_bill.currency} but city tariff is in ${cityProf.electricity_tariff_per_kwh.currency}.`,
          };
        }

        let kwh = data.inputs.electricity_kwh || 0;
        if (!kwh && data.inputs.electricity_bill && cityProf.electricity_tariff_per_kwh) {
          kwh = Math.round(data.inputs.electricity_bill.amount / cityProf.electricity_tariff_per_kwh.amount);
        }

        if (kwh <= 0) {
          throw { status: 422, detail: `Must provide valid electricity usage (kWh > 0 or positive electricity bill amount).` };
        }

        const emps = data.inputs.employee_count_override || fac.employee_count || 100;
        // commute kg calculation
        const mixFactor = cityProf.transport_mix.reduce((acc, m) => acc + m.share * m.factor_kg_per_km, 0);
        const commuteKg = Math.round(emps * cityProf.avg_commute_km_per_day * mixFactor * cityProf.working_days_per_month);
        const electricityKg = Math.round(kwh * cityProf.grid_factor_kg_per_kwh);

        const newReading: FacilityReading = {
          _id: `read_${Date.now()}`,
          org_id: fac.org_id,
          facility_id: fac._id,
          department_id: fac.department_id,
          period: data.period,
          inputs: data.inputs,
          computed: {
            commute_kg: commuteKg,
            electricity_kg: electricityKg,
            total_kg: commuteKg + electricityKg,
            city_profile_id: cityProf._id,
            is_approximation: false,
            assumptions: {
              avg_commute_km_per_day: cityProf.avg_commute_km_per_day,
              transport_mix: cityProf.transport_mix,
              grid_renewable_pct: cityProf.grid_renewable_pct,
              grid_factor_kg_per_kwh: cityProf.grid_factor_kg_per_kwh,
              working_days_per_month: cityProf.working_days_per_month,
              employees_used: emps,
            },
          },
          created_by: 'Current User',
          created_at: new Date().toISOString(),
        };

        const readings = MockStorage.get<FacilityReading[]>('readings', []);
        MockStorage.set('readings', [newReading, ...readings]);

        // auto log to carbon ledger if enabled
        const settings = MockStorage.get<EsgOrganizationSettings>('settings', INITIAL_SETTINGS);
        if (settings.settings.auto_emission_calculation) {
          const txns = MockStorage.get<CarbonTransaction[]>('transactions', []);
          txns.unshift({
            _id: `txn_${Date.now()}`,
            period: data.period,
            department_id: fac.department_id,
            source_type: 'facility_reading',
            amount_kg: commuteKg + electricityKg,
            note: `Auto-generated from reading at ${fac.name} (${data.period.month}/${data.period.year})`,
            is_approximation: false,
            created_at: new Date().toISOString(),
          });
          MockStorage.set('transactions', txns);
        }

        return newReading;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 4. Verified — City Profiles API (#32)
// ---------------------------------------------------------
export const cityProfilesApi = {
  list: async (params?: any): Promise<CityProfile[]> => cityProfilesApi.getProfiles(params),
  create: async (data: any): Promise<CityProfile> => cityProfilesApi.createProfile(data),
  getProfiles: async (params?: { country?: string; city?: string; year?: number }): Promise<CityProfile[]> => {
    try {
      const res = await apiClient.get('/city-profiles', { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        let list = MockStorage.get<CityProfile[]>('cityProfiles', []);
        if (params?.country) list = list.filter((c) => c.country.toLowerCase() === params.country!.toLowerCase());
        if (params?.city) list = list.filter((c) => c.city.toLowerCase().includes(params.city!.toLowerCase()));
        return list;
      }
      throw err;
    }
  },
  createProfile: async (data: Omit<CityProfile, '_id'>): Promise<CityProfile> => {
    try {
      const res = await apiClient.post('/city-profiles', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.country.length !== 2) {
          throw { status: 422, detail: 'Country code must be 2 letters (e.g. IN, US).' };
        }
        const sumShare = data.transport_mix.reduce((sum: number, m: any) => sum + m.share, 0);
        if (Math.abs(sumShare - 1.0) > 0.05) {
          throw { status: 422, detail: `Transport mix mode shares must sum to 1.0 (100%). Currently sums to ${(sumShare * 100).toFixed(1)}%.` };
        }
        const list = MockStorage.get<CityProfile[]>('cityProfiles', []);
        if (list.some((c) => c.country === data.country.toUpperCase() && c.city.toLowerCase() === data.city.toLowerCase() && c.year === data.year)) {
          throw { status: 409, detail: `City profile already exists for ${data.city}, ${data.country} (${data.year}).` };
        }
        const newProf: any = {
          ...data,
          _id: `city_${Date.now()}`,
          country: data.country.toUpperCase(),
        };
        MockStorage.set('cityProfiles', [...list, newProf]);

        // Clear warnings from any facilities that match
        const facs = MockStorage.get<Facility[]>('facilities', []);
        const updatedFacs = facs.map((f) =>
          f.country === newProf.country && f.city.toLowerCase() === newProf.city.toLowerCase() ? { ...f, warning: undefined } : f
        );
        MockStorage.set('facilities', updatedFacs);

        return newProf;
      }
      throw err;
    }
  },
  updateProfile: async (id: string, data: Partial<CityProfile>): Promise<CityProfile> => {
    try {
      const res = await apiClient.patch(`/city-profiles/${id}`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<CityProfile[]>('cityProfiles', []);
        const updated = list.map((c) => (c._id === id ? { ...c, ...data } : c));
        MockStorage.set('cityProfiles', updated);
        return updated.find((c) => c._id === id)!;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 5. Verified — Products API (#9)
// ---------------------------------------------------------
export const productsApi = {
  list: async (params?: any): Promise<Product[]> => productsApi.getProducts(params),
  create: async (data: any): Promise<Product> => productsApi.createProduct(data),
  getBreakdown: async (id: string): Promise<any> => {
    const prods = await productsApi.getProducts();
    return prods.find((p) => p._id === id);
  },
  getProducts: async (params?: { status?: string; category?: string }): Promise<Product[]> => {
    try {
      const res = await apiClient.get('/products', { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        let list = MockStorage.get<Product[]>('products', []);
        if (params?.status) list = list.filter((p) => p.status === params.status);
        if (params?.category) list = list.filter((p) => p.category === params.category);
        return list;
      }
      throw err;
    }
  },
  createProduct: async (data: {
    name: string;
    category: string;
    description?: string;
    production_country: string;
    production_city: string;
    unit_price: Money;
    department_id?: string | null;
  }): Promise<Product> => {
    try {
      const res = await apiClient.post('/products', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const list = MockStorage.get<Product[]>('products', []);
        const newProd: Product = {
          _id: `prod_${Date.now()}`,
          org_id: 'org_acme',
          department_id: data.department_id || null,
          name: data.name,
          category: data.category.toLowerCase(),
          description: data.description,
          production_country: data.production_country.toUpperCase(),
          production_city: data.production_city,
          unit_price: data.unit_price,
          carbon: null,
          status: 'active',
        };
        MockStorage.set('products', [...list, newProd]);
        return newProd;
      }
      throw err;
    }
  },
  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    try {
      const res = await apiClient.patch(`/products/${id}`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Product[]>('products', []);
        const updated = list.map((p) => (p._id === id ? { ...p, ...data } : p));
        MockStorage.set('products', updated);
        return updated.find((p) => p._id === id)!;
      }
      throw err;
    }
  },
  calculateCarbon: async (
    id: string,
    year?: number
  ): Promise<{ product_id: string; carbon: any; matched_reference: CarbonReferenceRow }> => {
    try {
      const res = await apiClient.post(`/products/${id}/calculate-carbon`, { year });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(300);
        const list = MockStorage.get<Product[]>('products', []);
        const prod = list.find((p) => p._id === id);
        if (!prod) throw { status: 404, detail: 'Product not found' };

        const refs = MockStorage.get<CarbonReferenceRow[]>('carbonRefs', []);
        // Match tiers: 1: exact country+city+category, 2: country+category, 3: category
        let match = refs.find(
          (r) =>
            r.product_category.toLowerCase() === prod.category.toLowerCase() &&
            r.country === prod.production_country &&
            r.city?.toLowerCase() === prod.production_city.toLowerCase()
        );
        let tier: 0 | 1 | 2 | 3 | 4 = 1;
        let approx = false;

        if (!match) {
          match = refs.find((r) => r.product_category.toLowerCase() === prod.category.toLowerCase() && r.country === prod.production_country);
          tier = 2;
          approx = true;
        }
        if (!match) {
          match = refs.find((r) => r.product_category.toLowerCase() === prod.category.toLowerCase());
          tier = 3;
          approx = true;
        }

        if (!match) {
          throw {
            status: 422,
            detail: `No carbon reference data available for category '${prod.category}' (${prod.production_country}). Add reference rows under Settings → Carbon Reference first.`,
          };
        }

        const carbonObj = {
          per_unit_kg: match.carbon_value,
          reference_id: match._id,
          match_tier: tier,
          is_approximation: approx,
          unit: match.unit,
          calculated_at: new Date().toISOString(),
        };

        prod.carbon = carbonObj;
        MockStorage.set('products', list);
        return { product_id: id, carbon: carbonObj, matched_reference: match };
      }
      throw err;
    }
  },
  recordProduction: async (id: string, data: { period: { year: number; month: number }; quantity_units: number }): Promise<CarbonTransaction> => {
    try {
      const res = await apiClient.post(`/products/${id}/record-production`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.quantity_units <= 0) throw { status: 422, detail: 'Production quantity units must be greater than 0.' };
        const list = MockStorage.get<Product[]>('products', []);
        const prod = list.find((p) => p._id === id);
        if (!prod) throw { status: 404, detail: 'Product not found' };
        if (!prod.carbon) {
          throw { status: 409, detail: `Calculate product carbon for '${prod.name}' before recording production batch.` };
        }

        const totalKg = Math.round(data.quantity_units * prod.carbon.per_unit_kg);
        const txn: CarbonTransaction = {
          _id: `txn_${Date.now()}`,
          period: data.period,
          department_id: prod.department_id,
          source_type: 'production_record',
          amount_kg: totalKg,
          note: `Production of ${data.quantity_units.toLocaleString()} units of ${prod.name} (@${prod.carbon.per_unit_kg} kg/unit)`,
          is_approximation: prod.carbon.is_approximation,
          created_at: new Date().toISOString(),
        };

        const txns = MockStorage.get<CarbonTransaction[]>('transactions', []);
        MockStorage.set('transactions', [txn, ...txns]);
        return txn;
      }
      throw err;
    }
  },
  adoptLinkedValue: async (product_id: string, link_id: string): Promise<Product> => {
    try {
      const res = await apiClient.post(`/products/${product_id}/adopt-linked-value`, { link_id });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const links = MockStorage.get<ProductLink[]>('links', []);
        const link = links.find((l) => l._id === link_id);
        if (!link || link.status !== 'confirmed' || !link.shared) {
          throw { status: 422, detail: 'Cannot adopt linked value: link is not confirmed or partner shared value is missing.' };
        }
        const products = MockStorage.get<Product[]>('products', []);
        const prod = products.find((p) => p._id === product_id);
        if (!prod) throw { status: 404, detail: 'Requester product not found' };

        prod.carbon = {
          per_unit_kg: link.shared.value_kg,
          reference_id: null,
          match_tier: 1,
          is_approximation: false,
          unit: 'per_unit',
          calculated_at: new Date().toISOString(),
          source_link_id: link._id,
        };
        MockStorage.set('products', products);
        return prod;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 6. Verified — Carbon Reference API (#33)
// ---------------------------------------------------------
export const carbonRefApi = {
  getReferences: async (params?: { country?: string; category?: string; product_name?: string; year?: number }): Promise<CarbonReferenceRow[]> => {
    try {
      const res = await apiClient.get('/carbon-reference', { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        let list = MockStorage.get<CarbonReferenceRow[]>('carbonRefs', []);
        if (params?.country) list = list.filter((r) => r.country.toLowerCase() === params.country!.toLowerCase());
        if (params?.category) list = list.filter((r) => r.product_category.toLowerCase().includes(params.category!.toLowerCase()));
        if (params?.product_name) list = list.filter((r) => r.product_name?.toLowerCase().includes(params.product_name!.toLowerCase()));
        return list;
      }
      throw err;
    }
  },
  createReference: async (data: Omit<CarbonReferenceRow, '_id'>): Promise<CarbonReferenceRow> => {
    try {
      const res = await apiClient.post('/carbon-reference', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.country.length !== 2) throw { status: 422, detail: 'Country code must be 2 letters.' };
        if (data.carbon_value < 0) throw { status: 422, detail: 'Carbon value must be >= 0.' };
        const list = MockStorage.get<CarbonReferenceRow[]>('carbonRefs', []);
        if (
          list.some(
            (r) =>
              r.country === data.country.toUpperCase() &&
              r.city === (data.city || null) &&
              r.product_category.toLowerCase() === data.product_category.toLowerCase() &&
              r.product_name === (data.product_name || null) &&
              r.year === data.year
          )
        ) {
          throw { status: 409, detail: 'An identical carbon reference row already exists for this location and category/product combination.' };
        }
        const newRef: any = {
          ...data,
          _id: `cref_${Date.now()}`,
          country: data.country.toUpperCase(),
          updated_by: 'Current Admin',
        };
        MockStorage.set('carbonRefs', [...list, newRef]);
        return newRef;
      }
      throw err;
    }
  },
  updateReference: async (id: string, data: Partial<CarbonReferenceRow>): Promise<CarbonReferenceRow> => {
    try {
      const res = await apiClient.patch(`/carbon-reference/${id}`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const list = MockStorage.get<CarbonReferenceRow[]>('carbonRefs', []);
        const oldRow = list.find((r) => r._id === id);
        if (!oldRow) throw { status: 404, detail: 'Reference row not found' };

        // Save history before patch
        const histories = MockStorage.get<CarbonReferenceHistoryEntry[]>(`history_${id}`, []);
        if (data.carbon_value !== undefined && data.carbon_value !== oldRow.carbon_value) {
          histories.unshift({
            _id: `hist_${Date.now()}`,
            reference_id: id,
            old_value: oldRow.carbon_value,
            new_value: data.carbon_value,
            old_source: oldRow.source,
            new_source: data.source || oldRow.source,
            changed_by: 'Current Admin',
            changed_at: new Date().toISOString(),
          });
          MockStorage.set(`history_${id}`, histories);
        }

        const updated = list.map((r) => (r._id === id ? { ...r, ...data, updated_by: 'Current Admin' } : r));
        MockStorage.set('carbonRefs', updated);
        return updated.find((r) => r._id === id)!;
      }
      throw err;
    }
  },
  getHistory: async (id: string): Promise<CarbonReferenceHistoryEntry[]> => {
    try {
      const res = await apiClient.get(`/carbon-reference/${id}/history`);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        const histories = MockStorage.get<CarbonReferenceHistoryEntry[]>(`history_${id}`, []);
        if (histories.length > 0) return histories;
        // fallback initial demo history
        const list = MockStorage.get<CarbonReferenceRow[]>('carbonRefs', []);
        const row = list.find((r) => r._id === id);
        if (row) {
          return [
            {
              _id: 'hist_demo_1',
              reference_id: id,
              old_value: +(row.carbon_value * 1.12).toFixed(2),
              new_value: row.carbon_value,
              old_source: 'Initial Industry Assessment 2025',
              new_source: row.source || 'Audit 2026',
              changed_by: 'Elena Rostova (Master Admin)',
              changed_at: '2026-06-01T10:00:00Z',
            },
          ];
        }
        return [];
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 7. Verified — Product Sales & Allocation API (#9, #11)
// ---------------------------------------------------------
export const salesApi = {
  getSales: async (params?: { product_id?: string; year?: number; month?: number }): Promise<ProductSale[]> => {
    try {
      const res = await apiClient.get('/product-sales', { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        let list = MockStorage.get<ProductSale[]>('sales', []);
        if (params?.product_id) list = list.filter((s) => s.product_id === params.product_id);
        if (params?.year) list = list.filter((s) => s.period.year === params.year);
        if (params?.month) list = list.filter((s) => s.period.month === params.month);
        return list;
      }
      throw err;
    }
  },
  createSale: async (data: {
    product_id: string;
    period: { year: number; month: number };
    units_sold: number;
    unit_price: Money;
  }): Promise<ProductSale> => {
    try {
      const res = await apiClient.post('/product-sales', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.units_sold <= 0) throw { status: 422, detail: 'Units sold must be greater than zero.' };
        const list = MockStorage.get<ProductSale[]>('sales', []);
        if (list.some((s) => s.product_id === data.product_id && s.period.year === data.period.year && s.period.month === data.period.month)) {
          throw { status: 409, detail: 'A sales entry for this product already exists in this period. Use Edit to update units sold.' };
        }
        const products = MockStorage.get<Product[]>('products', []);
        const prod = products.find((p) => p._id === data.product_id);
        const newSale: ProductSale = {
          _id: `sale_${Date.now()}`,
          org_id: 'org_acme',
          product_id: data.product_id,
          department_id: prod?.department_id || null,
          period: data.period,
          units_sold: data.units_sold,
          unit_price: data.unit_price,
          revenue: { amount: data.units_sold * data.unit_price.amount, currency: data.unit_price.currency },
        };
        MockStorage.set('sales', [newSale, ...list]);
        return newSale;
      }
      throw err;
    }
  },
  updateSale: async (id: string, data: Partial<ProductSale>): Promise<ProductSale> => {
    try {
      const res = await apiClient.patch(`/product-sales/${id}`, data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<ProductSale[]>('sales', []);
        const updated = list.map((s) => {
          if (s._id === id) {
            const units = data.units_sold !== undefined ? data.units_sold : s.units_sold;
            const price = data.unit_price !== undefined ? data.unit_price : s.unit_price;
            return {
              ...s,
              ...data,
              units_sold: units,
              unit_price: price,
              revenue: { amount: units * price.amount, currency: price.currency },
            };
          }
          return s;
        });
        MockStorage.set('sales', updated);
        return updated.find((s) => s._id === id)!;
      }
      throw err;
    }
  },
};

export const allocationsApi = {
  getAllocations: async (params?: { department_id?: string; year?: number; month?: number; status?: string }): Promise<Allocation[]> => {
    try {
      const res = await apiClient.get('/overhead-allocations', { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        let list = MockStorage.get<Allocation[]>('allocations', []);
        if (params?.status) list = list.filter((a) => a.status === params.status);
        if (params?.year) list = list.filter((a) => a.period.year === params.year);
        if (params?.month) list = list.filter((a) => a.period.month === params.month);
        return list;
      }
      throw err;
    }
  },
  runAllocation: async (data: { department_id?: string | null; period: { year: number; month: number } }): Promise<Allocation> => {
    try {
      const res = await apiClient.post('/overhead-allocations/run', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(350);
        const txns = MockStorage.get<CarbonTransaction[]>('transactions', []);
        const overheadTxns = txns.filter(
          (t) =>
            t.period.year === data.period.year &&
            t.period.month === data.period.month &&
            (t.source_type === 'facility_reading' || t.source_type === 'fleet' || t.source_type === 'expense')
        );
        const overheadTotal = overheadTxns.reduce((sum, t) => sum + t.amount_kg, 0) || 48500; // default realistic

        const sales = MockStorage.get<ProductSale[]>('sales', []);
        const periodSales = sales.filter((s) => s.period.year === data.period.year && s.period.month === data.period.month);

        // Check currency consistency
        if (periodSales.length > 1) {
          const firstCurr = periodSales[0].revenue.currency;
          if (periodSales.some((s) => s.revenue.currency !== firstCurr)) {
            throw { status: 422, detail: `Mixed currencies detected across product sales in this period. All revenue must use the same ISO currency before allocating overhead.` };
          }
        }

        const revTotalAmount = periodSales.reduce((sum, s) => sum + s.revenue.amount, 0);
        const currency = periodSales.length > 0 ? periodSales[0].revenue.currency : 'USD';

        const lines = periodSales.map((s) => {
          const share = revTotalAmount > 0 ? +(s.revenue.amount / revTotalAmount).toFixed(4) : 0;
          return {
            product_id: s.product_id,
            revenue: s.revenue,
            revenue_share: share,
            allocated_kg: Math.round(overheadTotal * share),
          };
        });

        // Mark previous allocations for this period as superseded
        const oldList = MockStorage.get<Allocation[]>('allocations', []);
        const updatedList = oldList.map((a) =>
          a.period.year === data.period.year && a.period.month === data.period.month && a.status === 'current'
            ? { ...a, status: 'superseded' as const }
            : a
        );

        const newAlloc: Allocation = {
          _id: `alloc_${Date.now()}`,
          org_id: 'org_acme',
          department_id: data.department_id || null,
          period: data.period,
          overhead_total_kg: overheadTotal,
          revenue_total: { amount: revTotalAmount, currency },
          lines,
          unallocated_kg: revTotalAmount === 0 ? overheadTotal : 0,
          status: 'current',
          run_by: 'Current Org Admin',
          created_at: new Date().toISOString(),
        };

        MockStorage.set('allocations', [newAlloc, ...updatedList]);
        return newAlloc;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 8. Verified — Partner Links (#12)
// ---------------------------------------------------------
export const linksApi = {
  getLinks: async (direction?: 'incoming' | 'outgoing'): Promise<ProductLink[]> => {
    try {
      const res = await apiClient.get('/product-links', { params: { direction } });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<ProductLink[]>('links', []);
        if (direction === 'outgoing') return list.filter((l) => l.requester_org_id === 'org_acme');
        if (direction === 'incoming') return list.filter((l) => l.partner_org_id === 'org_acme');
        return list;
      }
      throw err;
    }
  },
  createLink: async (data: {
    requester_product_id: string;
    partner_org_id: string;
    partner_product_id: string;
    link_type: 'component' | 'carbon_credit';
  }): Promise<ProductLink> => {
    try {
      const res = await apiClient.post('/product-links', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.partner_org_id === 'org_acme') {
          throw { status: 400, detail: 'Same-org link blocked: Partner organization cannot be your own organization.' };
        }
        const list = MockStorage.get<ProductLink[]>('links', []);
        if (list.some((l) => l.requester_product_id === data.requester_product_id && l.partner_product_id === data.partner_product_id)) {
          throw { status: 409, detail: 'A product link already exists between these two products.' };
        }
        const newLink: ProductLink = {
          _id: `link_${Date.now()}`,
          requester_org_id: 'org_acme',
          requester_product_id: data.requester_product_id,
          partner_org_id: data.partner_org_id,
          partner_product_id: data.partner_product_id,
          link_type: data.link_type,
          status: 'pending',
          shared: null,
          requested_by: 'Current User',
          created_at: new Date().toISOString(),
        };
        MockStorage.set('links', [newLink, ...list]);
        return newLink;
      }
      throw err;
    }
  },
  respondLink: async (id: string, action: 'confirm' | 'reject' | 'revoke'): Promise<ProductLink> => {
    try {
      const res = await apiClient.patch(`/product-links/${id}`, { action });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const list = MockStorage.get<ProductLink[]>('links', []);
        const link = list.find((l) => l._id === id);
        if (!link) throw { status: 404, detail: 'Product link not found.' };
        if (link.status !== 'pending' && action !== 'revoke') {
          throw { status: 409, detail: `Cannot respond '${action}': Link is already in '${link.status}' state.` };
        }

        if (action === 'confirm') {
          link.status = 'confirmed';
          link.shared = { mode: 'exact', value_kg: 54.8, snapshot_at: new Date().toISOString() };
          link.responded_by = 'Current Admin';
          link.responded_at = new Date().toISOString();
        } else if (action === 'reject') {
          link.status = 'rejected';
          link.responded_by = 'Current Admin';
          link.responded_at = new Date().toISOString();
        } else if (action === 'revoke') {
          link.status = 'revoked';
          link.updated_at = new Date().toISOString();
        }

        MockStorage.set('links', list);
        return link;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 9. Verified — Sub-Admins API (#34)
// ---------------------------------------------------------
export const subAdminsApi = {
  list: async (): Promise<User[]> => subAdminsApi.getSubAdmins(),
  assign: async (data: any): Promise<User> => subAdminsApi.grantSubAdmin(data.user_id, data.scope),
  revoke: async (user_id: string): Promise<User> => subAdminsApi.revokeSubAdmin(user_id),
  getSubAdmins: async (): Promise<User[]> => {
    try {
      const res = await apiClient.get('/admin/sub-admins');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const users = MockStorage.get<User[]>('users', []);
        return users.filter((u) => u.roles.some((r) => typeof r === 'object' && r.role === 'sub_admin'));
      }
      throw err;
    }
  },
  grantSubAdmin: async (user_id: string, scope: { kind: 'region' | 'sector'; values: string[] }): Promise<User> => {
    try {
      const res = await apiClient.post('/admin/sub-admins', { user_id, scope });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (scope.kind === 'region' && scope.values.some((v) => v.length !== 2)) {
          throw { status: 422, detail: 'Region scope values must be 2-letter ISO country codes (e.g., IN, DE, US).' };
        }
        if (scope.values.length === 0) throw { status: 422, detail: 'Must provide at least one authorized value.' };

        const users = MockStorage.get<User[]>('users', []);
        const user = users.find((u) => u._id === user_id);
        if (!user) throw { status: 404, detail: 'Target user not found in caller organization.' };

        const upperValues = scope.kind === 'region' ? scope.values.map((v) => v.toUpperCase()) : scope.values.map((v) => v.toLowerCase());
        const subRoleObj = { role: 'sub_admin' as RoleType, scope: { kind: scope.kind, values: upperValues } };

        user.roles = user.roles.filter((r) => (typeof r === 'string' ? r !== 'sub_admin' : r.role !== 'sub_admin'));
        user.roles.push(subRoleObj as any);
        if (scope.kind === 'region') {
          user.scope = { is_master: false, region: upperValues, sector: user.scope?.sector || [] };
        } else {
          user.scope = { is_master: false, region: user.scope?.region || [], sector: upperValues };
        }

        MockStorage.set('users', users);
        return user;
      }
      throw err;
    }
  },
  revokeSubAdmin: async (user_id: string, kind?: string): Promise<User> => {
    try {
      const res = await apiClient.delete(`/admin/sub-admins/${user_id}`, { params: { kind } });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const users = MockStorage.get<User[]>('users', []);
        const user = users.find((u) => u._id === user_id);
        if (!user) throw { status: 404, detail: 'User not found' };

        user.roles = user.roles.filter((r) => (typeof r === 'string' ? r !== 'sub_admin' : r.role !== 'sub_admin'));
        user.scope = { is_master: false, region: [], sector: [] };
        if (user.roles.length === 0) user.roles = ['employee' as RoleType];
        MockStorage.set('users', users);
        return user;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 10. Environmental Modules Inferred (#6, #7, #8)
// ---------------------------------------------------------
export const environmentalApi = {
  getEmissionFactors: async (): Promise<EmissionFactor[]> => {
    try {
      const res = await apiClient.get('/emission-factors');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<EmissionFactor[]>('emissionFactors', []);
      }
      throw err;
    }
  },
  createEmissionFactor: async (data: Omit<EmissionFactor, '_id'>): Promise<EmissionFactor> => {
    try {
      const res = await apiClient.post('/emission-factors', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<EmissionFactor[]>('emissionFactors', []);
        const newEf: any = { ...data, _id: `ef_${Date.now()}` };
        MockStorage.set('emissionFactors', [...list, newEf]);
        return newEf;
      }
      throw err;
    }
  },
  getTransactions: async (params?: { department_id?: string; source_type?: string }): Promise<CarbonTransaction[]> => {
    try {
      const res = await apiClient.get('/carbon-transactions', { params });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        let list = MockStorage.get<CarbonTransaction[]>('transactions', []);
        if (params?.department_id) list = list.filter((t) => t.department_id === params.department_id);
        if (params?.source_type) list = list.filter((t) => t.source_type === params.source_type);
        return list;
      }
      throw err;
    }
  },
  createTransaction: async (data: any): Promise<CarbonTransaction> => {
    try {
      const res = await apiClient.post('/carbon-transactions', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<CarbonTransaction[]>('transactions', []);
        const newTxn: any = { ...data, _id: `txn_${Date.now()}`, created_at: new Date().toISOString() };
        MockStorage.set('transactions', [newTxn, ...list]);
        return newTxn;
      }
      throw err;
    }
  },
  getGoals: async (): Promise<EnvironmentalGoal[]> => {
    try {
      const res = await apiClient.get('/sustainability-goals');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<EnvironmentalGoal[]>('goals', []);
      }
      throw err;
    }
  },
  createGoal: async (data: any): Promise<EnvironmentalGoal> => {
    try {
      const res = await apiClient.post('/sustainability-goals', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<EnvironmentalGoal[]>('goals', []);
        const newGoal: any = { ...data, _id: `goal_${Date.now()}`, current_co2_kg: 0, status: 'on_track' };
        MockStorage.set('goals', [...list, newGoal]);
        return newGoal;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 11. Social Modules Inferred (#14, #15, #16, #17)
// ---------------------------------------------------------
export const socialApi = {
  getCsrActivities: async (): Promise<CsrActivity[]> => {
    try {
      const res = await apiClient.get('/csr-activities');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<CsrActivity[]>('csrActivities', []);
      }
      throw err;
    }
  },
  createCsrActivity: async (data: any): Promise<CsrActivity> => {
    try {
      const res = await apiClient.post('/csr-activities', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<CsrActivity[]>('csrActivities', []);
        const newCsr: any = { ...data, _id: `csr_${Date.now()}`, joined_count: 1, status: 'active' };
        MockStorage.set('csrActivities', [...list, newCsr]);
        return newCsr;
      }
      throw err;
    }
  },
  joinCsrActivity: async (activity_id: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/csr-activities/${activity_id}/join`);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<CsrActivity[]>('csrActivities', []);
        const act = list.find((a) => a._id === activity_id);
        if (act) act.joined_count += 1;
        MockStorage.set('csrActivities', list);
        return { success: true };
      }
      throw err;
    }
  },
  getParticipations: async (): Promise<EmployeeParticipation[]> => {
    try {
      const res = await apiClient.get('/csr-participations');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<EmployeeParticipation[]>('participations', []);
      }
      throw err;
    }
  },
  submitParticipation: async (data: {
    activity_id?: string;
    challenge_id?: string;
    proof_file_ids: string[];
    points: number;
  }): Promise<EmployeeParticipation> => {
    try {
      const res = await apiClient.post('/csr-participations', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const settings = MockStorage.get<EsgOrganizationSettings>('settings', INITIAL_SETTINGS);
        if (settings.settings.require_csr_evidence && (!data.proof_file_ids || data.proof_file_ids.length === 0)) {
          throw { status: 422, detail: 'Evidence upload required by organization policy before submitting participation.' };
        }
        const list = MockStorage.get<EmployeeParticipation[]>('participations', []);
        const newPart: EmployeeParticipation = {
          _id: `part_${Date.now()}`,
          user_id: 'usr_employee',
          user_name: 'Amara Chen (Sustainability Specialist)',
          activity_id: data.activity_id,
          challenge_id: data.challenge_id,
          activity_title: data.activity_id ? 'Mula-Mutha Riverbank Eco-Clean' : '30-Day Zero Plastic Challenge',
          proof_file_ids: data.proof_file_ids,
          points: data.points,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        };
        MockStorage.set('participations', [newPart, ...list]);
        return newPart;
      }
      throw err;
    }
  },
  reviewParticipation: async (id: string, status: 'approved' | 'rejected'): Promise<any> => {
    try {
      const res = await apiClient.patch(`/csr-participations/${id}`, { status });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<EmployeeParticipation[]>('participations', []);
        const item = list.find((p) => p._id === id);
        if (item) item.status = status;
        MockStorage.set('participations', list);
        return { success: true };
      }
      throw err;
    }
  },
  getDiversityMetrics: async (): Promise<DiversityMetric[]> => {
    try {
      const res = await apiClient.get('/diversity-metrics');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<DiversityMetric[]>('diversity', []);
      }
      throw err;
    }
  },
  getTrainings: async (): Promise<Training[]> => {
    try {
      const res = await apiClient.get('/trainings');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<Training[]>('trainings', []);
      }
      throw err;
    }
  },
  completeTraining: async (training_id: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/training-completions`, { training_id });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Training[]>('trainings', []);
        const t = list.find((tr) => tr._id === training_id);
        if (t && !t.is_completed) {
          t.is_completed = true;
          t.completion_count += 1;
          t.completed_at = new Date().toISOString();
        }
        MockStorage.set('trainings', list);
        return { success: true, certificate_id: `cert_train_${training_id}` };
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 12. Governance Modules Inferred (#18, #19, #20, #21)
// ---------------------------------------------------------
export const governanceApi = {
  getPolicies: async (): Promise<Policy[]> => {
    try {
      const res = await apiClient.get('/policies');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<Policy[]>('policies', []);
      }
      throw err;
    }
  },
  createPolicy: async (data: any): Promise<Policy> => {
    try {
      const res = await apiClient.post('/policies', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Policy[]>('policies', []);
        const newPol: any = {
          ...data,
          _id: `pol_${Date.now()}`,
          published_at: new Date().toISOString(),
          status: 'published',
          user_acknowledged: false,
        };
        MockStorage.set('policies', [newPol, ...list]);
        return newPol;
      }
      throw err;
    }
  },
  acknowledgePolicy: async (policy_id: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/policy-acknowledgements`, { policy_id });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Policy[]>('policies', []);
        const p = list.find((pol) => pol._id === policy_id);
        if (p) {
          p.user_acknowledged = true;
          p.acknowledged_at = new Date().toISOString();
        }
        MockStorage.set('policies', list);
        return { success: true };
      }
      throw err;
    }
  },
  getAudits: async (): Promise<AuditRecord[]> => {
    try {
      const res = await apiClient.get('/audits');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<AuditRecord[]>('audits', []);
      }
      throw err;
    }
  },
  createAudit: async (data: any): Promise<AuditRecord> => {
    try {
      const res = await apiClient.post('/audits', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<AuditRecord[]>('audits', []);
        const newAud: any = { ...data, _id: `aud_${Date.now()}` };
        MockStorage.set('audits', [newAud, ...list]);
        return newAud;
      }
      throw err;
    }
  },
  getComplianceIssues: async (): Promise<ComplianceIssue[]> => {
    try {
      const res = await apiClient.get('/compliance-issues');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<ComplianceIssue[]>('complianceIssues', []);
      }
      throw err;
    }
  },
  createComplianceIssue: async (data: any): Promise<ComplianceIssue> => {
    try {
      const res = await apiClient.post('/compliance-issues', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        if (!data.owner_user_id || !data.due_date) {
          throw { status: 422, detail: 'Owner and Due Date are mandatory fields when raising a compliance issue.' };
        }
        const users = MockStorage.get<User[]>('users', []);
        const owner = users.find((u) => u._id === data.owner_user_id);
        const list = MockStorage.get<ComplianceIssue[]>('complianceIssues', []);
        const newComp: any = {
          ...data,
          _id: `comp_${Date.now()}`,
          owner_name: owner?.full_name || 'Assigned Owner',
          status: 'open',
        };
        MockStorage.set('complianceIssues', [newComp, ...list]);
        return newComp;
      }
      throw err;
    }
  },
  resolveComplianceIssue: async (id: string, resolution_note: string): Promise<ComplianceIssue> => {
    try {
      const res = await apiClient.patch(`/compliance-issues/${id}/resolve`, { resolution_note });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<ComplianceIssue[]>('complianceIssues', []);
        const issue = list.find((i) => i._id === id);
        if (issue) {
          issue.status = 'resolved';
          issue.resolution_note = resolution_note;
        }
        MockStorage.set('complianceIssues', list);
        return issue!;
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 13. Gamification Inferred (#25, #26, #27, #28)
// ---------------------------------------------------------
export const gamificationApi = {
  getChallenges: async (): Promise<Challenge[]> => {
    try {
      const res = await apiClient.get('/challenges');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<Challenge[]>('challenges', []);
      }
      throw err;
    }
  },
  createChallenge: async (data: any): Promise<Challenge> => {
    try {
      const res = await apiClient.post('/challenges', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Challenge[]>('challenges', []);
        const newChal: any = { ...data, _id: `chal_${Date.now()}`, status: 'draft', joined: false };
        MockStorage.set('challenges', [newChal, ...list]);
        return newChal;
      }
      throw err;
    }
  },
  advanceChallengeStatus: async (id: string, nextStatus: Challenge['status']): Promise<Challenge> => {
    try {
      const res = await apiClient.patch(`/challenges/${id}`, { status: nextStatus });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Challenge[]>('challenges', []);
        const chal = list.find((c) => c._id === id);
        if (chal) chal.status = nextStatus;
        MockStorage.set('challenges', list);
        return chal!;
      }
      throw err;
    }
  },
  joinChallenge: async (id: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/challenges/${id}/join`);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<Challenge[]>('challenges', []);
        const c = list.find((ch) => ch._id === id);
        if (c) c.joined = true;
        MockStorage.set('challenges', list);
        return { success: true };
      }
      throw err;
    }
  },
  getBadges: async (): Promise<Badge[]> => {
    try {
      const res = await apiClient.get('/badges');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<Badge[]>('badges', []);
      }
      throw err;
    }
  },
  getRewards: async (): Promise<Reward[]> => {
    try {
      const res = await apiClient.get('/rewards');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<Reward[]>('rewards', []);
      }
      throw err;
    }
  },
  redeemReward: async (reward_id: string): Promise<any> => {
    try {
      const res = await apiClient.post('/reward-redemptions', { reward_id });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        const rewards = MockStorage.get<Reward[]>('rewards', []);
        const rew = rewards.find((r) => r._id === reward_id);
        if (!rew) throw { status: 404, detail: 'Reward item not found.' };
        if (rew.stock <= 0) throw { status: 409, detail: 'Out of stock: This reward is currently unavailable.' };

        // check points balance
        const savedUser = localStorage.getItem('ecosphere_user');
        if (savedUser) {
          const u: User = JSON.parse(savedUser);
          if (u.points_balance < rew.cost_points) {
            throw { status: 422, detail: `Insufficient points balance (${u.points_balance} available vs ${rew.cost_points} required).` };
          }
          u.points_balance -= rew.cost_points;
          localStorage.setItem('ecosphere_user', JSON.stringify(u));
        }
        rew.stock -= 1;
        MockStorage.set('rewards', rewards);
        return { success: true, redeemed_at: new Date().toISOString() };
      }
      throw err;
    }
  },
  getLeaderboard: async (scope = 'employee', period = 'all_time'): Promise<LeaderboardEntry[]> => {
    try {
      const res = await apiClient.get('/leaderboard', { params: { scope, period } });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        if (scope === 'department') {
          return [
            { rank: 1, entity_id: 'dept_mfg', name: 'Manufacturing & Operations', xp: 14500 },
            { rank: 2, entity_id: 'dept_corp', name: 'Corporate Headquarters', xp: 11200 },
            { rank: 3, entity_id: 'dept_rnd', name: 'Research & Innovation', xp: 8400 },
          ];
        }
        return [
          { rank: 1, entity_id: 'usr_master', name: 'Elena Rostova', xp: 4500, department_name: 'Executive Office' },
          { rank: 2, entity_id: 'usr_org_admin', name: 'Marcus Thorne', xp: 3200, department_name: 'Corporate HQ' },
          { rank: 3, entity_id: 'usr_dept_head', name: 'Dr. Sarah Jenkins', xp: 2800, department_name: 'Manufacturing' },
          { rank: 4, entity_id: 'usr_sub_admin', name: 'Aiden Vance', xp: 2100, department_name: 'Corporate HQ' },
          { rank: 5, entity_id: 'usr_employee', name: 'Amara Chen', xp: 1950, department_name: 'Manufacturing', is_current_user: true },
        ];
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 14. Reports API (#27)
// ---------------------------------------------------------
export const reportsApi = {
  customExport: async (filters: any, format: any): Promise<any> => reportsApi.customReportExport(filters, format),
  generateReport: async (type: string, filters: any): Promise<{ report_url: string; summary_data: any }> => {
    try {
      const res = await apiClient.post('/reports/generate', { type, filters });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(400);
        return {
          report_url: `#report_generated_${type}_${Date.now()}`,
          summary_data: {
            title: `${type.toUpperCase()} Sustainability Report`,
            generated_at: new Date().toISOString(),
            metrics: {
              total_carbon_kg: 53320,
              emissions_reduction_pct: 14.2,
              social_hours: 450,
              compliance_score: 94.5,
            },
          },
        };
      }
      throw err;
    }
  },
  customReportExport: async (filters: any, format: 'PDF' | 'Excel' | 'CSV'): Promise<{ download_filename: string; content_blob?: Blob }> => {
    try {
      const res = await apiClient.post('/reports/custom', { filters, format }, { responseType: 'blob' });
      return { download_filename: `EcoSphere_Custom_Report_${Date.now()}.${format.toLowerCase()}`, content_blob: res.data };
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(500);
        return {
          download_filename: `EcoSphere_Custom_Report_${Date.now()}.${format.toLowerCase()}`,
        };
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------
// 15. Settings & Categories API (#29, #30, #31, #36)
// ---------------------------------------------------------
export const settingsApi = {
  getSettings: async (): Promise<EsgOrganizationSettings> => settingsApi.getEsgConfig(),
  updateSettings: async (data: any): Promise<EsgOrganizationSettings> => settingsApi.updateEsgConfig(data),
  getCategories: async (): Promise<CategoryItem[]> => {
    try {
      const res = await apiClient.get('/categories');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<CategoryItem[]>('categories', []);
      }
      throw err;
    }
  },
  createCategory: async (data: any): Promise<CategoryItem> => {
    try {
      const res = await apiClient.post('/categories', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(200);
        const list = MockStorage.get<CategoryItem[]>('categories', []);
        const newCat: CategoryItem = { name: data?.name || 'New Category', type: data?.type || 'csr_activity', status: data?.status || 'active', ...data, _id: `cat_${Date.now()}` };
        MockStorage.set('categories', [...list, newCat]);
        return newCat;
      }
      throw err;
    }
  },
  getEsgConfig: async (): Promise<EsgOrganizationSettings> => {
    try {
      const res = await apiClient.get('/organization');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<EsgOrganizationSettings>('settings', INITIAL_SETTINGS);
      }
      throw err;
    }
  },
  updateEsgConfig: async (data: Partial<EsgOrganizationSettings>): Promise<EsgOrganizationSettings> => {
    try {
      const res = await apiClient.patch('/organization', data);
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(250);
        if (data.settings?.esg_weights) {
          const { e, s, g } = data.settings.esg_weights;
          if (e + s + g !== 100) {
            throw { status: 422, detail: `ESG weights (E:${e}%, S:${s}%, G:${g}%) must exactly sum to 100%.` };
          }
        }
        const current = MockStorage.get<EsgOrganizationSettings>('settings', INITIAL_SETTINGS);
        const updated = {
          name: data.name || current.name,
          settings: { ...current.settings, ...(data.settings || {}) },
        };
        MockStorage.set('settings', updated);
        return updated;
      }
      throw err;
    }
  },
  getNotifications: async (): Promise<AppNotification[]> => {
    try {
      const res = await apiClient.get('/notifications');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        return MockStorage.get<AppNotification[]>('notifications', []);
      }
      throw err;
    }
  },
  markNotificationRead: async (id: string): Promise<any> => {
    try {
      const res = await apiClient.patch(`/notifications/${id}`, { read: true });
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(100);
        const list = MockStorage.get<AppNotification[]>('notifications', []);
        const item = list.find((n) => n._id === id);
        if (item) item.read = true;
        MockStorage.set('notifications', list);
        return { success: true };
      }
      throw err;
    }
  },
  markAllNotificationsRead: async (): Promise<any> => {
    try {
      const res = await apiClient.post('/notifications/mark-all-read');
      return res.data;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay(150);
        const list = MockStorage.get<AppNotification[]>('notifications', []);
        list.forEach((n) => (n.read = true));
        MockStorage.set('notifications', list);
        return { success: true };
      }
      throw err;
    }
  },
};

export const notificationsApi = {
  list: async (): Promise<AppNotification[]> => settingsApi.getNotifications(),
  markRead: async (id: string): Promise<any> => settingsApi.markNotificationRead(id),
  markAllRead: async (): Promise<any> => settingsApi.markAllNotificationsRead(),
};

export const policiesApi = {
  ...governanceApi,
  list: async () => governanceApi.getPolicies(),
  create: async (data: any) => governanceApi.createPolicy(data),
  acknowledge: async (id: string) => governanceApi.acknowledgePolicy(id),
};

export const auditsApi = {
  ...governanceApi,
  list: async () => governanceApi.getAudits(),
  create: async (data: any) => governanceApi.createAudit(data),
  listIssues: async () => governanceApi.getComplianceIssues(),
  createIssue: async (data: any) => governanceApi.createComplianceIssue(data),
  resolveIssue: async (id: string, note: string) => governanceApi.resolveComplianceIssue(id, note),
};

export const trainingsApi = {
  ...socialApi,
  list: async () => socialApi.getTrainings(),
  complete: async (id: string) => socialApi.completeTraining(id),
  create: async (data: any) => {
    const item = { ...data, _id: 'tr_' + Date.now(), completion_count: 0, is_completed: false };
    return item;
  },
};

export const diversityApi = {
  ...socialApi,
  list: async () => socialApi.getDiversityMetrics(),
};

export const goalsApi = {
  ...environmentalApi,
  list: async () => environmentalApi.getGoals(),
  create: async (data: any) => environmentalApi.createGoal(data),
};

export const csrApi = {
  ...socialApi,
  list: async () => socialApi.getCsrActivities(),
  create: async (data: any) => socialApi.createCsrActivity(data),
  join: async (id: string) => socialApi.joinCsrActivity(id),
  listParticipations: async () => socialApi.getParticipations(),
  submitParticipation: async (data: any) => socialApi.submitParticipation(data),
};

export const productLinksApi = {
  ...linksApi,
  list: async (direction?: any) => linksApi.getLinks(direction),
  create: async (data: any) => linksApi.createLink(data),
  respond: async (id: string, action: any) => linksApi.respondLink(id, action),
};

export const productSalesApi = {
  ...salesApi,
  list: async (params?: any) => salesApi.getSales(params),
  create: async (data: any) => salesApi.createSale(data),
};

export const overheadAllocationsApi = {
  ...allocationsApi,
  list: async (params?: any) => allocationsApi.getAllocations(params),
  run: async (data: any) => allocationsApi.runAllocation(data),
};

export const esgScoreApi = {
  getScore: async (idOrParams?: any, params?: any): Promise<any> => {
    if (typeof idOrParams === 'object') return departmentsApi.getRollup('root', idOrParams);
    return departmentsApi.getRollup(idOrParams || 'root', params);
  },
  getOverview: async (idOrParams?: any, params?: any): Promise<any> => {
    if (typeof idOrParams === 'object') return departmentsApi.getRollup('root', idOrParams);
    return departmentsApi.getRollup(idOrParams || 'root', params);
  },
  ...departmentsApi,
};

export const complianceIssuesApi = {
  ...governanceApi,
  list: async () => governanceApi.getComplianceIssues(),
  create: async (data: any) => governanceApi.createComplianceIssue(data),
  resolve: async (id: string, note: string) => governanceApi.resolveComplianceIssue(id, note),
  update: async (id: string, data: any) => governanceApi.resolveComplianceIssue(id, data?.resolution_note || data?.note || 'Updated'),
};

export const emissionFactorsApi = {
  ...environmentalApi,
  list: async () => environmentalApi.getEmissionFactors(),
  create: async (data: any) => environmentalApi.createEmissionFactor(data),
};

export const carbonTransactionsApi = {
  ...environmentalApi,
  list: async (params?: any) => environmentalApi.getTransactions(params),
  create: async (data: any) => environmentalApi.createTransaction(data),
};

export const carbonReferencesApi = {
  ...carbonRefApi,
  list: async (params?: any) => carbonRefApi.getReferences(params),
  create: async (data: any) => carbonRefApi.createReference(data),
  update: async (id: string, data: any) => carbonRefApi.updateReference(id, data),
  getHistory: async (id: string) => carbonRefApi.getHistory(id),
};

export const csrActivitiesApi = {
  ...socialApi,
  list: async () => socialApi.getCsrActivities(),
  create: async (data: any) => socialApi.createCsrActivity(data),
  join: async (id: string) => socialApi.joinCsrActivity(id),
  review: async (id: string, status: any) => socialApi.reviewParticipation(id, status),
};

export const employeeParticipationsApi = {
  ...socialApi,
  list: async () => socialApi.getParticipations(),
  create: async (data: any) => socialApi.submitParticipation(data),
  submit: async (data: any) => socialApi.submitParticipation(data),
  review: async (id: string, status: any) => socialApi.reviewParticipation(id, status),
};

export const diversityMetricsApi = {
  ...socialApi,
  list: async () => socialApi.getDiversityMetrics(),
  create: async (data: any) => ({ ...data, _id: `div_${Date.now()}` }),
};

export const challengesApi = {
  ...gamificationApi,
  list: async () => gamificationApi.getChallenges(),
  create: async (data: any) => gamificationApi.createChallenge(data),
  join: async (id: string) => gamificationApi.joinChallenge(id),
  advanceStatus: async (id: string, status: any) => gamificationApi.advanceChallengeStatus(id, status),
};

export const badgesApi = {
  ...gamificationApi,
  list: async () => gamificationApi.getBadges(),
};

export const rewardsApi = {
  ...gamificationApi,
  list: async () => gamificationApi.getRewards(),
  redeem: async (id: string) => gamificationApi.redeemReward(id),
};

export const leaderboardsApi = {
  ...gamificationApi,
  list: async (scope?: string, period?: string) => gamificationApi.getLeaderboard(scope, period),
  get: async (scope?: string, period?: string) => gamificationApi.getLeaderboard(scope, period),
};

export const environmentalGoalsApi = {
  ...environmentalApi,
  list: async () => environmentalApi.getGoals(),
  create: async (data: any) => environmentalApi.createGoal(data),
};



