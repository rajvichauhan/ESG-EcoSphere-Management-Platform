# EcoSphere ESG Platform — Build Specification for Phases 11–15

This document is self-contained. It specifies Phases 11 through 15 of the EcoSphere ESG
Management Platform. It assumes Phases 1–10 are already built and running. You do not need any
other document to build Phases 11–15 from this. Collection names, field names, endpoint
routes, and page names given here are authoritative — use them exactly.

Global conventions already established in Phases 1–10 and carried into these phases:

- **Every tenant-owned document has `org_id`** (ObjectId → `organizations`) plus `_id`,
  `created_at`, `updated_at` (UTC datetimes). Queries are always filtered by the caller's
  `org_id`, except for the global reference collections explicitly marked GLOBAL below.
- **Money** is stored as `{ "amount": <number>, "currency": "<ISO4217>" }`.
- **Time periods** are stored as the subdocument `{ "year": <int>, "month": <int> }`
  (`month` omitted only where a figure is explicitly annual).
- **Carbon quantities** are stored in **kilograms CO2e** (`amount_kg`, float). Positive =
  emission, negative = offset.
- Auth: a logged-in request carries a user resolved by the dependency `get_current_user`
  (returns the `users` document). Role gating uses `require_roles(...)`. Org scoping uses a
  helper that injects the caller's `org_id` into every query. Roles live on `users.roles`,
  an array of objects like `{ "role": "master_admin" }`, `{ "role": "org_admin" }`,
  `{ "role": "dept_head" }`, `{ "role": "employee" }`, and (reserved, activated in Phase 15)
  `{ "role": "sub_admin", "scope": { "kind": "region"|"sector", "values": [...] } }`.
- API routes are mounted under `/api`. Backend modules follow the convention
  `app/routers/<area>.py`, `app/models/<area>.py`, `app/services/<area>.py`.
- Frontend has a fixed left sidebar with these nav groups: **Dashboard**, **Environmental**,
  **Social**, **Governance**, **Gamification**, **Reports**, **Settings**. Shared frontend
  building blocks that already exist and must be reused: a **DataTable** (sortable columns +
  per-row View/Edit/Delete actions), **Modal**, **Wizard** (multi-step form used by the
  challenge creator and custom report builder), **StatusBadge** (colored pill), **PeriodFilter**
  (year/month range picker), **MoneyInput**, **SearchBox**, and **ConfirmDialog**.

---

## Baseline: what exists at the end of Phase 10

You are extending a working system. These are the collections and surfaces already present.
Phases 11–15 depend on the ones named in each phase's Dependencies section.

**Collections (all org-scoped unless noted):**

- `organizations` — `{ _id, name, type: "platform"|"corporate"|"ngo", status, settings: {
  esg_weights: {e,s,g}, auto_emission_calculation, require_csr_evidence, badge_auto_award,
  email_compliance_alerts }, created_at, updated_at }`.
- `users` — `{ _id, org_id, email, password_hash, full_name, department_id, roles[],
  status, xp_total, points_balance, created_at, updated_at }`.
- `sessions`, `otps` — auth support (refresh tokens, email OTP).
- `departments` — **flat at this point**: `{ _id, org_id, name, code, parent_id,
  head_user_id, employee_count, status: "active"|"archived", created_at, updated_at }`.
  Managed on **Settings → Departments** (a DataTable with columns Name, Code, Head,
  Parent Dept, Employees, Status). `parent_id` exists but is not traversed as a tree yet.
- `categories` — `{ _id, org_id, name, type: "csr_activity"|"challenge", status }`.
- `emission_factors` — `{ _id, org_id, activity, item, label, factor_kg_per_unit,
  unit_label, source, year, status }`.
- `badges`, `rewards`, `policies`, `sustainability_goals`.
- `operational_records` — `{ _id, org_id, department_id, op_type:
  "purchase"|"manufacturing"|"expense"|"fleet", description, quantity, unit_label, amount,
  occurred_at, created_by }`.
- `carbon_transactions` — **the carbon ledger; the spine of the system.**
  `{ _id, org_id, department_id, period: {year,month}, amount_kg, source_type, source_ref:
  {collection, id}, calculation: {factor_id, factor_value, inputs, is_approximation}, note,
  created_by, created_at, updated_at }`. As of Phase 10, `source_type` takes the values
  `"purchase"`, `"manufacturing"`, `"expense"`, `"fleet"`, `"manual"`. Phases 12–14 add more.
- `csr_activities`, `csr_participations`, `diversity_metrics`, `trainings`,
  `training_completions` (Social).
- `policy_acknowledgements`, `audits`, `compliance_issues` (Governance).
- `challenges`, `challenge_participations`, `xp_ledger`, `user_badges`, `reward_redemptions`
  (Gamification).
- `notifications`, `department_scores` — `{ _id, org_id, department_id, period, e_score,
  s_score, g_score, total_score, weights_used, components, computed_at }`.
- `files` — `{ _id, org_id, uploaded_by, backend, storage_key, original_name, mime_type,
  size_bytes, purpose, created_at }`. All file access goes through a storage abstraction
  (`app/storage/`), addressed by opaque `storage_key`, never a filesystem path.

**Frontend pages already present:** Dashboard (executive overview with E/S/G/overall score
tiles, emissions trend, **Department ESG Ranking** bar chart), Environmental (with nav
sub-items **Emission Factors**, **Product ESG Profiles** [a stub page — no product backend
yet], **Carbon Transactions**, **Environmental Goals**), Social, Governance, Gamification,
Reports (with **Custom Report Builder** filtering by Department, Date Range, Module, Employee,
Challenge, ESG Category, exporting PDF/Excel/CSV), Settings (Departments, Categories, ESG
Configuration, Notification Settings).

---

## Phase 11 — Corporate Hierarchy & Rollups

### 1. Phase goal

This phase converts the flat `departments` collection into a true recursive hierarchy of
unlimited depth and makes the aggregated ("rollup") data of any subtree viewable. It exists
here because every later phase (facilities in 12, products in 13, allocation in 14) attaches
data to departments and relies on being able to sum a department together with everything
nested beneath it. It also delivers the self-service organizational requirement: a
department-level user must be able to create a sub-department under their own node and assign
someone to head it, or attach a plain employee, without waiting on a central admin. Rollups
are always computed live as the exact sum of descendants — never stored as an independent
figure — so a parent's number can never drift from its children.

### 2. Dependencies from Phases 1–10

- Collection `departments` (fields listed in Baseline). This phase **adds a field** and
  changes how the collection is managed and queried.
- Collection `users` — fields `department_id`, `roles`. Head assignment and self-service
  permission checks read these. The roles `master_admin`, `org_admin`, `dept_head`,
  `employee` already exist.
- Collection `carbon_transactions` — field `department_id`. Primary fact rolled up.
- Other department-tagged fact collections rolled up: `sustainability_goals.department_id`,
  `csr_participations.department_id`, `diversity_metrics.department_id`,
  `compliance_issues.department_id`, `challenge_participations.department_id`,
  `xp_ledger.department_id`, `department_scores.department_id`.
- Auth dependencies `get_current_user`, `require_roles`, and the org-scoping helper.
- Frontend **Settings → Departments** DataTable page (replaced by a tree view here) and the
  Dashboard **Department ESG Ranking** chart (becomes drill-down capable).
- Reusable frontend components: DataTable, Modal, StatusBadge, PeriodFilter, ConfirmDialog.

### 3. Data model changes

**Modify `departments`** — add one field:

- `ancestors`: array of ObjectId, **required** (default `[]`). Ordered from root down to the
  immediate parent. A root department has `ancestors: []`. A department at depth 3 has three
  entries. This is a materialized path enabling a single-query subtree fetch.

Indexes to add on `departments`:

