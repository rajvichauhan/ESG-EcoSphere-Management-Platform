# EcoSphere ESG Platform — MongoDB Schema

Sources merged: `plan-esg (1).txt` (build handoff), `EcoSphere ESG Management Platform.pdf`
(hackathon problem statement + suggested data model), `ecospher - 8 hours.png` (wireframes).

**Hackathon reality check (8 hours):** collections are split into **CORE** (build these —
they power every wireframe screen) and **PHASE 2** (design is final, create them only when
you get there; nothing in CORE needs migration to add them).

## Conventions

- snake_case everywhere; every doc has `_id`, `created_at`, `updated_at` (UTC).
- **Every tenant-owned doc carries `org_id`.** Multi-org from day one (plan requirement),
  even while one org exists. Master Admin / sub-admins belong to a `platform`-type org so
  the rule has no exceptions.
- Carbon amounts always **kg CO2e**. Periods always `{ year, month }` subdocs. Money as
  `{ amount, currency }`.
- Derived state ("overdue", "progress %", parent rollups) is **computed at query time**,
  never stored — except explicit period snapshots (`department_scores`).
- MongoDB is schemaless: shapes enforced by Pydantic models in the service layer.
  Transactions (redemption, credit purchase) need a replica set — run single-node RS in dev.

---

# CORE (hackathon MVP)

## Identity & tenancy

### `organizations`
```js
{ _id, name, type: "platform"|"corporate"|"ngo",   // ngo unused until Phase 2, costs nothing now
  status: "active"|"suspended",
  settings: {
    esg_weights: { e: 40, s: 30, g: 30 },          // configurable per org (PDF §5)
    auto_emission_calculation: true,               // ESG Configuration toggles (PDF §8 /
    require_csr_evidence: true,                    //  wireframe Settings screen)
    badge_auto_award: true,
    email_compliance_alerts: true
  },
  created_at, updated_at }
```

### `users`
```js
{ _id, org_id,
  email,                       // unique, lowercased
  password_hash,               // bcrypt/argon2 — never plain text
  full_name,
  department_id: ObjectId|null,
  roles: [                     // array of role objects — new account types = new enum values
    { role: "master_admin" },
    { role: "sub_admin", scope: { kind: "region"|"sector", values: ["IN","steel"] } }, // Phase 2
    { role: "org_admin" }, { role: "dept_head" }, { role: "employee" }, { role: "ngo_member" }
  ],
  status: "pending_verification"|"active"|"disabled",
  xp_total: 0,                 // lifetime, never decreases → levels, badges, leaderboard
  points_balance: 0,           // spendable on rewards; cached rollups of xp_ledger
  created_at, updated_at }
```
Indexes: `{email:1}` unique; `{org_id:1, department_id:1}`; `{org_id:1, xp_total:-1}` (leaderboard).

> PDF says rewards redeem "Points/XP"; plan says "points". Modeled as **two counters**:
> XP is reputation (never spent), points are currency (deducted on redemption). This keeps
> the leaderboard from dropping when someone redeems a mug. Earning events grant both.

### `sessions` — long-lived refresh tokens (plan: no frequent re-auth)
```js
{ _id, user_id, org_id, token_hash,     // sha256 of opaque token; access JWTs not stored
  expires_at,                           // sliding, e.g. +30d on each refresh
  last_used_at, ip, user_agent, revoked_at: null, created_at }
```
Indexes: `{token_hash:1}` unique; `{user_id:1}`; TTL on `expires_at`.

### `otps`
```js
{ _id, email, code_hash, purpose: "register"|"login"|"password_reset",
  attempts: 0, consumed_at: null, expires_at, created_at }
```
Indexes: `{email:1, purpose:1}`; TTL on `expires_at` (~10 min).

## Master data

### `departments` — recursive tree, parent ref + ancestors array
```js
{ _id, org_id, name,
  code,                        // "MFG", "LOG" (wireframe Settings screen)
  parent_id: ObjectId|null, ancestors: [ObjectId],   // ordered root→parent; [] = root
  head_user_id: ObjectId|null,
  employee_count: 0,           // reported figure (PDF master data), used by commute calc later
  status: "active"|"archived", created_at, updated_at }
```
Indexes: `{org_id:1, parent_id:1, name:1}` unique; `{org_id:1, ancestors:1}`.

