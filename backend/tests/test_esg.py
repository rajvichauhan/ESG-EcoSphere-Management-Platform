"""Comprehensive test suite for EcoSphere ESG platform backend (Phases 11-15)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from bson import ObjectId

from app.main import app
from app.db import get_db
from app.auth import create_access_token, hash_password
from app.models.common import utcnow


# ---------------------------------------------------------------------------
# Test Fixtures
# ---------------------------------------------------------------------------

import asyncio

@pytest.fixture
async def test_data():
    try:
        from app.db import get_db
        db = get_db()
    except RuntimeError:
        import app.db as app_db
        await app_db.connect()
        db = app_db.get_db()
    now = utcnow()

    # Clear prior data
    for col in ["organizations", "users", "departments", "city_profiles", "facilities", "facility_readings", "carbon_reference", "reference_value_history", "products", "product_sales", "overhead_allocations", "product_links", "carbon_transactions"]:
        await db[col].delete_many({})

    # 1. Tenant Org
    org_id = ObjectId()
    await db.organizations.insert_one({
        "_id": org_id,
        "name": "Test Org",
        "type": "corporate",
        "status": "active",
        "settings": {"esg_weights": {"e": 40, "s": 30, "g": 30}},
        "created_at": now, "updated_at": now,
    })

    # 2. Master Admin User
    master_id = ObjectId()
    await db.users.insert_one({
        "_id": master_id,
        "org_id": org_id,
        "email": "master@test.com",
        "password_hash": hash_password("pass"),
        "full_name": "Master",
        "roles": [{"role": "master_admin"}],
        "status": "active",
        "created_at": now, "updated_at": now,
    })

    # 3. Regular Org Admin
    admin_id = ObjectId()
    await db.users.insert_one({
        "_id": admin_id,
        "org_id": org_id,
        "email": "admin@test.com",
        "password_hash": hash_password("pass"),
        "full_name": "Admin",
        "roles": [{"role": "org_admin"}],
        "status": "active",
        "created_at": now, "updated_at": now,
    })

    # 4. Plain Employee
    emp_id = ObjectId()
    await db.users.insert_one({
        "_id": emp_id,
        "org_id": org_id,
        "email": "emp@test.com",
        "password_hash": hash_password("pass"),
        "full_name": "Employee",
        "roles": [{"role": "employee"}],
        "status": "active",
        "created_at": now, "updated_at": now,
    })

    # JWT Tokens
    master_token = create_access_token(str(master_id), str(org_id))
    admin_token = create_access_token(str(admin_id), str(org_id))
    emp_token = create_access_token(str(emp_id), str(org_id))

    return {
        "org_id": org_id,
        "master_id": master_id,
        "admin_id": admin_id,
        "emp_id": emp_id,
        "headers": {
            "master": {"Authorization": f"Bearer {master_token}"},
            "admin": {"Authorization": f"Bearer {admin_token}"},
            "emp": {"Authorization": f"Bearer {emp_token}"},
        },
    }


# ---------------------------------------------------------------------------
# Phase 11 Tests — Corporate Hierarchy & Rollups
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase_11_hierarchy(test_data):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = test_data["headers"]["admin"]

        # 1. Create root department
        res = await ac.post("/api/departments", json={
            "name": "Corporate", "code": "CORP", "parent_id": None, "employee_count": 10,
        }, headers=headers)
        assert res.status_code == 201
        root_id = res.json()["_id"]

        # 2. Sibling duplicate name check (should 409)
        res_dup = await ac.post("/api/departments", json={
            "name": "Corporate", "code": "CORP2", "parent_id": None,
        }, headers=headers)
        assert res_dup.status_code == 409

        # 3. Create child department
        res_child = await ac.post("/api/departments", json={
            "name": "Engineering", "code": "ENG", "parent_id": root_id, "employee_count": 20,
        }, headers=headers)
        assert res_child.status_code == 201
        child_id = res_child.json()["_id"]
        assert res_child.json()["ancestors"] == [root_id]

        # 4. Create grandchild department
        res_grand = await ac.post("/api/departments", json={
            "name": "Product Dev", "code": "PROD", "parent_id": child_id, "employee_count": 5,
        }, headers=headers)
        assert res_grand.status_code == 201
        grand_id = res_grand.json()["_id"]
        assert res_grand.json()["ancestors"] == [root_id, child_id]

        # 5. Retrieve tree
        res_tree = await ac.get("/api/departments/tree", headers=headers)
        assert res_tree.status_code == 200
        tree = res_tree.json()
        assert len(tree) == 1
        assert tree[0]["name"] == "Corporate"
        assert len(tree[0]["children"]) == 1
        assert tree[0]["children"][0]["name"] == "Engineering"

        # 6. Assign Head
        res_head = await ac.post(f"/api/departments/{child_id}/assign-head", json={
            "user_id": str(test_data["emp_id"]),
        }, headers=headers)
        assert res_head.status_code == 200
        assert res_head.json()["head_user_id"] == str(test_data["emp_id"])

        # 7. Rollup for a specific department (should fail with 422 if year is missing)
        res_rollup_422 = await ac.get(f"/api/departments/{root_id}/rollup", headers=headers)
        assert res_rollup_422.status_code == 422

        # 8. Rollup for specific department (successful)
        res_rollup = await ac.get(f"/api/departments/{root_id}/rollup?year=2026", headers=headers)
        assert res_rollup.status_code == 200
        assert res_rollup.json()["department_id"] == root_id

        # 9. Rollup for 'root' department (successful)
        res_root_rollup = await ac.get(f"/api/departments/root/rollup?year=2026", headers=headers)
        assert res_root_rollup.status_code == 200
        assert res_root_rollup.json()["department_id"] == root_id


# ---------------------------------------------------------------------------
# Phase 12 Tests — Facility & Office Carbon
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase_12_facilities(test_data):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_master = test_data["headers"]["master"]
        headers_admin = test_data["headers"]["admin"]

        # 1. Create a Global City Profile (Master Admin only)
        res_cp = await ac.post("/api/city-profiles", json={
            "country": "IN",
            "city": "Mumbai",
            "year": 2026,
            "avg_commute_km_per_day": 20.0,
            "transport_mix": [
                {"mode": "car", "share": 0.5, "factor_kg_per_km": 0.1},
                {"mode": "bus", "share": 0.5, "factor_kg_per_km": 0.05},
            ],
            "grid_renewable_pct": 0.2,
            "grid_factor_kg_per_kwh": 0.5,
            "electricity_tariff_per_kwh": {"amount": 0.1, "currency": "USD"},
            "working_days_per_month": 20,
            "source": "Grid Audit",
        }, headers=headers_master)
        assert res_cp.status_code == 201

        # 2. Create Facility
        res_fac = await ac.post("/api/facilities", json={
            "name": "Mumbai HQ",
            "country": "IN",
            "city": "Mumbai",
            "employee_count": 100,
        }, headers=headers_admin)
        assert res_fac.status_code == 201
        fac_id = res_fac.json()["_id"]

        # 3. Log Reading (electricity_kwh direct)
        # commute_kg = employees × working_days × avg_commute_km × transport_mix_factor
        # commute_kg = 100 * 20 * 20 * (0.5*0.1 + 0.5*0.05) = 40000 * 0.075 = 3000 kg CO2e
        # electricity_kg = (kwh * (1 - grid_renewable_pct)) * grid_factor
        # electricity_kg = (1000 * (1 - 0.2)) * 0.5 = 800 * 0.5 = 400 kg CO2e
        # total = 3400 kg CO2e
        res_read = await ac.post(f"/api/facilities/{fac_id}/readings", json={
            "period": {"year": 2026, "month": 6},
            "inputs": {
                "electricity_kwh": 1000,
                "electricity_bill": None,
                "employee_count_override": None,
            },
        }, headers=headers_admin)
        assert res_read.status_code == 200
        data = res_read.json()
        assert data["computed"]["commute_kg"] == pytest.approx(3000.0)
        assert data["computed"]["electricity_kg"] == pytest.approx(400.0)
        assert data["computed"]["total_kg"] == pytest.approx(3400.0)


# ---------------------------------------------------------------------------
# Phase 13 Tests — Product & Manufacturing Carbon
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase_13_products(test_data):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_master = test_data["headers"]["master"]
        headers_admin = test_data["headers"]["admin"]

        # 1. Seed Global Carbon Reference Row (Tier 1)
        res_ref = await ac.post("/api/carbon-reference", json={
            "country": "IN",
            "city": "Pune",
            "product_category": "components",
            "product_name": "Bracket X",
            "year": 2026,
            "carbon_value": 4.5,
            "unit": "per_unit",
            "source": "LCA Report",
        }, headers=headers_master)
        assert res_ref.status_code == 201

        # 2. Register Product
        res_prod = await ac.post("/api/products", json={
            "name": "Bracket X",
            "category": "components",
            "production_country": "IN",
            "production_city": "Pune",
            "unit_price": {"amount": 5.0, "currency": "USD"},
        }, headers=headers_admin)
        assert res_prod.status_code == 201
        prod_id = res_prod.json()["_id"]

        # 3. Calculate Product Carbon (Tier 1 exact match)
        res_calc = await ac.post(f"/api/products/{prod_id}/calculate-carbon", json={
            "year": 2026,
        }, headers=headers_admin)
        assert res_calc.status_code == 200
        assert res_calc.json()["carbon"]["per_unit_kg"] == 4.5
        assert res_calc.json()["carbon"]["match_tier"] == 1
        assert res_calc.json()["carbon"]["is_approximation"] is False

        # 4. Record Production
        res_rec = await ac.post(f"/api/products/{prod_id}/record-production", json={
            "period": {"year": 2026, "month": 6},
            "quantity_units": 1000,
        }, headers=headers_admin)
        assert res_rec.status_code == 200
        assert res_rec.json()["amount_kg"] == 4500.0


# ---------------------------------------------------------------------------
# Phase 14 Tests — Overhead Allocation & Links
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase_14_allocations(test_data):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_master = test_data["headers"]["master"]
        headers_admin = test_data["headers"]["admin"]

        # 1. Setup departments, facility carbon, and products
        res_dept = await ac.post("/api/departments", json={
            "name": "Logistics", "code": "LOG",
        }, headers=headers_admin)
        dept_id = res_dept.json()["_id"]

        # Global City profile and facility reading (similar to Phase 12)
        await ac.post("/api/city-profiles", json={
            "country": "SG", "city": "Singapore", "year": 2026, "avg_commute_km_per_day": 10.0,
            "transport_mix": [{"mode": "bus", "share": 1.0, "factor_kg_per_km": 0.05}],
            "grid_renewable_pct": 0.0, "grid_factor_kg_per_kwh": 0.4,
            "working_days_per_month": 20,
        }, headers=headers_master)

        res_fac = await ac.post("/api/facilities", json={
            "name": "SG Office", "country": "SG", "city": "Singapore", "employee_count": 10, "department_id": dept_id,
        }, headers=headers_admin)
        fac_id = res_fac.json()["_id"]

        # commute = 10 * 20 * 10 * 0.05 = 100 kg
        # electricity = 1000 * 0.4 = 400 kg. Total = 500 kg CO2e
        await ac.post(f"/api/facilities/{fac_id}/readings", json={
            "period": {"year": 2026, "month": 6},
            "inputs": {"electricity_kwh": 1000},
        }, headers=headers_admin)

        # Register two products and record sales
        res_p1 = await ac.post("/api/products", json={
            "name": "Product 1", "category": "widgets", "production_country": "SG", "production_city": "Singapore",
            "unit_price": {"amount": 10.0, "currency": "USD"}, "department_id": dept_id,
        }, headers=headers_admin)
        p1_id = res_p1.json()["_id"]

        res_p2 = await ac.post("/api/products", json={
            "name": "Product 2", "category": "widgets", "production_country": "SG", "production_city": "Singapore",
            "unit_price": {"amount": 20.0, "currency": "USD"}, "department_id": dept_id,
        }, headers=headers_admin)
        p2_id = res_p2.json()["_id"]

        # Log Sales
        # Product 1 sales: 100 units at 10.0 = 1000 USD
        await ac.post("/api/product-sales", json={
            "product_id": p1_id, "period": {"year": 2026, "month": 6}, "units_sold": 100,
            "unit_price": {"amount": 10.0, "currency": "USD"},
        }, headers=headers_admin)

        # Product 2 sales: 50 units at 20.0 = 1000 USD
        await ac.post("/api/product-sales", json={
            "product_id": p2_id, "period": {"year": 2026, "month": 6}, "units_sold": 50,
            "unit_price": {"amount": 20.0, "currency": "USD"},
        }, headers=headers_admin)

        # Total revenue = 2000 USD. Each gets 50% revenue share.
        # Total overhead to allocate = 500 kg. Each gets 250 kg.

        # Run overhead allocation
        res_alloc = await ac.post("/api/overhead-allocations/run", json={
            "department_id": dept_id,
            "period": {"year": 2026, "month": 6},
        }, headers=headers_admin)
        assert res_alloc.status_code == 201
        data = res_alloc.json()
        assert data["overhead_total_kg"] == 500.0
        assert data["revenue_total"]["amount"] == 2000.0
        assert len(data["lines"]) == 2
        assert data["lines"][0]["allocated_kg"] == 250.0
        assert data["lines"][1]["allocated_kg"] == 250.0


# ---------------------------------------------------------------------------
# Phase 15 Tests — Scoped Sub-Admins
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase_15_sub_admins(test_data):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_master = test_data["headers"]["master"]

        # 1. Create a scoped sub-admin: Regional (US only)
        res_grant = await ac.post("/api/admin/sub-admins", json={
            "user_id": str(test_data["emp_id"]),
            "scope": {"kind": "region", "values": ["US"]},
        }, headers=headers_master)
        assert res_grant.status_code == 201

        # JWT Token for this sub-admin
        sub_token = create_access_token(str(test_data["emp_id"]), str(test_data["org_id"]))
        headers_sub = {"Authorization": f"Bearer {sub_token}"}

        # 2. Get my scope
        res_scope = await ac.get("/api/me/scope", headers=headers_sub)
        assert res_scope.status_code == 200
        assert res_scope.json()["region"] == ["US"]

        # 3. Sub-admin edits region row in scope (should pass)
        res_cp_ok = await ac.post("/api/city-profiles", json={
            "country": "US", "city": "New York", "year": 2026, "avg_commute_km_per_day": 10.0,
            "transport_mix": [{"mode": "bus", "share": 1.0, "factor_kg_per_km": 0.05}],
            "grid_renewable_pct": 0.0, "grid_factor_kg_per_kwh": 0.4,
            "working_days_per_month": 20,
        }, headers=headers_sub)
        assert res_cp_ok.status_code == 201

        # 4. Sub-admin tries to edit out-of-scope region (DE) (should 403)
        res_cp_fail = await ac.post("/api/city-profiles", json={
            "country": "DE", "city": "Berlin", "year": 2026, "avg_commute_km_per_day": 10.0,
            "transport_mix": [{"mode": "bus", "share": 1.0, "factor_kg_per_km": 0.05}],
            "grid_renewable_pct": 0.0, "grid_factor_kg_per_kwh": 0.4,
            "working_days_per_month": 20,
        }, headers=headers_sub)
        assert res_cp_fail.status_code == 403


# ---------------------------------------------------------------------------
# Regression tests — production-hardening fixes (audit of Phases 11-15)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_role_enforcement_employee_denied(test_data):
    """A plain employee must not be able to create org-level resources or run
    org-wide allocations (C1 — missing role enforcement)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp = test_data["headers"]["emp"]

        r1 = await ac.post("/api/facilities", json={
            "name": "Rogue HQ", "country": "IN", "city": "Mumbai", "employee_count": 5,
        }, headers=emp)
        assert r1.status_code == 403

        r2 = await ac.post("/api/products", json={
            "name": "Rogue", "category": "widgets", "production_country": "IN",
            "production_city": "Pune", "unit_price": {"amount": 1.0, "currency": "USD"},
        }, headers=emp)
        assert r2.status_code == 403

        r3 = await ac.post("/api/overhead-allocations/run", json={
            "period": {"year": 2026, "month": 6},
        }, headers=emp)
        assert r3.status_code == 403