- `{ org_id: 1, ancestors: 1 }` — subtree lookup.
- `{ org_id: 1, parent_id: 1, name: 1 }` **unique** — no two siblings share a name.

No new collection. Rollups are **not** stored anywhere; they are computed on read.

Example department documents (a two-level tree):

```json
{ "_id": "6650...aaa", "org_id": "org1", "name": "Corporate", "code": "COR",
  "parent_id": null, "ancestors": [], "head_user_id": "u-mehta",
  "employee_count": 41, "status": "active", "created_at": "...", "updated_at": "..." }

{ "_id": "6650...bbb", "org_id": "org1", "name": "Manufacturing", "code": "MFG",
  "parent_id": "6650...aaa", "ancestors": ["6650...aaa"], "head_user_id": "u-nair",
  "employee_count": 134, "status": "active", "created_at": "...", "updated_at": "..." }

{ "_id": "6650...ccc", "org_id": "org1", "name": "Assembly Line 1", "code": "MFG-A1",
  "parent_id": "6650...bbb", "ancestors": ["6650...aaa", "6650...bbb"],
  "head_user_id": null, "employee_count": 60, "status": "active", ... }
```

### 4. Backend requirements

Org-scoping rule for all endpoints below: every query is filtered by the caller's `org_id`;
a department from another org is treated as not found (404), never edited.

**`POST /api/departments`** — create a department (root or sub).
- Body: `{ "name": str, "code": str, "parent_id": ObjectId|null, "head_user_id": ObjectId|null,
  "employee_count": int }` (`employee_count` optional, default 0).
- Auth/permission: allowed if the caller has `master_admin` or `org_admin`; **or** the caller
  is creating a sub-department (`parent_id` non-null) and the caller's `users.department_id`
  equals `parent_id` **or** appears in the parent department's `ancestors` (self-service under
  one's own node). Creating a **root** department (`parent_id: null`) requires
  `master_admin`/`org_admin`.
- Logic: load parent (if any); set `ancestors = parent.ancestors + [parent_id]`. If
  `head_user_id` given, validate that user is in the same org, and add
  `{ "role": "dept_head" }` to that user's roles if absent.
- Validation / edge cases: parent not found in org → 404. Duplicate sibling name (same
  `org_id` + `parent_id` + `name`) → 409. `parent_id` referencing another org → 404.
  Self-referential or missing required fields → 422.

**`PATCH /api/departments/{id}`** — edit name, code, employee_count, status, or move the node.
- Body: any subset of `{ name, code, employee_count, status, parent_id, head_user_id }`.
- Permission: `master_admin`/`org_admin`, or `dept_head` of this department or an ancestor.
- Move logic (when `parent_id` changes): reject if the new parent is the node itself or any
  of its descendants (cycle) → 409. Otherwise recompute this node's `ancestors` and rewrite
  `ancestors` for **every descendant** (all docs where `id ∈ ancestors`) by replacing the old
  ancestor prefix with the new one. This is done synchronously in the request; it must be
  idempotent if retried.
- Edge cases: duplicate sibling name after rename → 409; head user not in org → 400.

**`POST /api/departments/{id}/assign-head`** — assign a department head.
- Body: `{ "user_id": ObjectId }`.
- Permission: `master_admin`/`org_admin`, or `dept_head` of an ancestor of `{id}`.
- Logic: set `department.head_user_id = user_id`; ensure that user has `department_id` set to
  this department (set it if null); add `{ "role": "dept_head" }` if absent.
- Edge cases: user not in org → 400; department not found → 404.

**`POST /api/departments/{id}/members`** — attach a plain employee directly to a department.
- Body: `{ "user_id": ObjectId }`.
- Permission: `master_admin`/`org_admin`, or the caller's `department_id` equals `{id}` or has
  `{id}` in its `ancestors` (self-service).
- Logic: set that user's `users.department_id = {id}`; ensure they carry
  `{ "role": "employee" }` if they have no other role.
- Edge cases: user already headed elsewhere is allowed (a person can move); user not in org
  → 400.

**`GET /api/departments/tree`** — return the org's department hierarchy as nested nodes.
- Query params: `root_id` (optional; default = org root(s)). If the caller is a `dept_head`
  or `employee`, the returned tree may be restricted to their own subtree.
- Response: nested `{ id, name, code, head, employee_count, status, children: [...] }`.

**`GET /api/departments/{id}/subtree-ids`** — return `[ObjectId]` of `{id}` plus all
descendants (one query: `{ org_id, $or: [ {_id: id}, {ancestors: id} ] }`). Used internally
and by the frontend rollup view.