- "Create sub-dept under your own node": service checks caller's dept == new `parent_id`
  or ∈ its `ancestors`.
- **Rollups computed, never stored**: fetch descendant ids via one `ancestors` query, then
  aggregate facts with `department_id: {$in: [...]}` — parent figure is exactly the sum of
  children (plan requirement), nothing to drift.

### `categories` — shared master for CSR + Challenge (PDF)
```js
{ _id, org_id, name, type: "csr_activity"|"challenge",
  status: "active"|"archived", created_at, updated_at }
```
Index: `{org_id:1, type:1, name:1}` unique.

### `emission_factors` — org-configurable factors for auto emission calculation
```js
{ _id, org_id,
  activity: "purchase"|"manufacturing"|"expense"|"fleet",  // ERP operation types (PDF §8)
  item: "diesel_litre"|"grid_kwh"|"steel_kg"|"road_km"|...,// free string, what's being measured
  label, factor_kg_per_unit, unit_label,
  source: string|null,         // where the number came from — capture when available
  year, status: "active"|"retired", created_at, updated_at }
```
Index: `{org_id:1, activity:1, item:1, year:-1}`.

### `badges`
```js
{ _id, org_id: ObjectId|null,  // null = platform-wide
  name, description, icon_file_id,
  unlock_rule: { metric: "xp_total"|"challenges_completed"|"csr_approved"
               | "trainings_completed", threshold: 10 },   // rules as data → rule engine
  status: "active"|"retired", created_at, updated_at }
```

### `rewards`
```js
{ _id, org_id, name, description, image_file_id: null,
  cost_points, stock: 25,      // decremented atomically, never negative
  status: "active"|"inactive", created_at, updated_at }
```

### `policies` — versioned governance policies
```js
{ _id, org_id, policy_group_id,    // stable id across versions of one policy
  version: 1, title, body: string|null, file_id: ObjectId|null,
  effective_date, status: "draft"|"published"|"retired",
  created_by, created_at, updated_at }
```
Index: `{org_id:1, policy_group_id:1, version:-1}`.

### `sustainability_goals` — wireframe: Name, Department, Target CO₂, Deadline, Status
```js
{ _id, org_id, department_id: ObjectId|null,
  name, metric: "total_carbon_kg"|...,
  baseline_value, target_value, unit: "t CO2e",
  start: { year, month }, deadline: { year, month },
  status: "active"|"on_track"|"completed"|"missed",   // display statuses from wireframe
  created_by, created_at, updated_at }
```
"Current CO₂" / progress % computed from `carbon_transactions` at read time.

## Transactional data

