# EcoSphere ESG Platform — Frontend Build Specification (End to End)

This is a **standalone** document. A developer (or LLM) with no access to the brief, the
wireframes, or the backend source can build the entire EcoSphere web frontend from this alone.
Everything the frontend talks to is described here, including exact request/response shapes.

**Provenance of each requirement:**
- **[Verified]** — the backend endpoint/behaviour exists and was audited in code (Phases 11–15:
  departments, facilities, city-profiles, products, carbon-reference, product-sales,
  overhead-allocations, product-links, sub-admins, health).
- **[Inferred]** — the module exists in the product brief/wireframes (Phases 1–10: auth, the
  four ESG modules, reports, settings) but the exact HTTP contract was not available to this
  document; the endpoint shape given is the best inference following the platform's established
  conventions. Treat field names as provisional and confirm against the running API.

> **Note on scope:** the user's original section list was truncated after "1. Complete page
> list". Sections 2–17 below are inferred to make this a complete, buildable frontend spec.

---

## Platform facts the whole frontend depends on

- **Stack:** React + TypeScript + Vite, mobile-responsive, no native app. A Vite skeleton
  already exists (`frontend/`); everything below is net-new.
- **API base:** all endpoints are under `/api` (e.g. `/api/departments`). Configure the base
  URL from an env var (`VITE_API_BASE_URL`), never hardcode.
- **Auth transport:** every authenticated request sends `Authorization: Bearer <access_token>`.
  Access tokens are short-lived JWTs; a long-lived refresh token keeps the session alive
  (users explicitly must NOT be forced to re-authenticate frequently).
- **Tenancy:** every request is implicitly scoped to the caller's organization server-side; the
  frontend never sends `org_id`. Global reference data (city profiles, carbon reference) is
  cross-org and read-only to most users.
- **IDs** are 24-char hex strings. **Money** is `{ amount: number, currency: string(ISO-4217) }`.
  **Period** is `{ year: number, month: number }`. **Carbon** is always kilograms CO2e
  (`amount_kg`, float; positive = emission, negative = offset). Display tonnes where the
  wireframe shows "t" — convert `kg / 1000`.