@pytest.mark.asyncio
async def test_department_archive_guard_and_move_collision(test_data):
    """PATCH status→archived cannot bypass the child/user guards (P11-1), and a
    move that collides with an existing sibling name returns 409 (P11-2)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        h = test_data["headers"]["admin"]

        root = (await ac.post("/api/departments", json={"name": "Root", "code": "R"}, headers=h)).json()["_id"]
        a = (await ac.post("/api/departments", json={"name": "A", "code": "A", "parent_id": root}, headers=h)).json()["_id"]
        b = (await ac.post("/api/departments", json={"name": "B", "code": "B", "parent_id": root}, headers=h)).json()["_id"]

        # Archiving Root via PATCH must fail — it still has active children.
        res_arch = await ac.patch(f"/api/departments/{root}", json={"status": "archived"}, headers=h)
        assert res_arch.status_code == 409

        # Two departments named "Team", one under A and one under B.
        await ac.post("/api/departments", json={"name": "Team", "code": "TA", "parent_id": a}, headers=h)
        team_b = (await ac.post("/api/departments", json={"name": "Team", "code": "TB", "parent_id": b}, headers=h)).json()["_id"]

        # Moving B's "Team" under A collides with A's existing "Team".
        res_move = await ac.patch(f"/api/departments/{team_b}", json={"parent_id": a}, headers=h)
        assert res_move.status_code == 409


@pytest.mark.asyncio
async def test_record_production_idempotent_across_link_adoption(test_data):
    """After a product adopts a partner link (source_type flips product→linked_partner),
    re-recording the same period must replace, not duplicate, the ledger row (P13-1)."""
    db = get_db()
    org_id = test_data["org_id"]
    now = utcnow()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        h = test_data["headers"]["admin"]

        # Reference row + requester product with its own carbon.
        await ac.post("/api/carbon-reference", json={
            "country": "IN", "city": "Pune", "product_category": "widgets",
            "product_name": "WP", "year": 2026, "carbon_value": 2.0, "unit": "per_unit",
        }, headers=test_data["headers"]["master"])
        prod_id = (await ac.post("/api/products", json={
            "name": "WP", "category": "widgets", "production_country": "IN",
            "production_city": "Pune", "unit_price": {"amount": 3.0, "currency": "USD"},
        }, headers=h)).json()["_id"]
        await ac.post(f"/api/products/{prod_id}/calculate-carbon", json={"year": 2026}, headers=h)

        # First production record (source_type "product").
        await ac.post(f"/api/products/{prod_id}/record-production", json={
            "period": {"year": 2026, "month": 6}, "quantity_units": 100,
        }, headers=h)

        # Partner org + partner product with calculated carbon (inserted directly).
        p_org = ObjectId()
        await db.organizations.insert_one({
            "_id": p_org, "name": "Partner", "type": "corporate", "status": "active",
            "settings": {}, "created_at": now, "updated_at": now,
        })
        p_admin = ObjectId()
        await db.users.insert_one({
            "_id": p_admin, "org_id": p_org, "email": "padmin@test.com",
            "password_hash": hash_password("x"), "full_name": "P Admin",
            "roles": [{"role": "org_admin"}], "status": "active",
            "created_at": now, "updated_at": now,
        })
        p_prod = ObjectId()
        await db.products.insert_one({
            "_id": p_prod, "org_id": p_org, "department_id": None, "name": "PP",
            "category": "widgets", "production_country": "IN", "production_city": "Pune",
            "unit_price": {"amount": 9.0, "currency": "USD"},
            "carbon": {"per_unit_kg": 5.0, "reference_id": None, "match_tier": 1,
                       "is_approximation": False, "unit": "per_unit", "calculated_at": now,
                       "source_link_id": None},
            "status": "active", "created_at": now, "updated_at": now,
        })
        p_headers = {"Authorization": f"Bearer {create_access_token(str(p_admin), str(p_org))}"}

        # Create link, partner confirms, requester adopts partner's per-unit value.
        link_id = (await ac.post("/api/product-links", json={
            "requester_product_id": prod_id, "partner_org_id": str(p_org),
            "partner_product_id": str(p_prod), "link_type": "carbon_credit",
        }, headers=h)).json()["_id"]
        confirm = await ac.patch(f"/api/product-links/{link_id}", json={"action": "confirm"}, headers=p_headers)
        assert confirm.status_code == 200
        await ac.post(f"/api/products/{prod_id}/adopt-linked-value", json={"link_id": link_id}, headers=h)

        # Re-record the SAME period — now as a linked_partner row.
        await ac.post(f"/api/products/{prod_id}/record-production", json={
            "period": {"year": 2026, "month": 6}, "quantity_units": 100,
        }, headers=h)

        # Exactly one ledger row must exist for this product+period (no double count).
        rows = await db.carbon_transactions.find({
            "product_id": ObjectId(prod_id), "period.year": 2026, "period.month": 6,
        }).to_list(10)
        assert len(rows) == 1
        assert rows[0]["amount_kg"] == pytest.approx(500.0)
        assert rows[0]["source_type"] == "linked_partner"


@pytest.mark.asyncio
async def test_product_link_same_org_rejected(test_data):
    """A link whose partner org is the requester's own org is rejected (P14-3)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        h = test_data["headers"]["admin"]
        p1 = (await ac.post("/api/products", json={
            "name": "P1", "category": "c", "production_country": "IN",
            "production_city": "Pune", "unit_price": {"amount": 1.0, "currency": "USD"},
        }, headers=h)).json()["_id"]
        p2 = (await ac.post("/api/products", json={
            "name": "P2", "category": "c", "production_country": "IN",
            "production_city": "Pune", "unit_price": {"amount": 1.0, "currency": "USD"},
        }, headers=h)).json()["_id"]

        res = await ac.post("/api/product-links", json={
            "requester_product_id": p1, "partner_org_id": str(test_data["org_id"]),
            "partner_product_id": p2, "link_type": "component",
        }, headers=h)
        assert res.status_code == 400


@pytest.mark.asyncio
async def test_sub_admin_grant_is_org_scoped(test_data):
    """A master_admin cannot grant sub-admin scope to a user in another org (P15-1)."""
    db = get_db()
    now = utcnow()
    other_org = ObjectId()
    other_user = ObjectId()
    await db.organizations.insert_one({
        "_id": other_org, "name": "Other", "type": "corporate", "status": "active",
        "settings": {}, "created_at": now, "updated_at": now,
    })
    await db.users.insert_one({
        "_id": other_user, "org_id": other_org, "email": "other@test.com",
        "password_hash": hash_password("x"), "full_name": "Other", "roles": [{"role": "employee"}],
        "status": "active", "created_at": now, "updated_at": now,
    })
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/admin/sub-admins", json={
            "user_id": str(other_user), "scope": {"kind": "region", "values": ["US"]},
        }, headers=test_data["headers"]["master"])
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_facility_create_warning_surfaced(test_data):
    """Creating a facility for a city with no profile returns the warning (P12-1)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/facilities", json={
            "name": "No-Profile Office", "country": "BR", "city": "Sao Paulo", "employee_count": 3,
        }, headers=test_data["headers"]["admin"])
        assert res.status_code == 201
        assert res.json().get("warning")