**`GET /api/departments/{id}/rollup`** — aggregated data for the subtree rooted at `{id}`.
- Query params: `year` and optional `month` or a range (`from_year,from_month,to_year,to_month`).
- Permission: caller must be able to see `{id}` (master/org_admin, or `{id}` is within the
  caller's own subtree).
- Logic: resolve subtree ids (as above). Then aggregate, filtered by
  `department_id ∈ subtreeIds` and the period:
  - `total_carbon_kg` = sum of `carbon_transactions.amount_kg`.
  - `emissions_kg` (positive only) and `offsets_kg` (negative only) split by sign.
  - ESG scores: from `department_scores` for the nodes in the subtree (latest period ≤
    requested), reported as the subtree aggregate and per-direct-child.
  - Social/Governance/Gamification counts: approved `csr_participations`, open
    `compliance_issues`, summed `xp_ledger.xp_delta`.
  - `by_child`: an array breaking each figure down per **direct child** of `{id}` plus the
    node's own directly-attached data, so the UI can show the rollup as a sum of parts.
- Response example:
```json
{ "department_id": "6650...bbb", "period": {"from":{"year":2026,"month":1},"to":{"year":2026,"month":6}},
  "total_carbon_kg": 812340.5, "emissions_kg": 900000.0, "offsets_kg": -87659.5,
  "esg": {"e":78,"s":71,"g":83,"total":77},
  "xp_total": 4820, "open_compliance_issues": 3,
  "by_child": [
    {"department_id":"6650...ccc","name":"Assembly Line 1","total_carbon_kg":420000.0,"xp_total":3010},
    {"department_id":"6650...ddd","name":"Assembly Line 2","total_carbon_kg":392340.5,"xp_total":1810}
  ] }
```
- The response must make explicit that these are summed-from-children figures (that is the
  point of `by_child`), never independently stored.

**`DELETE /api/departments/{id}`** — soft delete (set `status: "archived"`).
- Permission: `master_admin`/`org_admin`.
- Edge case: reject with 409 if the department has any non-archived child departments (archive
  or reassign children first) or any users still assigned (`users.department_id == id`).

### 5. Frontend requirements

**Settings → Departments (upgrade the existing DataTable page to a tree view).**
- Nav group: **Settings**, route the page already occupies for Departments.
- Replace the flat DataTable with an **expandable tree**: each row indented by depth, with a
  disclosure caret. Columns retained: Name, Code, Head, Employees, Status (StatusBadge).
- Per-node action buttons, permission-gated per the endpoints above: **New Sub-department**
  (opens Modal with name, code, employee_count, optional head select), **Assign Head**
  (Modal with a user SearchBox), **Add Employee** (Modal with a user SearchBox), **Edit**
  (Modal), **Archive** (ConfirmDialog).
- A `dept_head`/`employee` sees the New Sub-department / Add Employee actions **only** on
  their own node and its descendants; hidden elsewhere.
- States: loading (skeleton rows), empty (org with only a root, prompt to add first
  sub-department), error (retry banner), success (tree refreshes after mutation).
- Reuse: DataTable styles for rows, Modal, StatusBadge, SearchBox, ConfirmDialog. Build new:
  the tree/indentation wrapper and the disclosure caret.

**Department Rollup view (new page).**
- Reached by a **View rollup** action on any tree node, and by drilling into a bar on the
  Dashboard **Department ESG Ranking** chart.
- Nav group: reached from **Settings → Departments** and **Dashboard**; no new top-level nav
  item.
- Contents: a header naming the department and a PeriodFilter; KPI tiles (Total Carbon,
  Emissions, Offsets, ESG Total); a **Contribution by sub-department** table showing each
  direct child's share of total carbon and XP (reuse DataTable); a simple bar showing each
  child's carbon contribution.
- States: loading (tiles show spinners), empty (a leaf department with no data yet → "No data
  recorded for this period"), error, success.
- Reuse: PeriodFilter, DataTable, the existing KPI tile component from the Dashboard, and the
  bar chart component from Department ESG Ranking.

### 6. Background jobs or scheduled tasks

- **One-time migration (not recurring):** backfill `ancestors` for all existing
  `departments` by walking each document's `parent_id` chain to the root. Must be idempotent
  (recomputing from `parent_id` yields the same array; safe to re-run). It must never alter
  `parent_id`, `name`, or any non-`ancestors` field.
- No recurring job. A department move recomputes descendant `ancestors` synchronously within
  the PATCH request (bounded work), not as a background job.

### 7. Explicit non-goals for this phase

- No facility/office carbon (Phase 12), no product data (Phase 13). Rollups aggregate only
  the fact collections that exist at end of Phase 10.
- No caching or precomputation of rollups — always computed live.
- No cross-organization hierarchy; a department tree is within one `org_id`.
- No change to ESG scoring formulas or the `department_scores` computation itself.

### 8. Acceptance criteria

- A department can be created nested at least three levels deep; each level's `ancestors`
  array contains exactly its chain of parent ids in root→parent order.
- A `dept_head` (no admin role) can create a sub-department under their own node and under a
  descendant, and receives 403 attempting to create one under a sibling or ancestor outside
  their subtree.
- Moving a subtree updates `ancestors` on the moved node and every descendant; attempting to
  move a node under its own descendant returns 409.
- For a parent with two children each holding known carbon data, `GET /rollup` on the parent
  returns `total_carbon_kg` exactly equal to the sum of the two children's totals, and
  `by_child` lists both contributions.
- The Departments page renders the hierarchy as an expandable tree; archiving a department
  with active children or assigned users is rejected with a clear message.

---

## Phase 12 — Facility & Office Carbon

### 1. Phase goal

This phase introduces physical locations (offices/facilities) that carry a city and an
employee count, and it computes two location-based carbon figures per facility per period:
commute-related carbon (from city-level distance and transport-mode assumptions times
employee count) and electricity-related carbon (from a reported bill or usage figure split by
the city's renewable/non-renewable grid mix). It exists after the hierarchy phase because a
facility belongs to a department and its carbon must roll up through the subtree built in
Phase 11. The computed results are written into the `carbon_transactions` ledger so they
appear in department rollups and the environmental dashboard automatically. Every computed
figure stores a full snapshot of the assumptions used, so the number stays explainable.

### 2. Dependencies from Phases 1–10 and Phase 11

- `carbon_transactions` (Phase 5) — this phase writes ledger rows with new `source_type`
  values `"facility_commute"` and `"facility_electricity"`, each with `source_ref`
  `{ collection: "facility_readings", id }`.
- `departments` **with `ancestors`** (Phase 11) — a facility's `department_id` places it in
  the tree; the Phase 11 rollup and `GET /api/departments/{id}/rollup` include facility carbon
  because it is in the ledger.
- Auth dependencies and org scoping. Note the new **GLOBAL** collection `city_profiles` is
  exempt from org scoping (see below).
- Frontend **Environmental** nav group and **Settings → ESG Configuration** area. Reusable
  components: DataTable, Modal, Wizard, PeriodFilter, MoneyInput, StatusBadge.

### 3. Data model changes

**New collection `city_profiles` — GLOBAL (no `org_id`).** Platform reference data,
pre-seeded, edited by `master_admin` only (Phase 15 adds scoped editors). Fields:

- `country`: str (ISO country code), required.
- `city`: str, required.
- `year`: int, required.
- `avg_commute_km_per_day`: float, required — interpreted as the **round-trip** daily commute
  distance per employee (do not multiply by 2 again).
- `transport_mix`: array of `{ mode: "car"|"bus"|"rail"|"two_wheeler"|"walk", share: float
  (0–1), factor_kg_per_km: float }`, required; `share` values should sum to ~1.0.
- `grid_renewable_pct`: float (0–1), required.
- `grid_factor_kg_per_kwh`: float, required — emission factor applied to the **non-renewable**
  share of electricity.
- `electricity_tariff_per_kwh`: `{ amount, currency }` or null — used to convert a reported
  bill amount into kWh. Required only if bills (not kWh) will be entered for this city.
- `working_days_per_month`: int, required (e.g. 22).
- `source`: str or null.
- `updated_by`: ObjectId, `created_at`, `updated_at`.
- Unique index `{ country: 1, city: 1, year: 1 }`.

**New collection `facilities` — org-scoped.** Fields:

- `org_id`, `department_id`: ObjectId or null (the department this location rolls up through).
- `name`: str, required. `country`: str (ISO), required. `city`: str, required — must match a
  `city_profiles` key for calculations to succeed.
- `employee_count`: int, required.
- `status`: `"active"|"closed"`, default `"active"`.
- `created_at`, `updated_at`.
- Index `{ org_id: 1, department_id: 1 }`.

**New collection `facility_readings` — org-scoped.** One document per facility per period.

- `org_id`, `facility_id`: ObjectId, `department_id`: ObjectId or null (denormalized from the
  facility at write time so ledger rows and rollups need no join).
- `period`: `{ year, month }`, required.
- `inputs`: `{ electricity_kwh: float|null, electricity_bill: {amount,currency}|null,
  employee_count_override: int|null }`. Exactly one of `electricity_kwh` /
  `electricity_bill` should be provided; `employee_count_override` overrides the facility's
  `employee_count` for that period only.
- `computed`: `{ commute_kg: float, electricity_kg: float, total_kg: float,
  city_profile_id: ObjectId, is_approximation: bool, assumptions: { avg_commute_km_per_day,
  transport_mix, grid_renewable_pct, grid_factor_kg_per_kwh, working_days_per_month,
  employees_used } }` — a full snapshot of every input to the calculation.
- `created_by`, `created_at`, `updated_at`.
- Unique index `{ facility_id: 1, "period.year": 1, "period.month": 1 }`.

Example `facility_readings` document:

```json
{ "_id": "read1", "org_id": "org1", "facility_id": "fac1", "department_id": "6650...bbb",
  "period": {"year":2026,"month":6},
  "inputs": {"electricity_kwh": 18000, "electricity_bill": null, "employee_count_override": null},
  "computed": {
    "commute_kg": 20328.0, "electricity_kg": 8686.8, "total_kg": 29014.8,
    "city_profile_id": "cp-pune-2026", "is_approximation": false,
    "assumptions": {"avg_commute_km_per_day": 18.0,
      "transport_mix": [{"mode":"car","share":0.5,"factor_kg_per_km":0.17},
                        {"mode":"bus","share":0.3,"factor_kg_per_km":0.05},
                        {"mode":"rail","share":0.2,"factor_kg_per_km":0.04}],
      "grid_renewable_pct": 0.32, "grid_factor_kg_per_kwh": 0.71,
      "working_days_per_month": 22, "employees_used": 134 }
  }, "created_by": "u-nair", "created_at": "...", "updated_at": "..." }
```

### 4. Backend requirements

**Calculation rules (authoritative):**

- Employees used = `inputs.employee_count_override` if set, else `facility.employee_count`.
- `commute_kg = employees × working_days_per_month × avg_commute_km_per_day ×
  Σ_over_modes( share × factor_kg_per_km )`.
- Electricity kWh: if `electricity_kwh` given, use it. If `electricity_bill` given, require
  `city_profile.electricity_tariff_per_kwh` present and compute
  `kwh = bill.amount / tariff.amount` (currencies must match; else 422). If neither given → 422.
- `non_renewable_kwh = kwh × (1 − grid_renewable_pct)`;
  `electricity_kg = non_renewable_kwh × grid_factor_kg_per_kwh`. The renewable share is treated
  as zero-emission.
- `total_kg = commute_kg + electricity_kg`.
- **City profile lookup:** find `city_profiles` matching the facility's `country` + `city`
  with the greatest `year` ≤ the reading's period year. If a matching city exists but only for
  a later year, use the earliest available and set `computed.is_approximation = true`. If no
  `country`+`city` profile exists at all → 422 (`"No city profile for <city>, <country>; add
  one under Settings → ESG Configuration → City Profiles"`). Set
  `computed.is_approximation = false` for an exact-year match, true if the year was fallen back.

**`GET/POST/PATCH/DELETE /api/facilities`** — standard org-scoped CRUD.
- POST body: `{ name, country, city, department_id?, employee_count }`.
- Permission: `org_admin`, or `dept_head` of the facility's department or an ancestor.
- On create, if no `city_profiles` row exists for `country`+`city`, allow creation but return
  a warning field `{ "warning": "No city profile yet; readings will fail until one is added" }`.
- DELETE is soft (`status: "closed"`).

**`POST /api/facilities/{id}/readings`** — log/compute a reading for a period.
- Body: `{ "period": {year,month}, "inputs": { electricity_kwh?, electricity_bill?,
  employee_count_override? } }`.
- Permission: `org_admin`, or `dept_head` of the facility's department/ancestor.
- Logic: run the calculation above; **upsert** `facility_readings` keyed by
  `(facility_id, period)` (re-submitting a period replaces the prior reading, not an error);
  then **replace** the ledger rows for this reading: delete existing `carbon_transactions`
  where `source_ref == {collection:"facility_readings", id:<readingId>}` and insert two fresh
  rows — one `source_type:"facility_commute"` with `amount_kg = commute_kg`, one
  `source_type:"facility_electricity"` with `amount_kg = electricity_kg` — both carrying
  `department_id`, `period`, and a `calculation` snapshot. This delete-then-insert makes
  re-submission idempotent (no duplicate ledger rows).
- Edge cases: missing city profile → 422; bill without tariff or currency mismatch → 422;
  neither kWh nor bill → 422; both provided → use `electricity_kwh` and ignore the bill.

**`GET /api/facilities/{id}/readings`** — list a facility's readings (with computed values).

**`GET /api/city-profiles`** — list/search all city profiles (GLOBAL; any admin may read).
**`POST /api/city-profiles`**, **`PATCH /api/city-profiles/{id}`** — `master_admin` only in
this phase (Phase 15 opens these to scoped sub-admins). These endpoints are exempt from org
scoping. Note: Phase 13 introduces `reference_value_history`; when that phase lands, the
`PATCH` here must also log value changes to it (see Phase 13 and Carry-forward).

### 5. Frontend requirements

**Facilities (new page under Environmental).**
- Nav group: **Environmental**, new sub-item **Facilities**.
- DataTable: columns Name, City, Department, Employees, Latest Total Carbon (kg), Status
  (StatusBadge). Buttons: New (Modal: name, country, city, department select, employee_count),
  Edit, Close (ConfirmDialog).
- States: loading, empty ("No facilities yet"), error, success. If a facility's city has no
  profile, show a warning chip on its row.
- Reuse: DataTable, Modal, StatusBadge, SearchBox, ConfirmDialog.

**Facility detail (new page).**
- Reached from a facility row's View action.
- Header with facility info; a **Readings** table (period, electricity input, commute_kg,
  electricity_kg, total_kg, approximation badge if `is_approximation`).
- **Log Reading** action opens a Wizard/Modal: PeriodFilter-style period picker; a toggle
  between "Electricity usage (kWh)" and "Electricity bill" (MoneyInput) inputs; optional
  employee-count override. On submit, shows the computed breakdown and the assumptions used
  (explainability panel).
- States: loading, empty (no readings), error (e.g. shows the 422 message about a missing city
  profile inline), success (breakdown appears).
- Reuse: PeriodFilter, Modal/Wizard, MoneyInput, StatusBadge, DataTable.

**City Profiles admin (new page under Settings → ESG Configuration).**
- DataTable: Country, City, Year, Renewable %, Grid Factor, Commute km/day, Tariff, Source.
  New/Edit (Modal) — visible to `master_admin` only in this phase.
- States: loading, empty, error, success.
- Reuse: DataTable, Modal, MoneyInput.

### 6. Background jobs or scheduled tasks

- None. Reading submission computes synchronously. Editing a `city_profiles` row does **not**
  retroactively recompute historical `facility_readings`; recomputation happens only when a
  reading is re-submitted (or a future explicit "recompute" action). Do not build an
  auto-recompute job in this phase.

### 7. Explicit non-goals for this phase

- No product/manufacturing carbon (Phase 13).
- No distribution of facility overhead onto products (Phase 14). Facility totals sit as
  department/organization carbon only.
- No automatic recomputation of past readings when a city profile changes.
- No scoped sub-admin editing of city profiles (master admin only until Phase 15).

### 8. Acceptance criteria

- Creating a facility and logging a reading with a kWh figure yields `commute_kg` and
  `electricity_kg` matching the formulas above, and creates exactly two `carbon_transactions`
  rows (`facility_commute`, `facility_electricity`) with the correct `source_ref`.
- Re-logging the same period replaces the reading and its two ledger rows (no duplicates;
  unique reading per facility+period holds).
- The facility's carbon appears in its department's Phase 11 rollup and on the environmental
  dashboard without any additional wiring.
- Logging a bill with no tariff, or for a city with no profile, returns 422 with a clear
  message; a year-fallback match sets `is_approximation: true`.

---

## Phase 13 — Product & Manufacturing Carbon

### 1. Phase goal

This phase lets a corporate account register the products it manufactures or sells — with
category, description, and country/city of production — and compute a per-unit emission value
for each product using a shared, centrally-maintained global carbon reference table. Lookups
match on the most specific combination available and fall back gracefully, flagging any result
that is an approximation rather than an exact match. A value-change history is maintained so
that any figure can be traced to where it came from and how it changed. It exists here because
product carbon is the second major carbon source (after facilities) and is the prerequisite
for revenue-based overhead allocation and cross-company linking in Phase 14.

### 2. Dependencies from Phases 1–12

- `carbon_transactions` (Phase 5) — recording production writes ledger rows with new
  `source_type: "product"`.
- `departments` with `ancestors` (Phase 11) — `products.department_id` places product carbon
  in the tree for rollups.
- Auth and org scoping; the new `carbon_reference` and `reference_value_history` collections
  are GLOBAL and exempt from org scoping.
- The **Environmental → Product ESG Profiles** page currently exists as a stub (from Phase 5).
  This phase implements its backend and full UI.
- `city_profiles` edit endpoint from Phase 12 — this phase's `reference_value_history` also
  captures city-profile value changes (retro-wire; see Carry-forward).
- Reusable components: DataTable, Modal, StatusBadge, MoneyInput, SearchBox.

### 3. Data model changes

**New collection `carbon_reference` — GLOBAL (no `org_id`).** Pre-seeded with reasonable
values for common products and manufacturing hubs. Fields:

- `country`: str (ISO), **required**.
- `city`: str or null (null = a country-wide value).
- `product_category`: str, **required**.
- `product_name`: str or null (null = a category-level value).
- `description`: str or null (for custom/unusual entries).
- `year`: int, required.
- `carbon_value`: float, required — emission (or carbon-credit) figure for that row.
- `unit`: `"per_unit"|"per_kg"|"per_kwh"`, required.
- `source`: str or null — where the value came from (report, database, publication, or LLM
  lookup). Capture it whenever available.
- `updated_by`: ObjectId, `created_at`, `updated_at`.
- Unique index `{ country: 1, city: 1, product_category: 1, product_name: 1, year: 1 }`
  (null is an indexable value, so a country-level row is one unambiguous document).

**New collection `reference_value_history` — GLOBAL.** One row per value change to a reference
table (both `carbon_reference` and `city_profiles`).

- `reference_id`: ObjectId (the changed row), `ref_collection`:
  `"carbon_reference"|"city_profiles"`.
- `old_value`: float, `new_value`: float, `old_source`: str|null, `new_source`: str|null.
- `changed_by`: ObjectId, `changed_at`: datetime.
- Index `{ reference_id: 1, changed_at: -1 }`.

**New collection `products` — org-scoped.** Fields:

- `org_id`, `department_id`: ObjectId or null.
- `name`: str, required. `category`: str, required. `description`: str or null.
- `production_country`: str (ISO), required. `production_city`: str, required.
- `unit_price`: `{ amount, currency }`, required (used by Phase 14 allocation).
- `carbon`: `{ per_unit_kg: float, reference_id: ObjectId, match_tier: 1|2|3|4,
  is_approximation: bool, unit: str, calculated_at: datetime }` or null (null until
  calculated).
- `status`: `"active"|"discontinued"`, default `"active"`.
- Indexes `{ org_id: 1, status: 1 }`, `{ org_id: 1, category: 1 }`.

Example `products` document after calculation:

```json
{ "_id": "prod1", "org_id": "org1", "department_id": "6650...bbb",
  "name": "Aluminium Bracket A", "category": "aluminium_part",
  "description": null, "production_country": "IN", "production_city": "Pune",
  "unit_price": {"amount": 4.5, "currency": "USD"},
  "carbon": {"per_unit_kg": 12.4, "reference_id": "cr-alu-pune-2026",
             "match_tier": 1, "is_approximation": false, "unit": "per_unit",
             "calculated_at": "..."},
  "status": "active", "created_at": "...", "updated_at": "..." }
```

### 4. Backend requirements

**Reference lookup algorithm (authoritative).** Given `(country, city, category,
product_name, year)`, try tiers most-specific first; within each tier pick the row with the
greatest `year` ≤ requested year (if none ≤ requested, pick the smallest available year and
force `is_approximation = true`):

1. `country` + `city` + `product_category` + `product_name` → `match_tier: 1`,
   `is_approximation: false`.
2. `country` + `product_category` + `product_name`, `city = null` → `match_tier: 2`,
   `is_approximation: true`.
3. `country` + `product_category`, `city = null`, `product_name = null` → `match_tier: 3`,
   `is_approximation: true`.
4. `product_category` across any country (pick the most recent year, any country) →
   `match_tier: 4`, `is_approximation: true`.

If no row matches even tier 4 → 422 (`"No carbon reference data for category <category>"`).

**`GET/POST/PATCH/DELETE /api/products`** — org-scoped CRUD.
- POST body: `{ name, category, description?, production_country, production_city,
  unit_price, department_id? }`.
- Permission: `org_admin`, or `dept_head` of the product's department/ancestor.
- DELETE is soft (`status: "discontinued"`).

**`POST /api/products/{id}/calculate-carbon`** — run the lookup and store the result.
- Body optional: `{ "year": int }` (defaults to current year).
- Logic: run the lookup for the product's `(production_country, production_city, category,
  name, year)`; store `product.carbon = { per_unit_kg: carbon_value, reference_id, match_tier,
  is_approximation, unit, calculated_at: now }`.
- Response: the computed carbon plus which reference row matched and the tier.
- Edge case: no reference data at all → 422.

**`POST /api/products/{id}/record-production`** — record a production quantity for a period and
write its carbon to the ledger.
- Body: `{ "period": {year,month}, "quantity_units": number }`.
- Precondition: `product.carbon` must be set → else 409 (`"Calculate product carbon first"`).
- Logic: **replace** any existing `carbon_transactions` where
  `source_ref == {collection:"products", id:<productId>}` **and** the same `period`, then
  insert one row: `source_type: "product"`, `amount_kg = product.carbon.per_unit_kg ×
  quantity_units`, `department_id = product.department_id`, `period`, `calculation:
  { reference_id, match_tier, is_approximation, inputs: { quantity_units, per_unit_kg } }`.
  Re-recording the same product+period replaces the prior row (idempotent).

**`GET /api/carbon-reference`** — list/search reference rows (query by country, category,
product_name, year). Any admin may read.
**`POST /api/carbon-reference`**, **`PATCH /api/carbon-reference/{id}`** — create / update a
reference row. `master_admin` only in this phase (Phase 15 opens to scoped sub-admins). On any
change to `carbon_value` or `source`, write a `reference_value_history` row with
`ref_collection: "carbon_reference"`, `changed_by = caller`. GLOBAL (org-scoping exempt).
**`GET /api/carbon-reference/{id}/history`** — return the value-change log for a row (from
`reference_value_history`).

### 5. Frontend requirements

**Environmental → Product ESG Profiles (implement the existing stub page).**
- Nav group: **Environmental**, sub-item **Product ESG Profiles** (already in the nav).
- DataTable: Name, Category, Production City, Unit Price (MoneyInput display), Per-unit CO₂,
  Match (StatusBadge: green "Exact" for tier 1, amber "Approx" for tiers 2–4), Status.
  Buttons: New/Edit (Modal), Discontinue (ConfirmDialog).
- Product detail: a **Calculate Carbon** button; after calc, show the matched reference row,
  the tier, and — if approximate — an amber warning banner ("Approximate: matched at
  country/category level, no exact product/city row"). A **Record Production** Modal (period +
  quantity) that writes to the ledger.
- States: loading, empty ("No products registered"), error (shows the 422 no-reference message
  inline), success.
- Reuse: DataTable, Modal, StatusBadge, MoneyInput, SearchBox.

**Carbon Reference admin (new page under Settings → ESG Configuration).**
- DataTable/SearchBox over Country, City, Category, Product, Year, Value, Unit, Source. Edit
  value via Modal (master admin only this phase). A **History** drawer per row showing the
  `reference_value_history` entries (old→new value, who, when).
- States: loading, empty, error, success.
- Reuse: DataTable, Modal, SearchBox, StatusBadge.

### 6. Background jobs or scheduled tasks

- None. All calculations are synchronous. Editing a `carbon_reference` value does **not**
  auto-recompute products that used it; recomputation happens only when a product's
  `calculate-carbon` is re-run. Do not build an auto-recompute job here.

### 7. Explicit non-goals for this phase

- No revenue-based overhead allocation (Phase 14).
- No cross-company product links (Phase 14).
- No scoped sub-admin editing of the reference table (Phase 15) — master admin only.
- No automatic recomputation of product carbon when a reference value changes.
- No bill-of-materials or multi-component product composition.

### 8. Acceptance criteria

- Registering a product and calculating carbon for a `(country, city, category, name)` that
  has an exact reference row returns `match_tier: 1`, `is_approximation: false`; a product
  whose city has no row falls back to tier 2/3/4 and sets `is_approximation: true`.
- Editing a `carbon_reference` value writes a `reference_value_history` row, and the row's
  history endpoint returns it (old value, new value, editor, timestamp).
- Recording production writes one `carbon_transactions` row (`source_type: "product"`) equal
  to per-unit × quantity, which rolls up to the product's department and the organization.
- Calculating carbon for a category with no reference data at all returns 422.

---

## Phase 14 — Allocation & Cross-Company Linking

### 1. Phase goal

This phase does two related things. First, **overhead allocation**: carbon that comes from
office/facility totals (not tied to a specific product) is distributed across the products a
department or company sells, in proportion to each product's revenue contribution — price ×
units sold in the period, divided by total revenue in the period — never split equally per
product and never by unit count. Second, **cross-company linking**: a corporate account can
link one of its products/components to another company's corresponding product, joining their
records so verified carbon data flows between them, with a confirmation step so a link is not
one-sided. It exists here because it requires both facility carbon (Phase 12, the overhead
source) and products with per-unit carbon and prices (Phase 13).

### 2. Dependencies from Phases 1–13

- `carbon_transactions` with `source_type` `"facility_commute"` / `"facility_electricity"`
  (Phase 12) — the overhead pool to distribute.
- `products` (Phase 13) — fields `unit_price`, `carbon.per_unit_kg`, `department_id`,
  `org_id`. Allocation operates over these; links reference `partner_product_id`.
- `departments` with `ancestors` (Phase 11) — allocation is scoped to a department subtree.
- `organizations` (Phase 2) — a cross-company link references another org via
  `partner_org_id`; both orgs' users act on the link.
- Auth/org scoping. Cross-company links are the one place a document legitimately references
  two `org_id`s; access rules below define who may act on each side.
- Reusable components: DataTable, Modal, Wizard, StatusBadge, MoneyInput, SearchBox, tabs.

### 3. Data model changes

**New collection `product_sales` — org-scoped.** Fields:

- `org_id`, `product_id`: ObjectId, `department_id`: ObjectId or null (denormalized from
  product).
- `period`: `{ year, month }`, required.
- `units_sold`: number, required. `unit_price`: `{ amount, currency }`, required (captured at
  sale time). `revenue`: `{ amount, currency }`, required — stored as `units_sold ×
  unit_price.amount` for query simplicity.
- Unique index `{ org_id: 1, product_id: 1, "period.year": 1, "period.month": 1 }`.

**New collection `overhead_allocations` — org-scoped.** A stored snapshot per allocation run.

- `org_id`, `department_id`: ObjectId or null (scope of the run: a subtree or the whole org).
- `period`: `{ year, month }`, required.
- `overhead_total_kg`: float — sum of in-scope facility carbon for the period.
- `revenue_total`: `{ amount, currency }`.
- `lines`: array of `{ product_id, revenue: {amount,currency}, revenue_share: float (0–1),
  allocated_kg: float }`.
- `unallocated_kg`: float — overhead left unallocated when there is no revenue (default 0).
- `status`: `"current"|"superseded"`, `run_by`: ObjectId, `created_at`.
- Index `{ org_id: 1, department_id: 1, "period.year": 1, "period.month": 1, status: 1 }`.

**New collection `product_links` — spans two orgs (not org-scoped in the usual single-org
sense).** Fields:

- `requester_org_id`, `requester_product_id`: ObjectId.
- `partner_org_id`, `partner_product_id`: ObjectId.
- `link_type`: `"component"|"carbon_credit"`.
- `status`: `"pending"|"confirmed"|"rejected"|"revoked"`.
- `shared`: `{ mode: "partner_per_unit_carbon", value_kg: float|null, snapshot_at:
  datetime|null }` — populated when confirmed.
- `requested_by`: ObjectId, `responded_by`: ObjectId or null, `responded_at`: datetime or null.
- `created_at`, `updated_at`.
- Unique index `{ requester_product_id: 1, partner_product_id: 1 }` (one live link per product
  pair; re-linking after a revoke reuses/updates the same document).

Example `overhead_allocations` document:

```json
{ "_id": "alloc1", "org_id": "org1", "department_id": "6650...bbb",
  "period": {"year":2026,"month":6},
  "overhead_total_kg": 29014.8, "revenue_total": {"amount":100000,"currency":"USD"},
  "lines": [
    {"product_id":"prod1","revenue":{"amount":31000,"currency":"USD"},"revenue_share":0.31,"allocated_kg":8994.6},
    {"product_id":"prod2","revenue":{"amount":69000,"currency":"USD"},"revenue_share":0.69,"allocated_kg":20020.2}
  ],
  "unallocated_kg": 0, "status": "current", "run_by": "u-nair", "created_at": "..." }
```

### 4. Backend requirements

**Allocation logic (authoritative).**
- Inputs: a scope (a `department_id` → its subtree ids via Phase 11
  `GET /api/departments/{id}/subtree-ids`, or the whole org) and a `period`.
- `overhead_total_kg` = sum of `carbon_transactions.amount_kg` where `source_type ∈
  {"facility_commute","facility_electricity"}`, `department_id ∈ scope`, `period` matches,
  `amount_kg > 0`.
- Products in scope = `products` of those departments. For each with a `product_sales` row in
  that period: `revenue_i = units_sold × unit_price.amount`. `revenue_total = Σ revenue_i`.
- `revenue_share_i = revenue_i / revenue_total`; `allocated_kg_i = overhead_total_kg ×
  revenue_share_i`. Formula explicitly: `allocated_i = overhead_total × (price_i × units_i) /
  Σ_j (price_j × units_j)`. Not an equal split; not by unit count.
- **Zero-revenue edge case:** if `revenue_total == 0` (no sales in scope for the period),
  produce a run with `lines: []`, `unallocated_kg = overhead_total_kg`, `status: "current"`.
  Never invent an equal split.
- **Currency:** assume a single currency across in-scope products; if products carry mixed
  currencies, reject with 422 (mixed-currency allocation is a non-goal).
- **Allocation does NOT write to `carbon_transactions`.** The allocated figures are a
  re-attribution of overhead already in the ledger; writing them back would double-count.
  Allocation results live only in `overhead_allocations` and are consumed by reports. A
  product's reported footprint = its `product` manufacturing carbon (Phase 13) + its allocated
  overhead from the latest `current` run.
- Re-running for the same scope+period sets the previous run's `status` to `"superseded"` and
  inserts a new `current` run.

**`GET/POST/PATCH /api/product-sales`** — record sales facts. `revenue` is computed server-side
as `units_sold × unit_price.amount`. Permission: `org_admin` or `dept_head` of the product's
department/ancestor. Duplicate `(product_id, period)` → the unique index makes POST a 409;
provide PATCH to amend.

**`POST /api/overhead-allocations/run`** — run an allocation.
- Body: `{ "department_id": ObjectId|null, "period": {year,month} }` (null = whole org).
- Permission: `org_admin`, or `dept_head` of the scoped department/ancestor.
- Returns the stored run (lines + any `unallocated_kg`).

**`GET /api/overhead-allocations`** — list runs (filter `status=current` by default,
`department_id`, `period`). **`GET /api/overhead-allocations/{id}`** — one run.

**`POST /api/product-links`** — create a link request.
- Body: `{ "requester_product_id": ObjectId, "partner_org_id": ObjectId,
  "partner_product_id": ObjectId, "link_type": "component"|"carbon_credit" }`.
- Permission: caller must belong to the `requester_product`'s org (`org_admin` or `dept_head`
  of its department). Status starts `"pending"`.
- Edge cases: `requester_product` not in caller's org → 403; `partner_product` not found in
  `partner_org` → 404; existing live link for the same product pair → 409 (unique index).

**`GET /api/product-links`** — list links relevant to the caller's org: **outgoing**
(`requester_org_id == my org`) and **incoming** (`partner_org_id == my org`, typically
`status: "pending"` awaiting response). Support a `direction` query param.

**`PATCH /api/product-links/{id}`** — respond to or change a link.
- Body: `{ "action": "confirm"|"reject"|"revoke" }`.
- `confirm` / `reject`: allowed only for a user in `partner_org_id` (`org_admin`/`dept_head`)
  and only while `status == "pending"`. `confirm` sets `status: "confirmed"`, snapshots
  `shared.value_kg = partner_product.carbon.per_unit_kg` (422 if the partner product has no
  calculated carbon), `shared.snapshot_at = now`, `responded_by`, `responded_at`. `reject`
  sets `status: "rejected"`.
- `revoke`: allowed for a user in **either** org; sets `status: "revoked"`. Any product that
  had adopted this link's value reverts to its own calculated carbon (see adopt endpoint).
- Edge cases: acting on a link where the caller is on the wrong side → 403; acting on an
  already-responded link (`status != "pending"` for confirm/reject) → 409.

**`POST /api/products/{id}/adopt-linked-value`** — apply a confirmed link's shared value to a
product.
- Body: `{ "link_id": ObjectId }`.
- Precondition: the link is `confirmed`, the product is the link's `requester_product`, and
  `shared.value_kg` is set.
- Logic: set `product.carbon.per_unit_kg = shared.value_kg`, `product.carbon.reference_id =
  null`, and record that the source is the partner link (store `product.carbon.source_link_id =
  link_id`). Subsequent `record-production` writes `carbon_transactions` with `source_type:
  "linked_partner"` and `source_ref = {collection:"product_links", id: link_id}` so provenance
  crosses company lines. Revoking the link reverts the product to requiring its own
  `calculate-carbon`.

### 5. Frontend requirements

**Product Sales (sub-section of the Product detail page from Phase 13).**
- On the Environmental → Product ESG Profiles detail page, add a **Sales** panel: a DataTable
  of periods (Units Sold, Unit Price, Revenue) with Add/Edit (Modal with MoneyInput). Revenue
  shown read-only (server-computed).
- States: loading, empty ("No sales recorded"), error, success.

**Overhead Allocation (new page under Environmental, and surfaced in Reports).**
- Controls: a department selector (defaults to whole org) and a PeriodFilter, plus a **Run
  Allocation** button. Results: a DataTable of products with Revenue, Revenue Share %,
  Allocated kg; a callout showing `unallocated_kg` when there were no sales. A history list of
  prior runs with a "superseded" StatusBadge.
- States: loading, empty (no overhead in scope → "No facility carbon to allocate for this
  period"), error, success.
- Reuse: PeriodFilter, DataTable, StatusBadge, the department selector from Phase 11.

**Partner Links (new page under Environmental).**
- Two tabs: **Outgoing** (my requests — columns: My Product, Partner Org, Partner Product,
  Type, Status badge) and **Incoming** (requests to confirm — with Approve / Reject buttons).
- **New Link** Wizard: step 1 pick one of my products (SearchBox), step 2 search a partner org
  (SearchBox), step 3 pick the partner product, step 4 choose link type → submit.
- A confirmed link row shows the shared per-unit value and an **Adopt value** action on the
  requester's product; a **Revoke** action on either side.
- States: loading, empty (per tab), error, success; StatusBadge for
  pending/confirmed/rejected/revoked.
- Reuse: Wizard (as used by the challenge creator / report builder), DataTable, Modal,
  StatusBadge, SearchBox, tabs.

### 6. Background jobs or scheduled tasks

- None. Allocation runs are explicit, on-demand, and produce point-in-time snapshots; they do
  not auto-refresh when new sales or facility data arrive. Do not build an auto-allocation
  job or an auto-recompute-on-change job in this phase.

### 7. Explicit non-goals for this phase

- No bill-of-materials / multi-level component trees — a link is a single direct
  product↔product join carrying one shared value.
- No signed-link or public confirmation page for a link (that trust mechanism belongs to the
  carbon-credit marketplace in a later phase, not here).
- No payment or settlement of any kind.
- No writing allocated_kg back into `carbon_transactions` (avoid double-counting) — allocation
  is a reporting layer.
- No mixed-currency allocation.
- No auto-confirming of links in this phase; confirmation is an explicit partner action.

### 8. Acceptance criteria

- With two products sold in a period and facility overhead present, running allocation
  produces `allocated_kg` proportional to each product's revenue share, summing (within
  rounding) to `overhead_total_kg`, and demonstrably not an equal split.
- A period with overhead but zero sales yields a run with empty `lines` and `unallocated_kg ==
  overhead_total_kg` (no equal split).
- Re-running an allocation for the same scope+period marks the previous run `superseded` and
  leaves exactly one `current` run.
- A requester creates a link; the partner org sees it under Incoming and confirms it, which
  snapshots the partner product's `per_unit_kg` into `shared.value_kg`; the requester can then
  adopt that value, and a subsequent production record is written with `source_type:
  "linked_partner"`. Revoking reverts the product to its own calculation.
- Duplicate product-pair links are rejected (409); acting on the wrong side is rejected (403);
  responding to an already-responded link is rejected (409).

---

## Phase 15 — Scoped Sub-Admins

### 1. Phase goal

This phase introduces sub-administrators whose authority to edit carbon reference data is
limited to an assigned scope — either a country/region or a sector/industry (product
category) — while the Master Admin retains full, unrestricted access. It exists after the two
reference tables (`city_profiles` in Phase 12, `carbon_reference` in Phase 13) are in place,
because it constrains exactly who may edit which rows of those tables. Reference figures are
expected to be corrected and refined over time; this phase lets that maintenance be delegated
regionally or by sector without handing out global admin rights.

### 2. Dependencies from Phases 1–14

- `users.roles` (Phase 2) — the array already reserves the entry shape `{ "role":
  "sub_admin", "scope": { "kind": "region"|"sector", "values": [...] } }`. This phase
  activates enforcement of it. `master_admin` remains unrestricted.
- `carbon_reference` (Phase 13) endpoints `POST /api/carbon-reference` and `PATCH
  /api/carbon-reference/{id}` — currently `master_admin`-only; this phase opens them to
  in-scope sub-admins.
- `city_profiles` (Phase 12) endpoints `POST /api/city-profiles` and `PATCH
  /api/city-profiles/{id}` — same change.
- `reference_value_history` (Phase 13) — value changes continue to be logged, now with
  `changed_by` being the sub-admin.
- Auth dependencies `get_current_user`, `require_roles`; this phase adds a scope-check helper.
- Frontend Settings area (role/user management) and the Carbon Reference (Phase 13) and City
  Profiles (Phase 12) admin pages, which gain per-row edit gating.
- Reusable components: DataTable, Modal, StatusBadge, a multi-select control.

### 3. Data model changes

No new collection. This phase formalizes and enforces `users.roles[]` entries of the form:

```json
{ "role": "sub_admin", "scope": { "kind": "region", "values": ["IN", "DE"] } }
```
```json
{ "role": "sub_admin", "scope": { "kind": "sector", "values": ["steel", "aluminium_part"] } }
```

- `scope.kind`: `"region"` → `values` are ISO country codes; `"sector"` → `values` are
  `product_category` strings (matching `carbon_reference.product_category`).
- A user may hold **multiple** `sub_admin` role entries (e.g. a region scope and a sector
  scope). Their effective authority is the **union**: an edit is allowed if **any** of their
  sub_admin scopes authorizes the target row.

### 4. Backend requirements

**Scope-check logic (authoritative).** For a target reference row and a caller:

- `master_admin` → always allowed (edit any `carbon_reference` or `city_profiles` row).
- `sub_admin` with a `region` scope `[countries]`:
  - may edit a `carbon_reference` row iff `row.country ∈ countries`.
  - may edit a `city_profiles` row iff `row.country ∈ countries`.
- `sub_admin` with a `sector` scope `[categories]`:
  - may edit a `carbon_reference` row iff `row.product_category ∈ categories`.
  - **may not edit `city_profiles`** at all (city profiles have no product category). This
    must be stated in any 403 message.
- A caller with both region and sector scopes is allowed if **either** grants the edit
  (union).
- **Reads are not scoped** — any admin (master or sub) may read all reference data
  (transparency). Only writes are scoped.
- **Creating** a new reference row is scoped by the row being created: its `country` (region
  scope) or `product_category` (sector scope) must fall within the caller's scope.
- A `sub_admin` whose relevant scope `values` is empty may edit nothing.

Apply this check inside the existing endpoints:

- `POST /api/carbon-reference`, `PATCH /api/carbon-reference/{id}` — replace the
  `master_admin`-only guard with: `master_admin` OR in-scope `sub_admin`. On failure return
  403 with a message naming the scope required (e.g. `"Editing IN rows requires a region scope
  including IN"`). Value changes still write `reference_value_history` with `changed_by =
  caller`.
- `POST /api/city-profiles`, `PATCH /api/city-profiles/{id}` — same, but only `region`
  sub-admins (plus master) qualify; a `sector`-only sub-admin is refused with the city-profile
  note above.

**New endpoints for managing sub-admins (`master_admin` only):**

- **`POST /api/admin/sub-admins`** — grant a sub-admin scope to a user.
  - Body: `{ "user_id": ObjectId, "scope": { "kind": "region"|"sector", "values": [str] } }`.
  - Logic: append a `{ "role": "sub_admin", "scope": {...} }` entry to the user's `roles`
    (do not duplicate an identical scope). Validate `values` non-empty; region values look
    like country codes; sector values should match existing `carbon_reference.product_category`
    values (warn, don't hard-fail, if a category is not yet present).
  - Edge cases: user not found in org → 404; empty `values` → 422.
- **`DELETE /api/admin/sub-admins/{user_id}`** — remove a sub-admin scope.
  - Body/query: `{ "kind", "values" }` identifying which scope entry to remove (or remove all
    sub_admin entries if none specified).
- **`GET /api/admin/sub-admins`** — list users holding `sub_admin` roles with their scopes.
- **`GET /api/me/scope`** — return the current user's effective edit scope, e.g.
  `{ "is_master": false, "region": ["IN"], "sector": ["steel"] }`, so the frontend can show or
  hide edit affordances per row without trial-and-error.

### 5. Frontend requirements

**Settings → Sub-Admins (new page under the Settings administration area; `master_admin`
only).**
- DataTable: User, Scope Kind (StatusBadge "Region"/"Sector"), Scope Values (chips), actions.
- **Assign** Modal: pick a user (SearchBox); choose scope kind (radio: Region / Sector); a
  multi-select of values — country codes for Region, `product_category` values for Sector.
  A user may be assigned more than one scope.
- **Revoke** action per scope entry (ConfirmDialog).
- States: loading, empty ("No sub-admins assigned"), error, success.
- Reuse: DataTable, Modal, StatusBadge, SearchBox, ConfirmDialog, multi-select.

**Carbon Reference (Phase 13) & City Profiles (Phase 12) admin pages — add per-row gating.**
- On load, call `GET /api/me/scope`. Master admin: all rows editable as before. Sub-admin:
  the Edit control is enabled only on rows within scope (region → matching `country`; sector →
  matching `product_category`; sector sub-admins see City Profiles edit disabled entirely).
  Out-of-scope rows show a disabled Edit with a tooltip ("Outside your assigned scope").
- States: unchanged from Phases 12/13 plus the scope-driven enable/disable of Edit.

### 6. Background jobs or scheduled tasks

- None.

### 7. Explicit non-goals for this phase

- Scope restricts **only** reference-data editing (`carbon_reference`, `city_profiles`). It
  does not restrict any org data (carbon transactions, products, facilities, users, etc.) —
  those remain governed by the existing org-scoping and role rules.
- No approval workflow for reference edits (an in-scope sub-admin edits directly).
- No region hierarchy (region = a flat list of country codes; no continents/groupings).
- No time-bound or expiring scopes.

### 8. Acceptance criteria

- A region sub-admin scoped to `["IN"]` can `PATCH` a `carbon_reference` row with
  `country: "IN"` and receives 403 attempting to edit a `country: "DE"` row.
- A sector sub-admin scoped to `["steel"]` can edit `steel` reference rows across any country
  and is refused (403, with the city-profile note) when attempting to edit any `city_profiles`
  row.
- A user holding both a region and a sector scope can edit a row authorized by either.
- Master admin can still edit any row; every edit (by master or sub-admin) writes a
  `reference_value_history` entry with `changed_by` set to the actual editor.
- `GET /api/me/scope` reflects assignments immediately after grant/revoke, and the Carbon
  Reference / City Profiles pages enable Edit only on in-scope rows.

---

## Carry-forward context (what Phases 11–15 touch or modify in Phases 1–10)

Anything below already exists from Phases 1–10; Phases 11–15 change or extend it. Do not break
the existing behavior.

- **`departments`** gains a required `ancestors` array (Phase 11). All department-scoped
  queries, the **Settings → Departments** page (now a tree), and the Dashboard **Department
  ESG Ranking** must keep working. Existing flat management (create/edit/archive) is preserved;
  it now also maintains `ancestors`. A one-time backfill migration populates `ancestors` for
  pre-existing departments.
- **`carbon_transactions`** gains new `source_type` values: `"facility_commute"`,
  `"facility_electricity"` (Phase 12), `"product"` (Phase 13), `"linked_partner"` (Phase 14).
  (`"offset_purchase"` remains reserved for a later NGO-marketplace phase.) Any Phase 10 code
  that enumerates `source_type` (dashboards, the emissions trend, the custom report builder's
  Module filter) must tolerate these new values. Because the Phase 11 rollup and all Phase 10
  dashboards read the ledger directly, facility and product carbon appear automatically once
  written.
- **`users.roles`** — the reserved `sub_admin` role with a `scope` object becomes enforced in
  Phase 15. The role-assignment UI from the Settings area is extended with a Sub-Admins page.
  `dept_head` role is now also granted automatically when a user is assigned as a department
  head (Phase 11).
- **`reference_value_history`** is introduced in Phase 13 but also records changes made through
  the Phase 12 `city_profiles` PATCH endpoint. When building Phase 13, retro-wire the
  Phase 12 city-profile edit endpoint to log to `reference_value_history` with
  `ref_collection: "city_profiles"`. Phase 15's scoped edits log here too.
- **Environmental → Product ESG Profiles** page exists as a stub from Phase 5; Phase 13
  implements its full backend and UI, and Phase 14 adds a Sales panel and depends on that page.
- **Environmental** nav group gains new sub-items: Facilities (Phase 12), Overhead Allocation
  and Partner Links (Phase 14). **Settings → ESG Configuration** gains City Profiles (Phase 12)
  and Carbon Reference (Phase 13) admin pages; the Settings administration area gains
  Sub-Admins (Phase 15).
- **Reports / Custom Report Builder** (Phase 10) — its Module filter and data sources should
  now include facility carbon, product carbon, and overhead allocation so reports reflect the
  new carbon sources. Existing filters (Department, Date Range, Employee, Challenge, ESG
  Category) are unchanged.
- **Org-scoping helper** — must exempt the GLOBAL reference collections `city_profiles`,
  `carbon_reference`, and `reference_value_history` (they carry no `org_id`), the same way the
  platform organization is already exempt. `product_links` deliberately references two
  `org_id`s and must not be forced through single-org scoping; use the explicit per-side access
  rules in Phase 14 instead.
- **No changes** to auth token/session mechanics, OTP, password hashing, the Social module,
  the Governance module, or the Gamification module core. Phases 11–15 add carbon/reference/
  hierarchy surfaces and one new admin-scoping rule; they must leave those subsystems intact.
```