### `operational_records` — the ERP-side events that generate carbon
One collection, discriminated by `op_type` (a hackathon doesn't need four collections):
```js
{ _id, org_id, department_id,
  op_type: "purchase"|"manufacturing"|"expense"|"fleet",
  description,
  quantity, unit_label,            // 1200 kWh, 340 km, 50 kg steel…
  amount: { amount, currency }|null,   // monetary value where relevant
  occurred_at,
  created_by, created_at, updated_at }
```
Index: `{org_id:1, op_type:1, occurred_at:-1}`.

### `carbon_transactions` — the spine: every carbon quantity in the system
Auto-generated from `operational_records` when `auto_emission_calculation` is on
(matched via `emission_factors`), or entered manually. Dashboards, dept tracking, goals,
scores, and forecasting all read this one collection.
```js
{ _id, org_id, department_id: ObjectId|null,   // leaf dept; null = org-level
  period: { year, month },
  amount_kg,                       // positive = emission; NEGATIVE = offset (Phase 2 credits)
  source_type: "purchase"|"manufacturing"|"expense"|"fleet"|"manual"
             | "facility_commute"|"facility_electricity"|"product"|"offset_purchase", // Phase 2 types
  source_ref: { collection, id }|null,          // provenance pointer
  calculation: { factor_id: ObjectId|null, factor_value, inputs: {},
                 is_approximation: false },      // snapshot: number stays explainable
  note: string|null, created_by, created_at, updated_at }
```
Indexes: `{org_id:1, "period.year":1, "period.month":1}`;
`{org_id:1, department_id:1, "period.year":1}`;
`{"source_ref.collection":1, "source_ref.id":1}` (recalc = replace entries for a source).

### `csr_activities`
```js
{ _id, org_id, department_id: ObjectId|null,
  title, description, category_id,             // → categories(type:"csr_activity")
  activity_date, location: string|null,
  evidence_required: bool,                     // per-activity; org toggle forces true
  points_reward, xp_reward,
  status: "planned"|"open"|"completed"|"cancelled",
  created_by, created_at, updated_at }
```

### `csr_participations` — join → proof upload → approval queue (wireframe)
```js
{ _id, org_id, activity_id, user_id, department_id,
  proof_file_ids: [ObjectId], note: null,
  status: "joined"|"submitted"|"approved"|"rejected",
  points_earned: number|null, completed_at: datetime|null,   // set on approval
  reviewed_by: null, reviewed_at: null, review_note: null,
  created_at, updated_at }
```
Indexes: `{activity_id:1, user_id:1}` unique; `{org_id:1, status:1}` (approval queue).
Approval writes the `xp_ledger` grant; if `evidence_required` and no proof files → cannot approve.

### `diversity_metrics`
```js
{ _id, org_id, department_id: ObjectId|null,
  period: { year, month }, dimension: "gender"|"age_band"|...,
  breakdown: { "female": 41, "male": 55, "other_undisclosed": 4 },   // flexible map
  reported_by, created_at, updated_at }
```
Index: `{org_id:1, department_id:1, dimension:1, "period.year":1, "period.month":1}` unique.

### `trainings` / `training_completions`
```js
{ _id, org_id, title, description, category: null,
  status: "active"|"archived", created_by, created_at, updated_at }

{ _id, org_id, training_id, user_id, department_id,
  completed_at, score: null, created_at }
```
Index: completions `{training_id:1, user_id:1}` unique.

### `policy_acknowledgements` — pinned to the exact version the user saw
```js
{ _id, org_id, policy_id, policy_group_id, version, user_id, acknowledged_at }
```
Index: `{policy_id:1, user_id:1}` unique.

### `audits` — wireframe: Title, Department, Auditor, Date, Findings, Status
```js
{ _id, org_id, department_id: ObjectId|null,
  title, audit_type: "internal"|"external", auditor_name,
  scheduled_date, completed_date: null,
  findings: string|null, report_file_id: null,
  status: "scheduled"|"in_progress"|"under_review"|"completed",
  created_by, created_at, updated_at }
```

### `compliance_issues`
```js
{ _id, org_id, department_id: ObjectId|null,
  audit_id: ObjectId|null,         // wireframe: "issues raised from audits"; standalone allowed
  title, description, severity: "low"|"medium"|"high"|"critical",
  owner_user_id: ObjectId,         // REQUIRED (PDF §8)
  due_date: datetime,              // REQUIRED
  status: "open"|"in_progress"|"resolved"|"closed",
  resolution_note: null, resolved_at: null,
  created_by, created_at, updated_at }
```
Index: `{org_id:1, status:1, due_date:1}`.
**Overdue is a query, not a field**: `status ∈ {open,in_progress} AND due_date < now` —
never goes stale. A daily/scheduled check feeds the notification system.

## Gamification

### `challenges` — PDF fields: Title, Category, XP, Difficulty, Evidence, Deadline, Status
```js
{ _id, org_id, title, description,
  category_id,                     // → categories(type:"challenge")
  difficulty: "easy"|"medium"|"hard",
  xp_reward, points_reward,
  evidence_required: bool,
  starts_at, deadline,
  status: "draft"|"active"|"under_review"|"completed"|"archived",
  // service-enforced transitions: draft→active→under_review→completed; any→archived
  created_by, created_at, updated_at }
```
Index: `{org_id:1, status:1}` (kanban board groups by status).

### `challenge_participations`
```js
{ _id, org_id, challenge_id, user_id, department_id,
  progress: 0,                     // 0–100 (PDF "Progress")
  proof_file_ids: [ObjectId],
  status: "joined"|"submitted"|"approved"|"rejected",
  xp_awarded: number|null, completed_at: null,
  reviewed_by: null, reviewed_at: null,
  certificate: { file_id, share_token, issued_at }|null,  // shareable cert (plan extra #3);
  created_at, updated_at }                                // share_token → public verify page
```
Indexes: `{challenge_id:1, user_id:1}` unique; `{"certificate.share_token":1}` unique sparse.

### `xp_ledger` — source of truth; user counters are cached rollups
```js
{ _id, org_id, user_id,
  xp_delta, points_delta,          // points_delta negative on redemption
  reason: "challenge_completed"|"csr_approved"|"training_completed"
        | "badge_awarded"|"reward_redeemed"|"admin_adjustment",
  source_ref: { collection, id }, created_at }
```
Indexes: `{user_id:1, created_at:-1}`; `{org_id:1, created_at:-1}` (monthly leaderboards).

### `user_badges`
```js
{ _id, org_id, user_id, badge_id, awarded_at, source_ref: {...}|null }
```
Index: `{user_id:1, badge_id:1}` unique — makes auto-award **idempotent**: concurrent
unlock checks can't double-award.

### `reward_redemptions`
```js
{ _id, org_id, reward_id, user_id, points_spent,
  status: "redeemed"|"fulfilled"|"cancelled", created_at, updated_at }
```
Stock + balance safety, one transaction:
`rewards: find_one_and_update({_id, stock:{$gte:1}, status:"active"}, {$inc:{stock:-1}})` +
`users: find_one_and_update({_id, points_balance:{$gte:cost}}, {$inc:{points_balance:-cost}})` +
insert redemption + xp_ledger debit. Guarded `$inc` = no oversell, no negative balance.

## Scores, notifications, files

### `department_scores` — PDF "Department Score", monthly snapshot per dept + org rollup
```js
{ _id, org_id, department_id: ObjectId|null,   // null = org-level overall
  period: { year, month },
  e_score, s_score, g_score,                   // 0–100
  total_score,                                 // weighted by org settings.esg_weights
  weights_used: { e: 40, s: 30, g: 30 },       // snapshot — history survives weight changes
  components: {},                              // sub-metrics for drill-down
  computed_at }
```
Index: `{org_id:1, department_id:1, "period.year":1, "period.month":1}` unique.
Powers: dashboard score tiles, department ESG ranking, and the **ESG score trend line**
(plan extra #2) with zero recomputation. Emission forecasting (extra #1) reads monthly
series from `carbon_transactions` — no collection needed.

### `notifications` — PDF §8 notification system
```js
{ _id, org_id, user_id,                        // recipient
  type: "compliance_issue_raised"|"compliance_overdue"|"csr_decision"
      | "challenge_decision"|"policy_ack_reminder"|"badge_unlocked",
  title, body, source_ref: { collection, id },
  channel: ["in_app","email"],                 // email only if org/user toggles allow
  read_at: null, emailed_at: null, created_at }
```
Index: `{user_id:1, read_at:1, created_at:-1}`.

### `files` — backend-agnostic (local now → Backblaze B2 later, zero data migration)
```js
{ _id, org_id, uploaded_by,
  backend: "local"|"b2",
  storage_key,                 // opaque relative key "org/<id>/csr/<uuid>.jpg" — NEVER an absolute path
  original_name, mime_type, size_bytes,
  purpose: "csr_proof"|"challenge_proof"|"policy_doc"|"audit_report"
         | "certificate"|"badge_icon"|"reward_image"|"project_doc",
  created_at }
```

---

# PHASE 2 (post-MVP — design final, build later)

### `carbon_reference` — the shared global table (plan §"Shared carbon reference table")
```js
{ _id,
  country,                         // required, ISO code
  city: string|null,               // null = country-wide row
  product_category,                // required
  product_name: string|null,       // null = category-level row
  description: string|null, year,
  carbon_value, unit: "per_unit"|"per_kg"|"per_kwh",
  source: string|null,             // report / database / LLM lookup that produced it
  updated_by, created_at, updated_at }
```
Index: `{country:1, city:1, product_category:1, product_name:1, year:1}` unique
(null is indexable — one unambiguous country-level row per combo).
**Lookup fallback**, most→least specific, each result records its tier:
1. country+city+category+product_name (nearest year ≤ requested) →
2. country+category+product_name → 3. country+category → 4. category
Anything below tier 1 sets `is_approximation: true` on the resulting transaction.
**Scoped sub-admin writes**: region scope must contain row.country; sector scope must
contain row.product_category; Master Admin unrestricted. Enforced in service layer.

### `reference_value_history` — every value change (values get "corrected and refined")
```js
{ _id, reference_id, ref_collection: "carbon_reference"|"city_profiles",
  old_value, new_value, old_source, new_source, changed_by, changed_at }
```

### `city_profiles` — commute + grid assumptions per city/year
```js
{ _id, country, city, year,
  avg_commute_km_per_day,
  transport_mix: [{ mode: "car"|"bus"|"rail"|"two_wheeler"|"walk",
                    share: 0.4, factor_kg_per_km: 0.17 }],
  grid_renewable_pct: 0.32, grid_factor_kg_per_kwh: 0.71,   // factor for non-renewable share
  electricity_tariff_per_kwh: { amount, currency }|null,     // converts bills → kWh
  working_days_per_month: 22,
  source: null, updated_by, created_at, updated_at }
```
Index: `{country:1, city:1, year:1}` unique. Same scoped-admin + history rules.

### `facilities` / `facility_readings` — office & facility carbon
```js
{ _id, org_id, department_id: ObjectId|null, name, country, city,
  employee_count, status: "active"|"closed", created_at, updated_at }

{ _id, org_id, facility_id, department_id, period: { year, month },
  inputs: { electricity_kwh: null, electricity_bill: {amount,currency}|null,
            employee_count_override: null },
  computed: { commute_kg, electricity_kg, total_kg,
              city_profile_id, assumptions: {...} },    // snapshot → explainable
  created_at, updated_at }
```
Reading index: `{facility_id:1, "period.year":1, "period.month":1}` unique.
Saving a reading upserts matching `carbon_transactions` rows (facility_commute /
facility_electricity) — dashboards need no special casing.

### `products` — "Product ESG Profile" (PDF master data)
```js
{ _id, org_id, department_id: ObjectId|null,
  name, category, description: null,
  production_country, production_city,
  unit_price: { amount, currency },
  carbon: { per_unit_kg, reference_id, match_tier,
            is_approximation, calculated_at }|null,     // last reference-table calculation
  status: "active"|"discontinued", created_at, updated_at }
```

### `product_sales` — revenue facts for overhead allocation
```js
{ _id, org_id, product_id, department_id, period: { year, month },
  units_sold, unit_price: { amount, currency }, revenue: { amount, currency },
  created_at, updated_at }
```
Index: `{org_id:1, product_id:1, "period.year":1, "period.month":1}` unique.

### `product_links` — cross-company joining; confirmation modeled from day one
```js
{ _id,
  requester_org_id, requester_product_id,
  partner_org_id, partner_product_id,
  link_type: "component"|"carbon_credit",
  status: "pending"|"confirmed"|"rejected"|"revoked",   // start auto-confirming, flip to
                                                        // real approval later — no migration
  shared: { mode: "partner_per_unit_carbon", value_kg: null, snapshot_at: null },
  requested_by, responded_by: null, responded_at: null, created_at, updated_at }
```
Index: `{requester_product_id:1, partner_product_id:1}` unique.
Confirmed links feed the requester's `carbon_transactions` as `source_type:"product"` with
the link in `source_ref` — provenance crosses company lines intact.

### `overhead_allocations` — stored snapshot per run (stable closed-period reports)
```js
{ _id, org_id, department_id: ObjectId|null, period: { year, month },
  overhead_total_kg,                     // Σ facility/office carbon in scope
  revenue_total: { amount, currency },
  lines: [{ product_id, revenue: {...}, revenue_share: 0.31, allocated_kg: 1240.5 }],
  status: "current"|"superseded", run_by, created_at }
```
Allocation is by **revenue share** (price × units ÷ total revenue) — plan explicitly rejects
equal-split and unit-count. Zero-revenue period ⇒ overhead stays unallocated + flagged
(don't invent an equal split).

### `carbon_credit_projects` / `credit_listings` / `credit_purchases` — NGO marketplace
```js
{ _id, org_id /* NGO */, title, description, country, city: null,
  project_type: "reforestation"|"renewable"|..., document_file_ids: [ObjectId],
  estimated_credits_tonnes,
  status: "draft"|"submitted"|"under_review"|"approved"|"rejected",
  reviewed_by: null, reviewed_at: null, review_note: null,
  created_by, created_at, updated_at }

{ _id, org_id, project_id,               // project must be approved
  price_per_credit: { amount, currency },
  credits_total, credits_available, vintage_year,
  status: "active"|"sold_out"|"withdrawn", created_at, updated_at }

{ _id, listing_id, project_id, seller_org_id, buyer_org_id,
  quantity_tonnes, price_per_credit: {...}, total: {...},
  status: "completed"|"cancelled",        // no payment gateway — recorded immediately
  applied_entry_id: ObjectId,             // the offset row this purchase created
  created_at }
```
**What one credit does (defined at build time, per the plan): 1 credit = 1 tonne CO2e.**
A purchase inserts one `carbon_transactions` row for the buyer:
`amount_kg = -1000 × quantity`, `source_type:"offset_purchase"`, org-level, purchase month.
Net footprint = Σ amount_kg; gross vs offset splits by sign.
**No oversell:** `find_one_and_update({_id, status:"active", credits_available:{$gte:qty}},
{$inc:{credits_available:-qty}})` — guarded atomic decrement; concurrent buyers can't go
below zero. Decrement + purchase doc + offset row = one transaction.

---

## 8-hour build order (schema perspective)

| Hour | Collections touched |
|---|---|
| 0–1 | organizations, users, sessions, otps (auth working end-to-end) |
| 1–2 | departments, categories, emission_factors, files |
| 2–4 | operational_records → carbon_transactions, sustainability_goals (Environmental screens) |
| 4–5 | csr_activities, csr_participations, diversity_metrics, trainings(+completions) |
| 5–6 | policies, policy_acknowledgements, audits, compliance_issues |
| 6–7 | challenges, challenge_participations, xp_ledger, badges, user_badges, rewards, reward_redemptions |
| 7–8 | department_scores, notifications, dashboard queries; reports read existing collections |

Reports & the custom report builder need **no new collections** — they are filtered
aggregations (department, date range, module, employee, challenge, category) over the
transactional collections above. Skip saved-report-definitions unless time is left over.

## Flagged decisions (per the plan's "flag, don't guess" rule)

1. **XP vs points**: PDF says redeem "Points/XP", plan says "points". Modeled as two
   counters (XP = reputation, points = currency) so redemptions don't wreck leaderboards.
2. **Employee count**: PDF puts it on Department, plan Phase 2 puts it on facility/office.
   Both kept — `departments.employee_count` (MVP, drives scoring/commute early),
   `facilities.employee_count` (Phase 2, per location).
3. **Compliance issues**: wireframe shows them "raised from audits", plan treats them
   standalone → `audit_id` is optional.
4. **Emission factors vs carbon reference**: org-scoped `emission_factors` power the Phase 1
   auto-emission calc from ERP records; the global `carbon_reference` table is Phase 2
   (product carbon). They serve different lookups and stay separate.
5. **1 credit = 1 tCO2e** applied as an org-level negative transaction in the purchase
   month — the plan demands this be defined at build time; adjust to purchase-year if wanted.