- **Roles** (on the user's `roles` array): `master_admin`, `org_admin`, `dept_head`,
  `employee`, `sub_admin` (carries a `scope`), and reserved `ngo_member`. A user may hold
  several roles.
- **HTTP error contract:** errors return `{ "detail": "<message>" }`. Status meanings used
  across the API: `400` bad input, `401` missing/expired token, `403` insufficient
  role/scope, `404` not found (or cross-org access), `409` conflict (duplicate / invalid state
  transition / integrity guard), `422` unprocessable (validation / business rule).

---

## 1. Complete page list

Every page, its route, nav group, who can see it, and its one-line purpose. "Access" lists the
roles for which the page (or its primary actions) is meaningful; read-only visibility may be
broader. Routes are a recommendation; keep them stable.

### Public / unauthenticated
| # | Page | Route | Purpose |
|---|------|-------|---------|
| 1 | Login | `/login` | Email + password, then email OTP step. |
| 2 | Register | `/register` | Create account; email OTP verification. |
| 3 | Verify OTP | `/verify-otp` | Enter the 6-digit code (shared step for login/register/reset). |
| 4 | Forgot / Reset password | `/forgot-password`, `/reset-password` | Request + complete password reset via OTP. |

### Dashboard
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 5 | Executive Dashboard | `/` | Dashboard | all | E/S/G/overall scores, emissions trend, department ranking, recent activity, quick actions. |

### Environmental
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 6 | Emission Factors | `/environmental/emission-factors` | Environmental | org_admin | Configure org emission factors. |
| 7 | Carbon Transactions | `/environmental/carbon-transactions` | Environmental | org_admin, dept_head | View/log carbon ledger entries. |
| 8 | Environmental Goals | `/environmental/goals` | Environmental | org_admin, dept_head | Sustainability targets with progress. |
| 9 | Product ESG Profiles | `/environmental/products` | Environmental | org_admin, dept_head | Register products, calculate/adopt carbon, record production, sales. **[Verified]** |
| 10 | Facilities | `/environmental/facilities` | Environmental | org_admin, dept_head | Offices/facilities + monthly readings. **[Verified]** |
| 11 | Overhead Allocation | `/environmental/allocation` | Environmental | org_admin, dept_head | Run/inspect revenue-share overhead allocation. **[Verified]** |
| 12 | Partner Links | `/environmental/partner-links` | Environmental | org_admin, dept_head | Cross-company product/carbon links. **[Verified]** |
| 13 | Environmental Dashboard | `/environmental` (index) | Environmental | all | Module landing: emissions by dept/source, goal progress. |

### Social
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 14 | CSR Activities | `/social/csr` | Social | all (join), org_admin/dept_head (create) | Activity catalog + join. |
| 15 | Employee Participation | `/social/participation` | Social | dept_head, org_admin (approve); all (own) | Proof upload + approval queue. |
| 16 | Diversity Dashboard | `/social/diversity` | Social | org_admin, dept_head | Diversity metrics by period/dimension. |
| 17 | Training Completion | `/social/training` | Social | all | Trainings + completion tracking. |

### Governance
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 18 | Policies | `/governance/policies` | Governance | org_admin (manage), all (read/ack) | Versioned ESG policies. |
| 19 | Policy Acknowledgements | `/governance/acknowledgements` | Governance | all | Acknowledge policies; track who has. |
| 20 | Audits | `/governance/audits` | Governance | org_admin | Governance audits. |
| 21 | Compliance Issues | `/governance/compliance` | Governance | org_admin, owner | Issues with owner/due/overdue flag. |

### Gamification
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 22 | Challenges | `/gamification/challenges` | Gamification | all (join), org_admin (manage) | Challenge lifecycle board. |
| 23 | Challenge Participation | `/gamification/participation` | Gamification | dept_head/org_admin (review); all (own) | Submissions, approval, certificates. |
| 24 | Badges | `/gamification/badges` | Gamification | all | Badge gallery + unlock rules. |
| 25 | Rewards | `/gamification/rewards` | Gamification | all (redeem), org_admin (manage) | Rewards catalog, redeem with points. |
| 26 | Leaderboard | `/gamification/leaderboard` | Gamification | all | Employee & department XP ranking. |

### Reports
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 27 | Reports & Custom Builder | `/reports` | Reports | org_admin, dept_head | Generate module/ESG reports + custom builder + export. |

### Settings & Administration
| # | Page | Route | Nav group | Access | Purpose |
|---|------|-------|-----------|--------|---------|
| 28 | Departments | `/settings/departments` | Settings | org_admin, dept_head (subtree) | Department tree + rollup drilldown. **[Verified]** |
| 29 | Categories | `/settings/categories` | Settings | org_admin | CSR/Challenge category master. |
| 30 | ESG Configuration | `/settings/esg-config` | Settings | org_admin | Org toggles + weights. |
| 31 | Notification Settings | `/settings/notifications` | Settings | all (own), org_admin (org) | Channel/prefs toggles. |
| 32 | City Profiles (admin) | `/settings/city-profiles` | Settings | master_admin, region sub_admin | Global commute/grid reference data. **[Verified]** |
| 33 | Carbon Reference (admin) | `/settings/carbon-reference` | Settings | master_admin, scoped sub_admin | Global carbon reference table + history. **[Verified]** |
| 34 | Sub-Admins | `/settings/sub-admins` | Settings | master_admin | Grant/revoke scoped admin roles. **[Verified]** |
| 35 | Profile / Account | `/account` | (top-bar menu) | all | Own profile, password change, sessions/logout. |
| 36 | Notifications Center | `/notifications` | (top-bar bell) | all | In-app notification list. |

**Global overlays (not routes):** Department Rollup drawer/modal (opened from #28 and the
Dashboard ranking), and toast notifications.

---

## 2. Global layout, navigation, and routing

**App shell** (persists across all authenticated pages):
- **Left sidebar** with the fixed nav groups in this order: **Dashboard, Environmental,
  Social, Governance, Gamification, Reports, Settings**. Environmental / Social / Governance /
  Gamification / Reports / Settings expand to show their sub-items (the pages above). Collapse
  to icons on narrow viewports; hamburger toggle on mobile.
- **Top bar**: org name, global search (optional), a **notifications bell** (unread count →
  page #36), and a **user menu** (name, role chips, "Account", "Log out").
- **Content area** renders the active route.

**Nav item visibility by role:** hide nav items a role cannot use rather than showing then
403-ing. E.g. `employee` sees Dashboard, Social (CSR/training/own participation), Gamification,
their own notifications/account — not Settings admin pages, not Emission Factors. Resolve
visibility from the user's roles (see §5). Sub-admin-only pages (City Profiles, Carbon
Reference, Sub-Admins) appear under Settings only for `master_admin`/`sub_admin`.

**Routing rules:**
- Unauthenticated users are redirected to `/login` from any protected route (preserve the
  intended path and return after login).
- Authenticated users hitting `/login` are redirected to `/`.
- Unknown routes → a 404 page inside the shell.
- Deep links must work (e.g. `/environmental/facilities/<id>`), so a facility/product/challenge
  detail is its own route or a route-addressable drawer.

---

## 3. Authentication & session handling

**Flows** (endpoints **[Inferred]** — confirm names against API):
- **Register:** `POST /api/auth/register` `{ email, password, full_name, org_id? }` → triggers
  an email OTP. Then Verify OTP.
- **Login:** `POST /api/auth/login` `{ email, password }` → if OTP required, returns a pending
  state; user completes `POST /api/auth/verify-otp` `{ email, code, purpose:"login" }` →
  `{ access_token, refresh_token, user }`.
- **OTP:** 6-digit code, ~10-min expiry, limited attempts. Show resend with a cooldown timer.
- **Refresh:** `POST /api/auth/refresh` `{ refresh_token }` → new `access_token` (sliding
  expiry). The API client must transparently refresh on a 401 once, then retry the original
  request; if refresh fails, hard-logout to `/login`.
- **Logout:** `POST /api/auth/logout` (revokes the refresh session), then clear local tokens.
- **Password reset:** `POST /api/auth/forgot-password` `{ email }` → OTP → `POST
  /api/auth/reset-password` `{ email, code, new_password }`.

**Session storage:** keep the access token in memory; persist the refresh token in a secure,
long-lived store (httpOnly cookie if the backend sets one; otherwise `localStorage` with the
understanding it survives reloads — the brief's hard requirement is "stays logged in, no
frequent re-auth"). On app boot, if a refresh token exists, silently refresh before rendering
protected UI.

**Current user:** `GET /api/auth/me` **[Inferred]** returns the `users` document (id, org_id,
email, full_name, department_id, roles[], status, xp_total, points_balance). Cache it in an
auth context; every page reads roles from here. Also fetch `GET /api/me/scope` **[Verified]**
for reference-edit gating (returns `{ is_master: bool, region: string[], sector: string[] }`).

---

## 4. Design system & shared components (reuse vs. build new)

Build this component library **first**; every page composes it. Style for both light and dark.

| Component | Responsibility | Key props / states |
|---|---|---|
| `AppShell` | Sidebar + top bar + content outlet | active nav, role-filtered items |
| `DataTable` | Sortable columns, per-row actions (View/Edit/Delete), pagination, empty/loading/error slots | columns, rows, onSort, actions, isLoading, error |
| `Tabs` | In-page tab switcher (module sub-sections) | tabs, active, onChange (sync to URL query/hash) |
| `Modal` | Centered dialog for create/edit forms | open, title, onClose, footer actions |
| `Drawer` | Side panel (rollup, history, detail) | open, side, onClose |
| `Wizard` | Multi-step form (challenge create, partner-link create, custom report) | steps, current, next/back/submit, per-step validation |
| `ConfirmDialog` | Destructive-action confirmation | message, confirmLabel, onConfirm |
| `StatusBadge` | Colored pill for statuses/severity | value → color map (see §7) |
| `PeriodFilter` | Year + optional month, or from/to range | value, onChange |
| `MoneyInput` | Amount + currency select | value {amount,currency}, onChange (amount ≥ 0) |
| `SearchBox` | Debounced text/entity search (users, products, orgs) | onSearch, results, onPick |
| `MultiSelect` | Multi-value chips (countries, categories) | options, value, onChange |
| `TreeView` | Expandable indented hierarchy (departments) | nodes, renderNodeActions, onToggle |
| `KpiTile` | Big-number stat card with label/trend | label, value, delta, color |
| `Chart` set | Line (trend), Bar (ranking/breakdown), Donut/Progress (scores/goal progress) | data, series, a11y labels |
| `FileUpload` | Drag/drop or picker → uploads via files API; shows thumbnail/name | purpose, accept, onUploaded(fileId) |
| `FilePreview` | Render/download an uploaded file by id | fileId |
| `Toast` | Transient success/error feedback | type, message |
| `EmptyState` | "Nothing here yet" with optional CTA | title, description, action |
| `ErrorState` | Inline error with retry | message, onRetry |
| `Skeleton` | Loading placeholders (rows, tiles, cards) | shape |
| `RoleGate` | Renders children only if the user holds a role/scope | roles?, requireScope? |

**Charts:** before writing any chart, adopt a single consistent, accessible palette and mark
system (see §9). Categorical colors for the four ESG pillars should be stable across the app.

---

## 5. Role-based UI gating & permissions

Resolve capabilities from the user's `roles` and `/api/me/scope`. The frontend mirrors the
server's rules (server is authoritative; UI gating is UX, not security):

- **master_admin** — everything, all orgs' global reference tables editable, Sub-Admins page.
- **org_admin** — full access within the org: all module management, Settings (except
  Sub-Admins which is master-only), org-level creates (facilities/products with no department,
  full-org allocation runs).
- **dept_head** — manage resources **within their own department subtree only**: create
  sub-departments, assign heads/members, create/edit facilities/products/sales/links whose
  department is theirs or a descendant, run allocations scoped to their subtree. **Cannot** act
  on org-level (department-less) resources. Show/enable these actions only for their subtree.
- **employee** — participate (join CSR/challenges, upload proof, complete training, acknowledge
  policies, redeem rewards), view dashboards/leaderboards, own account/notifications. No
  management actions; no Settings admin.
- **sub_admin** — additionally may edit reference rows **in scope**: region scope → city
  profiles and carbon-reference rows whose `country` ∈ scope; sector scope → carbon-reference
  rows whose `product_category` ∈ scope (sector sub-admins **cannot** edit city profiles). Use
  `/api/me/scope` to enable/disable the per-row Edit control; disabled rows show a tooltip
  "Outside your assigned scope."

**Gating pattern:** wrap actions in `RoleGate`; for reference tables, additionally check the
row against `/api/me/scope`. Never rely on hiding alone — always handle a 403 gracefully
(toast: "You don't have permission for this action").

---

## 6. API integration layer

Build one typed API client: injects the bearer token, maps non-2xx to a typed error
(`{ status, detail }`), performs the single silent-refresh-on-401 retry, and exposes
per-resource modules. Below is the catalog. **[Verified]** shapes are exact; **[Inferred]**
are provisional.

### 6.1 Verified — Phases 11–15

**Departments** (`/api/departments`)
- `GET /tree?root_id=` → `TreeNode[]` where `TreeNode = { _id, name, code, head: {_id, full_name, email}|null, employee_count, status, children: TreeNode[] }`.
- `POST /` (201) body `{ name, code, parent_id?: id|null, head_user_id?: id|null, employee_count?: number }` → `Department = { _id, org_id, name, code, parent_id, ancestors: id[], head_user_id, employee_count, status: "active"|"archived", created_at, updated_at }`. Errors: 403 (non-admin/non-dept_head, or outside subtree), 404 (parent), 409 (duplicate sibling name).
- `GET /{id}/subtree-ids` → `string[]` (self + descendants). 403 if outside caller's subtree.
- `GET /{id}/rollup?year=&month=&from_year=&from_month=&to_year=&to_month=` → `Rollup = { department_id, period, total_carbon_kg, emissions_kg, offsets_kg, esg: {e,s,g,total}, xp_total, open_compliance_issues, direct: ChildEntry, by_child: ChildEntry[] }`, `ChildEntry = { department_id, name, total_carbon_kg, emissions_kg, offsets_kg, xp_total }`. `direct` + Σ`by_child` = subtree total.
- `POST /{id}/assign-head` body `{ user_id }`. `POST /{id}/members` body `{ user_id }`.
- `PATCH /{id}` body any of `{ name, code, employee_count, status: "active"|"archived", parent_id, head_user_id }`. Move → 409 on cycle or sibling-name collision; archive via status → 409 if it has active children/assigned users.
- `DELETE /{id}` → archive; 409 if it has active children or assigned users.

**Facilities** (`/api/facilities`)
- `GET ?department_id=` → `Facility[]`, `Facility = { _id, org_id, department_id: id|null, name, country, city, employee_count, status: "active"|"closed", created_at, updated_at }`.
- `POST /` (201) body `{ name, country(2-letter), city, department_id?, employee_count }` → `Facility & { warning?: string }` (warning present when the city has no profile yet). 403 for non-admin creating org-level.
- `GET /{id}`, `PATCH /{id}` body `{ name?, country?, city?, department_id?, employee_count?, status?: "active"|"closed" }`, `DELETE /{id}` (close).
- `POST /{id}/readings` body `{ period:{year,month}, inputs: { electricity_kwh?: number, electricity_bill?: {amount,currency}, employee_count_override?: number } }` → `Reading = { _id, org_id, facility_id, department_id, period, inputs, computed: { commute_kg, electricity_kg, total_kg, city_profile_id, is_approximation, assumptions: { avg_commute_km_per_day, transport_mix, grid_renewable_pct, grid_factor_kg_per_kwh, working_days_per_month, employees_used } }, created_by, created_at, updated_at }`. Errors 422: no city profile / bill without tariff / currency mismatch / neither kwh nor bill.
- `GET /{id}/readings` → `Reading[]`.

**City Profiles** (`/api/city-profiles`, global)
- `GET ?country=&city=&year=` → `CityProfile[]`.
- `POST /` (201) body `{ country(2), city, year, avg_commute_km_per_day, transport_mix: [{mode: "car"|"bus"|"rail"|"two_wheeler"|"walk", share(0..1), factor_kg_per_km}], grid_renewable_pct(0..1), grid_factor_kg_per_kwh, electricity_tariff_per_kwh?: {amount,currency}, working_days_per_month(1..31), source? }`. 403 if not master/region-sub_admin; 409 duplicate (country,city,year).
- `PATCH /{id}` subset of the above.

**Products** (`/api/products`)
- `GET ?status=&category=` → `Product[]`, `Product = { _id, org_id, department_id, name, category, description, production_country, production_city, unit_price:{amount,currency}, carbon: ProductCarbon|null, status: "active"|"discontinued", ... }`, `ProductCarbon = { per_unit_kg, reference_id: id|null, match_tier: 0..4, is_approximation, unit, calculated_at, source_link_id: id|null }`.
- `POST /` (201) body `{ name, category, description?, production_country(2), production_city, unit_price:{amount,currency}, department_id? }`.
- `GET /{id}`, `PATCH /{id}` (subset incl `status:"active"|"discontinued"`), `DELETE /{id}` (discontinue).
- `POST /{id}/calculate-carbon` body `{ year? }` → `{ product_id, carbon: ProductCarbon, matched_reference: CarbonReferenceRow }`. 422 if no reference data at all.
- `POST /{id}/record-production` body `{ period, quantity_units>0 }` → a carbon transaction. 409 if carbon not yet calculated.

**Carbon Reference** (`/api/carbon-reference`, global)
- `GET ?country=&category=&product_name=&year=` → `CarbonReferenceRow[]`, row = `{ _id, country, city: string|null, product_category, product_name: string|null, description, year, carbon_value, unit: "per_unit"|"per_kg"|"per_kwh", source, updated_by, ... }`.
- `POST /` (201) body `{ country(2), city?, product_category, product_name?, description?, year, carbon_value≥0, unit, source? }`. 403 out-of-scope; 409 duplicate.
- `PATCH /{id}` body `{ carbon_value?, description?, source?, unit? }`.
- `GET /{id}/history` → `HistoryEntry[] = { _id, reference_id, ref_collection, old_value, new_value, old_source, new_source, changed_by, changed_at }`.

**Product Sales** (`/api/product-sales`)
- `GET ?product_id=&year=&month=` → `Sale[] = { _id, org_id, product_id, department_id, period, units_sold, unit_price:{amount,currency}, revenue:{amount,currency}, ... }`.
- `POST /` (201) body `{ product_id, period, units_sold>0, unit_price:{amount,currency} }` (revenue computed server-side). 409 duplicate (product+period).
- `PATCH /{id}` body `{ units_sold?, unit_price? }`.

**Overhead Allocations** (`/api/overhead-allocations`)
- `GET ?department_id=&year=&month=&status=current|superseded` → `Allocation[]`.
- `POST /run` (201) body `{ department_id?: id|null, period }` → `Allocation = { _id, org_id, department_id, period, overhead_total_kg, revenue_total:{amount,currency}, lines: [{product_id, revenue, revenue_share(0..1), allocated_kg}], unallocated_kg, status: "current"|"superseded", run_by, created_at }`. 422 mixed currencies.
- `GET /{id}`.

**Product Links** (`/api/product-links`, `/api/products/{id}/adopt-linked-value`)
- `POST /product-links` (201) body `{ requester_product_id, partner_org_id, partner_product_id, link_type: "component"|"carbon_credit" }` → `Link`. 400 same-org; 404 partner product; 409 duplicate pair.
- `GET /product-links?direction=incoming|outgoing` → `Link[]`, `Link = { _id, requester_org_id, requester_product_id, partner_org_id, partner_product_id, link_type, status: "pending"|"confirmed"|"rejected"|"revoked", shared: {mode,value_kg,snapshot_at}|null, requested_by, responded_by, responded_at, created_at, updated_at }`.
- `PATCH /product-links/{id}` body `{ action: "confirm"|"reject"|"revoke" }`. 403 wrong side/role; 409 already responded; 422 confirm when partner product has no carbon.
- `POST /products/{id}/adopt-linked-value` body `{ link_id }` → updated `Product`.

**Sub-Admins & scope** (`/api/admin/sub-admins`, `/api/me/scope`)
- `POST /admin/sub-admins` (201, master only) body `{ user_id, scope: { kind: "region"|"sector", values: string[] } }` → `UserResponse`. Region values are ISO-2 codes (server upper-cases; rejects non-2-letter with 422). 404 if target user not in caller's org.
- `DELETE /admin/sub-admins/{user_id}?kind=&values=` (master only) → `UserResponse`.
- `GET /admin/sub-admins` (master only) → `UserResponse[]` (users holding sub_admin roles).
- `GET /me/scope` → `{ is_master, region: string[], sector: string[] }`.

**Health:** `GET /api/health` → `{ status, database, storage_backend, ... }` (for a status/debug view).

### 6.2 Inferred — Phases 1–10 (confirm against API)

Follow the same conventions (plural resource, org-scoped, `{detail}` errors). Expected resources
and typical operations:
- **auth**: register, login, verify-otp, refresh, logout, forgot/reset password, `me`.
- **organizations/settings**: `GET/PATCH /api/organization` (name, `settings.esg_weights {e,s,g}`, toggles: `auto_emission_calculation`, `require_csr_evidence`, `badge_auto_award`, `email_compliance_alerts`).
- **users**: `GET/POST/PATCH /api/users` (org roster; assign roles).
- **categories**: `GET/POST/PATCH/DELETE /api/categories` (`type: "csr_activity"|"challenge"`).
- **emission-factors**: CRUD `/api/emission-factors` (`activity`, `item`, `factor_kg_per_unit`, `unit_label`, `year`, `source`, `status`).
- **operational-records**: CRUD `/api/operational-records` (`op_type: purchase|manufacturing|expense|fleet`, quantity, unit_label, amount, occurred_at). Auto-emission-calc produces carbon_transactions.
- **carbon-transactions**: `GET /api/carbon-transactions` (filter by dept/period/source_type), `POST` manual entry.
- **sustainability-goals** (Environmental Goals): CRUD `/api/sustainability-goals` (name, department_id, metric, baseline/target, unit, start, deadline, status). Progress computed from carbon ledger.
- **csr-activities / csr-participations**: activities CRUD; participations join → `proof_file_ids` upload → approve/reject (queue).
- **diversity-metrics**: CRUD per dept/period/dimension (`breakdown` map).
- **trainings / training-completions**.
- **policies / policy-acknowledgements** (versioned; ack pinned to version).
- **audits / compliance-issues** (owner_user_id + due_date required; "overdue" = status∈{open,in_progress} AND due_date<now — computed client-side for display, but the server flags it too).
- **challenges / challenge-participations** (lifecycle draft→active→under_review→completed/archived; participation join → proof → approve → certificate `{file_id, share_token, issued_at}`).
- **xp-ledger / leaderboard**: `GET /api/leaderboard?scope=employee|department&period=`.
- **badges / user-badges** (auto-award).
- **rewards / reward-redemptions**: `POST /api/reward-redemptions` `{ reward_id }` → deduct points; 409 out-of-stock / 422 insufficient points.
- **department-scores**: `GET /api/department-scores?department_id=&from=&to=` (ESG trend).
- **notifications**: `GET /api/notifications`, `PATCH /api/notifications/{id}` (mark read).
- **reports**: `POST /api/reports/generate` `{ type, filters }` → downloadable; `POST /api/reports/custom` with filters → export PDF/Excel/CSV.
- **files**: `POST /api/files` (multipart) → `{ _id, ... }`; `GET /api/files/{id}` (download); referenced by id everywhere proof/docs appear.

---

## 7. Standard states, formatting & patterns

**Every data view implements four states:** `loading` (Skeleton), `empty` (EmptyState with a
CTA where an action exists), `error` (ErrorState + retry, showing the `detail` message), and
`success`. Never render a blank page.

**Forms:** disable submit while pending; show field-level errors from 422 where possible and a
form-level banner otherwise; on success close the modal, toast, and refresh the affected list.
Mirror server validation client-side to fail fast (required fields, ranges, enums, `amount ≥
0`, 2-letter country codes, `share` 0–1, `transport_mix` non-empty).

**Status → color (StatusBadge):**
- Generic active/completed/approved/confirmed/current → green; draft/pending/planned/joined →
  neutral/grey; under_review/in_progress/submitted → blue/amber; on_track → green; rejected/
  cancelled/revoked/superseded/closed/archived/discontinued/missed → red/grey.
- Compliance **severity**: low → grey, medium → amber, high → orange, critical → red.
- Compliance **overdue**: red emphasis (badge "Overdue") independent of status.
- Carbon **approximation**: amber "Approx" chip when `is_approximation` true; green "Exact"
  when a tier-1 exact match.

**Formatting:** carbon shown in tonnes with 1–2 decimals where the wireframe uses "t"
(`kg/1000`), otherwise kg; money via the row's currency; periods as `MMM YYYY` (or `YYYY` when
month absent); percentages for shares/renewable mix/progress.

**Pagination/sorting:** DataTable paginates client-side for small lists; for large lists pass
query params and show server totals (confirm pagination params with the API).

---

## 8. Per-page specifications

Template per page: **Route · Nav · Access · Sub-sections · Controls & fields · States · API ·
Edge cases · Reuse.**

### 8.1 Auth pages (#1–#4)
- **Login:** email + password → on OTP-required, advance to Verify OTP. Errors: invalid
  credentials (form banner), unverified account. **Register:** email, full_name, password
  (strength meter), confirm → OTP. **Verify OTP:** 6 boxes, resend w/ cooldown, expiry
  countdown; wrong code → inline error, lock after N attempts. **Reset:** email → OTP → new
  password. Reuse: Modal-less centered card, Toast. States: submitting/error/success.

### 8.2 Executive Dashboard (#5)
- **Sub-sections:** KPI row (Environmental, Social, Governance, Overall — 0–100, colored per
  pillar), **Emissions Trend** (12-month line from `department-scores`/`carbon-transactions`),
  **Department ESG Ranking** (bar; click a bar → opens the Department Rollup drawer for that
  dept), **Recent Activity** feed, **Quick Actions** (Log Carbon Data → #7 create; Start
  Challenge → #22 create; View Reports → #27).
- **API:** dashboard summary [Inferred] + `GET /api/department-scores`, `GET
  /api/carbon-transactions`, `GET /api/notifications` (recent). Ranking may reuse per-dept
  `department-scores`.
- **States:** skeleton tiles/charts; empty ("No data yet — log your first carbon entry").
- **Reuse:** KpiTile, Chart(line/bar), Drawer (rollup).

### 8.3 Environmental

**Environmental index (#13):** emissions by source_type and by department (bar/donut), goal
progress summary, links into sub-pages. API: `carbon-transactions` aggregations, `sustainability-goals`.

**Emission Factors (#6):** DataTable (activity, item, label, factor, unit, year, source,
status) + New/Edit (Modal) / retire. Access org_admin. API: `/api/emission-factors`.

**Carbon Transactions (#7):** filterable ledger table (period, department, source_type,
amount_kg, note); "Log Carbon Data" Modal (manual entry) — respects the org's
`auto_emission_calculation` toggle (if on, emphasize that most rows are auto-generated).
Columns show `is_approximation` chip. API: `/api/carbon-transactions`.

**Environmental Goals (#8):** DataTable (Name, Department, Target CO₂, **Current CO₂**,
**Progress** bar with %, Deadline, Status badge) + New Goal/Edit/Delete/Export (wireframe row).
"Current" and progress are computed from the carbon ledger — display server-provided values.
API: `/api/sustainability-goals`. Edge: goal with no data → progress 0, "No data" note.

**Product ESG Profiles (#9) [Verified]:**
- **Sub-sections/Tabs:** *Products list*; *Product detail* (Overview, Carbon, Sales, Links).
- **Products list:** DataTable columns Name, Category, Production City, Unit Price, **Per-unit
  CO₂**, **Match** (StatusBadge green "Exact" tier 1 / amber "Approx" tiers 2–4), Status.
  New/Edit (Modal: name, category, description, production_country, production_city, unit_price
  via MoneyInput, department select), Discontinue (ConfirmDialog).
- **Carbon panel:** "Calculate Carbon" button (optional year) → shows result + `matched_reference`
  row + tier; amber banner if approximate ("Matched at country/category level — no exact
  product/city row"). "Record Production" Modal (period + quantity_units) → writes ledger.
- **Sales panel:** DataTable of `product-sales` (period, units_sold, unit_price, revenue
  read-only) + Add/Edit (Modal, MoneyInput).
- **States:** list empty ("No products"); calculate error 422 shown inline ("No carbon reference
  data for category X"); record-production 409 ("Calculate product carbon first").
- **Reuse:** DataTable, Modal, StatusBadge, MoneyInput, SearchBox (department pick).

**Facilities (#10) [Verified]:**
- **List:** DataTable (Name, City, Department, Employees, Latest Total Carbon, Status). On
  create, if the response has `warning`, show a persistent amber chip on the row and a toast
  ("No city profile yet — add one under Settings → City Profiles"). New/Edit/Close.
- **Facility detail:** header + **Readings** table (period, electricity input summary,
  commute_kg, electricity_kg, total_kg, Approx chip if `is_approximation`). **Log Reading**
  Wizard/Modal: PeriodFilter; toggle "Electricity usage (kWh)" vs "Electricity bill"
  (MoneyInput); optional employee-count override; on submit show the computed breakdown +
  assumptions panel (explainability). 422 messages surface inline.
- **Reuse:** DataTable, Modal/Wizard, PeriodFilter, MoneyInput, StatusBadge.

**Overhead Allocation (#11) [Verified]:** department selector (default whole org) + PeriodFilter
+ "Run Allocation". Result: DataTable of lines (product, revenue, **revenue share %**,
allocated_kg); a callout showing `unallocated_kg` when there were no sales ("No sales this
period — overhead left unallocated"); history list of prior runs with a "Superseded" badge.
Access: org_admin (org-level) / dept_head (own subtree). Reuse: PeriodFilter, DataTable,
StatusBadge, department selector (from #28).

**Partner Links (#12) [Verified]:** two **Tabs** — *Outgoing* (My Product, Partner Org, Partner
Product, Type, Status) and *Incoming* (with Approve/Reject). **New Link** Wizard: (1) pick my
product (SearchBox), (2) search partner org, (3) pick partner product, (4) link type → submit.
Confirmed rows show the shared per-unit value + an **Adopt value** action on the requester
product; **Revoke** on either side. Status badges pending/confirmed/rejected/revoked. Edge:
same-org attempt blocked client-side (and 400 server-side); confirm disabled once responded.

### 8.4 Social

**CSR Activities (#14):** activity **cards** (title, joined count, "Evidence Required" flag,
status) with **Join**; "New Activity" (Modal: title, description, category, activity_date,
location, evidence_required, points/xp) for admins/dept_heads. States: empty catalog.

**Employee Participation (#15):** **Approval queue** DataTable (Employee, Activity/Challenge,
Proof (FilePreview link), Points, Approval status) with **Approve/Reject** (reviewer). Own view
shows the user's submissions + upload proof (FileUpload). Enforce: cannot Approve without a
proof file when the activity/org requires evidence (button disabled + tooltip).

**Diversity Dashboard (#16):** per period/dimension breakdown (stacked bar / donut) + a table;
"Report Metrics" Modal (period, dimension, breakdown map). API: `/api/diversity-metrics`.

**Training Completion (#17):** trainings list + per-user completion status; mark-complete;
optional certificate. API: `/api/trainings`, `/api/training-completions`.

### 8.5 Governance

**Policies (#18):** versioned list (policy group → versions); publish/retire; view body/file.
Admins manage; everyone reads.
**Policy Acknowledgements (#19):** list of policies with the user's ack state + "Acknowledge"
(records against the exact version); admin view of who acknowledged.
**Audits (#20):** DataTable (Title, Department, Auditor, Date, Findings, Status) + New Audit/
Export (wireframe). Statuses scheduled/in_progress/under_review/completed.
**Compliance Issues (#21):** DataTable (Issue, Severity badge, Department, Owner, Due Date,
Status) — **Owner and Due Date are required** on create; rows past due while open show a red
**Overdue** badge. Optional `audit_id` link (issues raised from an audit). Create/edit Modal;
resolve flow (resolution_note). API: `/api/compliance-issues`.

### 8.6 Gamification

**Challenges (#22):** **lifecycle board** with columns Draft / Active / Under Review /
Completed / Archived (wireframe); challenge **cards** (title, XP, difficulty, deadline, status)
with **Join**; "New Challenge" Wizard (title, description, category, difficulty, xp/points,
evidence_required, starts_at, deadline). Admin actions advance status along the legal
transitions (draft→active→under_review→completed; any→archived) — show only legal next steps.
**Challenge Participation (#23):** submissions with proof upload, reviewer Approve/Reject, and
on completion a **shareable certificate** (image + public verify link via `share_token`).
**Badges (#24):** **Badge Gallery** (earned vs. locked; show unlock rule + progress toward it).
**Rewards (#25):** catalog **cards** (name, cost_points, **stock**, image) with **Redeem**
(ConfirmDialog) → deduct points; disable when out of stock or insufficient balance (surface
409/422). Admin manage.
**Leaderboard (#26):** toggle Employee vs. Department; rank, name, XP (wireframe). Optional
period filter (monthly via xp-ledger vs. all-time via `xp_total`).

### 8.7 Reports (#27)
- **Tabs:** Environmental / Social / Governance / ESG Summary / **Custom Builder**.
- Each report tab: a "Generate" button (+ optional scope) → produces a downloadable report.
- **Custom Builder:** filter row — **Date Range** (PeriodFilter range), **Department**
  (selector), **Module**, **Employee** (SearchBox), **Challenge**, **ESG Category** — then
  "Run Report" and **Export PDF / Excel / CSV**. API: `/api/reports/*`.
- States: generating (spinner), empty result, error. Access: org_admin/dept_head.

### 8.8 Settings & Administration

**Departments (#28) [Verified]:** **TreeView** (indented, expandable) replacing a flat table;
columns Name, Code, Head, Employees, Status. Per-node actions, **role- and subtree-gated**:
**New Sub-department** (Modal: name, code, employee_count, optional head), **Assign Head**
(Modal + user SearchBox), **Add Employee** (Modal + user SearchBox), **Edit** (Modal), **Archive**
(ConfirmDialog). A dept_head sees create/add actions only on their own node and descendants.
**View Rollup** action → Department Rollup drawer (PeriodFilter; KPI tiles Total Carbon /
Emissions / Offsets / ESG Total; a **Contribution by sub-department** table from `by_child` +
the `direct` row; a bar of children's carbon). Edge: archive blocked (409) with a clear message
when children/users remain. Reuse: TreeView, Modal, SearchBox, ConfirmDialog, Drawer,
PeriodFilter, KpiTile, Chart(bar), DataTable.

**Categories (#29):** DataTable (name, type csr_activity|challenge, status) + CRUD. org_admin.

**ESG Configuration (#30):** toggles bound to `organization.settings` — **Enable auto emission
calculation**, **Require evidence for CSR activities**, **Auto-award badges on challenge
completion**, **Email alerts for new compliance issues** (wireframe) — plus **ESG weights**
(E/S/G, must sum to 100; used in scoring). PATCH on change with optimistic UI + rollback on
error. org_admin.

**Notification Settings (#31):** per-user (and, for admins, per-org) channel prefs (in-app /
email) for the notification types (compliance raised/overdue, CSR/challenge decisions, policy
reminders, badge unlocks).

**City Profiles (#32) [Verified]:** DataTable (Country, City, Year, Renewable %, Grid Factor,
Commute km/day, Tariff, Source). New/Edit (Modal with `transport_mix` editor: repeatable
mode/share/factor rows summing ~1.0, MoneyInput for tariff). **Edit gating:** call
`/api/me/scope`; enable Edit only for master or a **region** sub_admin whose scope includes the
row's country; others see a disabled Edit with tooltip. 409 duplicate handled.

**Carbon Reference (#33) [Verified]:** searchable DataTable (Country, City, Category, Product,
Year, Value, Unit, Source) + SearchBox/filters. New/Edit (Modal). **Edit gating** via
`/api/me/scope`: master (any), region sub_admin (row.country ∈ scope), sector sub_admin
(row.product_category ∈ scope). A per-row **History** Drawer showing `reference_value_history`
(old→new value, source, who, when) from `GET /{id}/history`. Amber note that changes don't
retroactively recalculate products (users must recalculate).

**Sub-Admins (#34) [Verified, master only]:** DataTable (User, Scope Kind badge, Scope Values
chips, actions). **Assign** Modal: user SearchBox; radio Region vs Sector; MultiSelect of
values (region → country codes, sector → product categories); a user may hold several scopes.
**Revoke** per scope (ConfirmDialog). Errors: 404 (user not in org), 422 (bad region code /
empty values). Reuse: DataTable, Modal, MultiSelect, SearchBox, StatusBadge.

**Profile / Account (#35):** view/edit own profile, change password, list & revoke active
sessions, log out. **Notifications Center (#36):** list from `/api/notifications`, mark
read/all-read, deep-link to the source record.

---

## 9. Charts & data visualization

Consistent, accessible system across every chart:
- **Chart types:** *Line* — emissions trend, ESG score trend over time. *Bar* — department ESG
  ranking, per-child carbon contribution, diversity breakdown. *Donut/Stacked* — emissions by
  source_type, diversity composition. *Progress bar / radial* — goal progress, ESG scores,
  badge unlock progress, revenue-share.
- **Color:** one categorical palette; **fix the four ESG pillars to stable colors**
  (Environmental, Social, Governance, Overall) used everywhere. Ensure legibility in light and
  dark and for color-vision deficiency; never encode meaning by color alone (add labels/patterns).
- **Axes/units:** carbon axis in tonnes CO₂e where "t" is shown; format large numbers with
  thousands separators; label axes and provide accessible names/`aria-label`s and a data-table
  fallback for screen readers.
- Wide charts/tables must scroll within their own container — the page must never scroll
  horizontally.

## 10. Notifications UI
- **Bell** in the top bar with an unread count; dropdown of recent + link to #36.
- Notification types (icon + copy): compliance issue raised, compliance overdue, CSR decision,
  challenge decision, policy acknowledgement reminder, badge unlocked.
- Clicking a notification marks it read and navigates to the source (issue/activity/challenge/
  policy/badge). Respect the user's channel prefs (#31). Poll or use server push if available.

## 11. File upload & download
- `FileUpload` posts multipart to `/api/files` with a `purpose` (csr_proof, challenge_proof,
  policy_doc, audit_report, certificate, badge_icon, reward_image, project_doc, avatar) and
  returns a file id stored on the parent record's `*_file_id(s)`.
- Validate type/size client-side; show progress; render thumbnails for images and a
  name/download chip otherwise. Download/preview via `GET /api/files/{id}`. Certificates expose
  a public verification link (the challenge `share_token`).

## 12. Responsive & mobile behavior
- Mobile-first; sidebar collapses to a drawer/hamburger. DataTables become stacked cards or
  horizontally scroll within their container below a breakpoint. Wizards/Modals go full-screen
  on small viewports. Charts reflow; touch targets ≥ 44px. No native app.

## 13. Accessibility
- Keyboard-navigable (focus traps in modals/drawers, escape to close), visible focus rings,
  semantic headings/landmarks, form labels + `aria-describedby` for errors, `aria-live` for
  toasts, sufficient contrast in both themes, and non-color status cues.

## 14. Error handling & feedback
- Map status → UX: **401** silent-refresh then, if it fails, redirect to login; **403** toast
  "You don't have permission" (and prefer hiding the action); **404** "Not found" state;
  **409** show the conflict `detail` (e.g. "Archive or reassign child departments first",
  "already exists", "Cannot confirm link in 'rejected' state"); **422** field/inline validation
  message (e.g. "No city profile for <city>", "Calculate product carbon first"). Always surface
  the server's `detail` text rather than a generic message.

## 15. Build order (frontend milestones)
1. **Shell + auth + API client** (§2–4, §6 base): login/OTP/refresh, protected routing, role
   context, `/me/scope`, the component library, the four standard states.
2. **Settings core:** Departments tree + rollup (#28), ESG Config (#30), Categories (#29) —
   unblocks department pickers everywhere.
3. **Environmental:** Emission Factors, Carbon Transactions, Goals, then the Verified pages —
   Facilities, Products (+ Sales), Overhead Allocation, Partner Links.
4. **Social, Governance, Gamification** module pages.
5. **Global reference admin:** City Profiles, Carbon Reference (+ history), Sub-Admins.
6. **Dashboard + Reports + Notifications** (aggregations over everything above) and the
   shareable certificate flow.

## 16. Explicit inferences & open questions
- **Auth endpoint names/OTP flow** (§3) are inferred; confirm exact routes, whether OTP is
  required on every login or first-device only, and the token storage the backend expects
  (cookie vs. body).
- **Phase 1–10 resource contracts** (§6.2) are inferred from the brief/wireframes; confirm
  field names, filter params, and pagination.
- **Dashboard aggregation endpoints** (scores summary, emissions trend, ranking, recent
  activity) may be dedicated endpoints or client-side aggregations of `department-scores` /
  `carbon-transactions`; confirm which exists.
- **Reports** generation/export mechanism (server-rendered file vs. client export) is inferred;
  confirm response type for PDF/Excel/CSV.
- **Leaderboard period semantics** (monthly via xp-ledger vs. all-time via `xp_total`) — the UI
  should offer both; confirm the endpoint.
- **NGO accounts / carbon-credit marketplace** were defined in the brief as a later phase and
  are **out of scope** for this frontend build unless those endpoints already exist; if built,
  add NGO project submission, credit listings, and corporate purchase pages under a new "Carbon
  Credits" nav group following the same patterns.
- Where a page's management action is role-gated, the exact minimum role (org_admin vs
  dept_head) follows §5; confirm any module that intentionally differs.
