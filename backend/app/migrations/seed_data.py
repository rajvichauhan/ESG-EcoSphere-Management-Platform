"""Seeding script for database initialization (Phases 11-15).

Creates a mock tenant organization (Acme Corp), a master admin, an org admin,
standard city profiles, and global carbon reference factors.
"""

from __future__ import annotations

import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings
from app.auth import hash_password
from app.models.common import utcnow


async def seed_database(db) -> None:
    now = utcnow()

    # 1. Organizations
    acme_org_id = ObjectId("6650a2f4762c4a929baaaa01")
    existing_org = await db.organizations.find_one({"_id": acme_org_id})
    if not existing_org:
        org_doc = {
            "_id": acme_org_id,
            "name": "Acme Corporation",
            "type": "corporate",
            "status": "active",
            "settings": {
                "esg_weights": {"e": 40, "s": 30, "g": 30},
                "auto_emission_calculation": True,
                "require_csr_evidence": True,
                "badge_auto_award": True,
                "email_compliance_alerts": True,
            },
            "created_at": now,
            "updated_at": now,
        }
        await db.organizations.insert_one(org_doc)
        print("Seeded organisation: Acme Corporation")

    # 2. Users
    master_admin_id = ObjectId("6650a2f4762c4a929baaaa02")
    org_admin_id = ObjectId("6650a2f4762c4a929baaaa03")

    existing_master = await db.users.find_one({"_id": master_admin_id})
    if not existing_master:
        master_doc = {
            "_id": master_admin_id,
            "org_id": acme_org_id,
            "email": "master@acme.com",
            "password_hash": hash_password("master123"),
            "full_name": "Master Admin",
            "roles": [{"role": "master_admin"}],
            "status": "active",
            "xp_total": 500,
            "points_balance": 200,
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(master_doc)
        print("Seeded user: master@acme.com / master123")

    existing_admin = await db.users.find_one({"_id": org_admin_id})
    if not existing_admin:
        admin_doc = {
            "_id": org_admin_id,
            "org_id": acme_org_id,
            "email": "admin@acme.com",
            "password_hash": hash_password("admin123"),
            "full_name": "Acme Admin",
            "roles": [{"role": "org_admin"}],
            "status": "active",
            "xp_total": 0,
            "points_balance": 0,
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(admin_doc)
        print("Seeded user: admin@acme.com / admin123")

    # 3. City Profiles (GLOBAL)
    cities = [
        {
            "country": "IN",
            "city": "Mumbai",
            "year": 2026,
            "avg_commute_km_per_day": 24.0,
            "transport_mix": [
                {"mode": "rail", "share": 0.60, "factor_kg_per_km": 0.012},
                {"mode": "car", "share": 0.15, "factor_kg_per_km": 0.160},
                {"mode": "bus", "share": 0.15, "factor_kg_per_km": 0.035},
                {"mode": "two_wheeler", "share": 0.10, "factor_kg_per_km": 0.045},
            ],
            "grid_renewable_pct": 0.22,
            "grid_factor_kg_per_kwh": 0.82,
            "electricity_tariff_per_kwh": {"amount": 0.09, "currency": "USD"},
            "working_days_per_month": 22,
            "source": "Local Municipality Transit Audit 2026",
        },
        {
            "country": "IN",
            "city": "Pune",
            "year": 2026,
            "avg_commute_km_per_day": 18.0,
            "transport_mix": [
                {"mode": "car", "share": 0.20, "factor_kg_per_km": 0.170},
                {"mode": "bus", "share": 0.25, "factor_kg_per_km": 0.050},
                {"mode": "two_wheeler", "share": 0.45, "factor_kg_per_km": 0.040},
                {"mode": "walk", "share": 0.10, "factor_kg_per_km": 0.000},
            ],
            "grid_renewable_pct": 0.32,
            "grid_factor_kg_per_kwh": 0.71,
            "electricity_tariff_per_kwh": {"amount": 0.08, "currency": "USD"},
            "working_days_per_month": 22,
            "source": "State Power Grid Corp 2026",
        },
        {
            "country": "SG",
            "city": "Singapore",
            "year": 2026,
            "avg_commute_km_per_day": 15.0,
            "transport_mix": [
                {"mode": "rail", "share": 0.50, "factor_kg_per_km": 0.010},
                {"mode": "bus", "share": 0.35, "factor_kg_per_km": 0.025},
                {"mode": "car", "share": 0.15, "factor_kg_per_km": 0.140},
            ],
            "grid_renewable_pct": 0.05,
            "grid_factor_kg_per_kwh": 0.40,
            "electricity_tariff_per_kwh": {"amount": 0.25, "currency": "USD"},
            "working_days_per_month": 21,
            "source": "EMA Grid Statistics 2026",
        },
    ]

    for city in cities:
        existing = await db.city_profiles.find_one({
            "country": city["country"],
            "city": city["city"],
            "year": city["year"],
        })
        if not existing:
            city_doc = {
                **city,
                "updated_by": master_admin_id,
                "created_at": now,
                "updated_at": now,
            }
            await db.city_profiles.insert_one(city_doc)
            print(f"Seeded city profile: {city['city']}, {city['country']}")

    # 4. Carbon References (GLOBAL)
    references = [
        {
            "country": "IN",
            "city": "Pune",
            "product_category": "steel",
            "product_name": "structural_beam",
            "description": "Standard carbon intensity of steel beams fabricated in Pune",
            "year": 2026,
            "carbon_value": 1.85,
            "unit": "per_kg",
            "source": "Indian Green Fab Council 2026",
        },
        {
            "country": "IN",
            "city": None,
            "product_category": "steel",
            "product_name": "structural_beam",
            "description": "National average for structural steel beam",
            "year": 2026,
            "carbon_value": 2.10,
            "unit": "per_kg",
            "source": "National Steel Authority 2026",
        },
        {
            "country": "IN",
            "city": None,
            "product_category": "steel",
            "product_name": None,
            "description": "General average for all steel categories in India",
            "year": 2026,
            "carbon_value": 2.45,
            "unit": "per_kg",
            "source": "General Metallurgy Index 2026",
        },
        {
            "country": "IN",
            "city": "Pune",
            "product_category": "aluminium_part",
            "product_name": "Aluminium Bracket A",
            "description": "Specific bracket model manufactured in Pune plant",
            "year": 2026,
            "carbon_value": 12.4,
            "unit": "per_unit",
            "source": "Custom Product Carbon Audit 2026",
        },
    ]

    for ref in references:
        existing = await db.carbon_reference.find_one({
            "country": ref["country"],
            "city": ref["city"],
            "product_category": ref["product_category"],
            "product_name": ref["product_name"],
            "year": ref["year"],
        })
        if not existing:
            ref_doc = {
                **ref,
                "updated_by": master_admin_id,
                "created_at": now,
                "updated_at": now,
            }
            await db.carbon_reference.insert_one(ref_doc)
            print(f"Seeded carbon reference: {ref['product_category']} / {ref['product_name']} in {ref['country']}")


async def main():
    settings = get_settings()
    print(f"Connecting to {settings.mongodb_uri}...")
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    await seed_database(db)
    print("Database seeding completed.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
