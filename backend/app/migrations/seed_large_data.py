"""Seeding script to populate MongoDB with a rich, realistic dataset for demonstration.

It seeds:
1. City Profiles (Pune, Munich, San Francisco)
2. Departments (Corporate, HR, Manufacturing, Pune Assembly, Munich Lab, R&D)
3. Facilities (Chakan Industrial Campus Pune, Bavaria Eco Tech Munich, Global Executive SF)
4. Facility Readings (monthly readings for Jan - Jun 2026)
5. Carbon References (steel, aluminium, components)
6. Products (Structural Steel Beam, Aluminium Bracket A, Precision Casting X)
7. Product Sales (monthly sales for Q1/Q2 2026)
8. Overhead Allocations (allocations executed for Q2 2026)
9. Policies (ESG Code of Conduct, Carbon Travel Policy, Vendor Diversity Policy)
"""

import asyncio
from datetime import datetime, timezone
from bson import ObjectId

from app import db

async def seed_large_data():
    print("Connecting to MongoDB...")
    await db.connect()
    mongo_db = db.get_db()

    org_id = ObjectId("6650a2f4762c4a929baaaa01")  # Acme Corp
    now = datetime.now(timezone.utc)

    # 1. CLEAN UP PREVIOUS DEMO SEED DATA (to prevent duplicate keys / unique index conflicts)
    print("Cleaning up old demo data...")
    await mongo_db.city_profiles.delete_many({"city": {"$in": ["Pune", "Munich", "San Francisco"]}})
    await mongo_db.departments.delete_many({"org_id": org_id})
    await mongo_db.facilities.delete_many({"org_id": org_id})
    await mongo_db.facility_readings.delete_many({"org_id": org_id})
    await mongo_db.carbon_reference.delete_many({"product_category": {"$in": ["steel", "aluminium", "components"]}})
    await mongo_db.products.delete_many({"org_id": org_id})
    await mongo_db.product_sales.delete_many({"org_id": org_id})
    await mongo_db.overhead_allocations.delete_many({"org_id": org_id})
    await mongo_db.policies.delete_many({"org_id": org_id})
    await mongo_db.policy_comments.delete_many({"org_id": org_id})
    await mongo_db.compliance_issues.delete_many({"org_id": org_id})
    await mongo_db.diversity_metrics.delete_many({"org_id": org_id})
    await mongo_db.product_links.delete_many({"requester_org_id": org_id})
    await mongo_db.organizations.delete_many({"_id": {"$in": [ObjectId("6650a2f4762c4a929baaaa50"), ObjectId("6650a2f4762c4a929baaaa51")]}})
    await mongo_db.products.delete_many({"org_id": {"$in": [ObjectId("6650a2f4762c4a929baaaa50"), ObjectId("6650a2f4762c4a929baaaa51")]}})

    # Define standard ObjectIds
    dept_corp = ObjectId("6650a2f4762c4a929baaaa10")
    dept_hr = ObjectId("6650a2f4762c4a929baaaa11")
    dept_mfg = ObjectId("6650a2f4762c4a929baaaa12")
    dept_mfg_pune = ObjectId("6650a2f4762c4a929baaaa13")
    dept_mfg_munich = ObjectId("6650a2f4762c4a929baaaa14")
    dept_rnd = ObjectId("6650a2f4762c4a929baaaa15")

    fac_pune = ObjectId("6650a2f4762c4a929baaaa20")
    fac_munich = ObjectId("6650a2f4762c4a929baaaa21")
    fac_hq = ObjectId("6650a2f4762c4a929baaaa22")

    city_pune = ObjectId("6650a2f4762c4a929baaaa30")
    city_munich = ObjectId("6650a2f4762c4a929baaaa31")
    city_sf = ObjectId("6650a2f4762c4a929baaaa32")

    ref_steel = ObjectId("6650a2f4762c4a929baaaa3a")
    ref_alum = ObjectId("6650a2f4762c4a929baaaa3b")
    ref_comp = ObjectId("6650a2f4762c4a929baaaa3c")

    prod_steel = ObjectId("6650a2f4762c4a929baaaa40")
    prod_bracket = ObjectId("6650a2f4762c4a929baaaa41")
    prod_casting = ObjectId("6650a2f4762c4a929baaaa42")

    # 1. SEED CITY PROFILES
    print("Seeding City Profiles...")
    city_profiles = [
        {
            "_id": city_pune,
            "country": "IN",
            "city": "Pune",
            "year": 2026,
            "avg_commute_km_per_day": 18.0,
            "transport_mix": [
                {"mode": "two_wheeler", "share": 0.5, "factor_kg_per_km": 0.04},
                {"mode": "bus", "share": 0.3, "factor_kg_per_km": 0.08},
                {"mode": "car", "share": 0.2, "factor_kg_per_km": 0.19},
            ],
            "grid_renewable_pct": 0.28,
            "grid_factor_kg_per_kwh": 0.71,
            "electricity_tariff_per_kwh": {"amount": 0.08, "currency": "USD"},
            "working_days_per_month": 22,
            "source": "State Power Grid Corp & Municipal Survey 2026",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": city_munich,
            "country": "DE",
            "city": "Munich",
            "year": 2026,
            "avg_commute_km_per_day": 14.0,
            "transport_mix": [
                {"mode": "rail", "share": 0.6, "factor_kg_per_km": 0.03},
                {"mode": "bus", "share": 0.25, "factor_kg_per_km": 0.06},
                {"mode": "car", "share": 0.15, "factor_kg_per_km": 0.17},
            ],
            "grid_renewable_pct": 0.65,
            "grid_factor_kg_per_kwh": 0.35,
            "electricity_tariff_per_kwh": {"amount": 0.22, "currency": "USD"},
            "working_days_per_month": 20,
            "source": "Bavarian Grid & Stadtwerke München 2026",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": city_sf,
            "country": "US",
            "city": "San Francisco",
            "year": 2026,
            "avg_commute_km_per_day": 22.0,
            "transport_mix": [
                {"mode": "rail", "share": 0.4, "factor_kg_per_km": 0.04},
                {"mode": "bus", "share": 0.2, "factor_kg_per_km": 0.07},
                {"mode": "car", "share": 0.4, "factor_kg_per_km": 0.18},
            ],
            "grid_renewable_pct": 0.48,
            "grid_factor_kg_per_kwh": 0.24,
            "electricity_tariff_per_kwh": {"amount": 0.26, "currency": "USD"},
            "working_days_per_month": 21,
            "source": "PG&E Carbon Intensity Audit & BART Report 2026",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.city_profiles.insert_many(city_profiles)

    # 2. SEED DEPARTMENTS
    print("Seeding Departments...")
    departments = [
        {
            "_id": dept_corp,
            "org_id": org_id,
            "name": "Corporate & Executive",
            "code": "CORP",
            "parent_id": None,
            "ancestors": [],
            "head_user_id": None,
            "employee_count": 85,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": dept_hr,
            "org_id": org_id,
            "name": "People & Culture (HR)",
            "code": "HR",
            "parent_id": dept_corp,
            "ancestors": [dept_corp],
            "head_user_id": None,
            "employee_count": 24,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": dept_mfg,
            "org_id": org_id,
            "name": "Manufacturing & Operations",
            "code": "MFG",
            "parent_id": None,
            "ancestors": [],
            "head_user_id": None,
            "employee_count": 320,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": dept_mfg_pune,
            "org_id": org_id,
            "name": "Pune Assembly Plant",
            "code": "MFG-PUN",
            "parent_id": dept_mfg,
            "ancestors": [dept_mfg],
            "head_user_id": None,
            "employee_count": 180,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": dept_mfg_munich,
            "org_id": org_id,
            "name": "Munich Precision Lab",
            "code": "MFG-MUN",
            "parent_id": dept_mfg,
            "ancestors": [dept_mfg],
            "head_user_id": None,
            "employee_count": 140,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": dept_rnd,
            "org_id": org_id,
            "name": "Research & Innovation",
            "code": "RND",
            "parent_id": None,
            "ancestors": [],
            "head_user_id": None,
            "employee_count": 65,
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.departments.insert_many(departments)

    # 3. SEED FACILITIES
    print("Seeding Facilities...")
    fac_pune_plant = ObjectId("6650a2f4762c4a929baaaa2a")
    facilities = [
        {
            "_id": fac_pune,
            "org_id": org_id,
            "department_id": dept_mfg_pune,
            "name": "Chakan Industrial Campus Block A",
            "country": "IN",
            "city": "Pune",
            "employee_count": 180,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": fac_pune_plant,
            "org_id": org_id,
            "department_id": dept_mfg_pune,
            "name": "Pune Mfg Plant (India)",
            "country": "IN",
            "city": "Pune",
            "employee_count": 180,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": fac_munich,
            "org_id": org_id,
            "department_id": dept_mfg_munich,
            "name": "Bavaria Eco Tech Center",
            "country": "DE",
            "city": "Munich",
            "employee_count": 140,
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": fac_hq,
            "org_id": org_id,
            "department_id": dept_corp,
            "name": "Global Executive Tower",
            "country": "US",
            "city": "San Francisco",
            "employee_count": 85,
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.facilities.insert_many(facilities)

    # 4. SEED FACILITY READINGS (Jan to Jun 2026)
    print("Seeding Facility Readings...")
    readings = []
    
    # Pune Campus
    for m in range(1, 7):
        elec = 40000 + m * 1000
        commute_kg = 180 * 22 * 18 * (0.5 * 0.04 + 0.3 * 0.08 + 0.2 * 0.19)
        elec_kg = (elec * (1 - 0.28)) * 0.71
        readings.append({
            "org_id": org_id,
            "facility_id": fac_pune,
            "department_id": dept_mfg_pune,
            "period": {"year": 2026, "month": m},
            "inputs": {"electricity_kwh": elec, "employee_count_override": 180},
            "computed": {
                "commute_kg": commute_kg,
                "electricity_kg": elec_kg,
                "total_kg": commute_kg + elec_kg,
                "city_profile_id": city_pune,
                "is_approximation": False,
                "assumptions": {
                    "avg_commute_km_per_day": 18.0,
                    "transport_mix": [
                        {"mode": "two_wheeler", "share": 0.5, "factor_kg_per_km": 0.04},
                        {"mode": "bus", "share": 0.3, "factor_kg_per_km": 0.08},
                        {"mode": "car", "share": 0.2, "factor_kg_per_km": 0.19},
                    ],
                    "grid_renewable_pct": 0.28,
                    "grid_factor_kg_per_kwh": 0.71,
                    "working_days_per_month": 22,
                    "employees_used": 180
                }
            },
            "created_by": "Dr. Sarah Jenkins",
            "created_at": now
        })

    # Pune Mfg Plant (India)
    for m in range(1, 7):
        elec = 42000 + m * 1200
        commute_kg = 180 * 22 * 18 * (0.5 * 0.04 + 0.3 * 0.08 + 0.2 * 0.19)
        elec_kg = (elec * (1 - 0.28)) * 0.71
        readings.append({
            "org_id": org_id,
            "facility_id": fac_pune_plant,
            "department_id": dept_mfg_pune,
            "period": {"year": 2026, "month": m},
            "inputs": {"electricity_kwh": elec, "employee_count_override": 180},
            "computed": {
                "commute_kg": commute_kg,
                "electricity_kg": elec_kg,
                "total_kg": commute_kg + elec_kg,
                "city_profile_id": city_pune,
                "is_approximation": False,
                "assumptions": {
                    "avg_commute_km_per_day": 18.0,
                    "transport_mix": [
                        {"mode": "two_wheeler", "share": 0.5, "factor_kg_per_km": 0.04},
                        {"mode": "bus", "share": 0.3, "factor_kg_per_km": 0.08},
                        {"mode": "car", "share": 0.2, "factor_kg_per_km": 0.19},
                    ],
                    "grid_renewable_pct": 0.28,
                    "grid_factor_kg_per_kwh": 0.71,
                    "working_days_per_month": 22,
                    "employees_used": 180
                }
            },
            "created_by": "Dr. Sarah Jenkins",
            "created_at": now
        })

    for m in range(1, 7):
        elec = 25000 + m * 500
        commute_kg = 140 * 20 * 14 * (0.6 * 0.03 + 0.25 * 0.06 + 0.15 * 0.17)
        elec_kg = (elec * (1 - 0.65)) * 0.35
        readings.append({
            "org_id": org_id,
            "facility_id": fac_munich,
            "department_id": dept_mfg_munich,
            "period": {"year": 2026, "month": m},
            "inputs": {"electricity_kwh": elec, "employee_count_override": 140},
            "computed": {
                "commute_kg": commute_kg,
                "electricity_kg": elec_kg,
                "total_kg": commute_kg + elec_kg,
                "city_profile_id": city_munich,
                "is_approximation": False,
                "assumptions": {
                    "avg_commute_km_per_day": 14.0,
                    "transport_mix": [
                        {"mode": "rail", "share": 0.6, "factor_kg_per_km": 0.03},
                        {"mode": "bus", "share": 0.25, "factor_kg_per_km": 0.06},
                        {"mode": "car", "share": 0.15, "factor_kg_per_km": 0.17},
                    ],
                    "grid_renewable_pct": 0.65,
                    "grid_factor_kg_per_kwh": 0.35,
                    "working_days_per_month": 20,
                    "employees_used": 140
                }
            },
            "created_by": "Munich Operations Lead",
            "created_at": now
        })

    for m in range(1, 7):
        elec = 15000 + m * 300
        commute_kg = 85 * 21 * 22 * (0.4 * 0.04 + 0.2 * 0.07 + 0.4 * 0.18)
        elec_kg = (elec * (1 - 0.48)) * 0.24
        readings.append({
            "org_id": org_id,
            "facility_id": fac_hq,
            "department_id": dept_corp,
            "period": {"year": 2026, "month": m},
            "inputs": {"electricity_kwh": elec, "employee_count_override": 85},
            "computed": {
                "commute_kg": commute_kg,
                "electricity_kg": elec_kg,
                "total_kg": commute_kg + elec_kg,
                "city_profile_id": city_sf,
                "is_approximation": False,
                "assumptions": {
                    "avg_commute_km_per_day": 22.0,
                    "transport_mix": [
                        {"mode": "rail", "share": 0.4, "factor_kg_per_km": 0.04},
                        {"mode": "bus", "share": 0.2, "factor_kg_per_km": 0.07},
                        {"mode": "car", "share": 0.4, "factor_kg_per_km": 0.18},
                    ],
                    "grid_renewable_pct": 0.48,
                    "grid_factor_kg_per_kwh": 0.24,
                    "working_days_per_month": 21,
                    "employees_used": 85
                }
            },
            "created_by": "Corporate Facility Manager",
            "created_at": now
        })
    await mongo_db.facility_readings.insert_many(readings)

    # 5. SEED CARBON REFERENCES
    print("Seeding Carbon References...")
    carbon_refs = [
        {
            "_id": ref_steel,
            "country": "IN",
            "city": "Pune",
            "product_category": "steel",
            "product_name": "Structural Steel Beam",
            "description": "Premium local steel alloy with low scrap fraction, audited in Pune",
            "year": 2026,
            "carbon_value": 1.75,
            "unit": "per_kg",
            "source": "Indian Green Fab Council LCA Audit 2026",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ref_alum,
            "country": "DE",
            "city": "Munich",
            "product_category": "aluminium",
            "product_name": "Aluminium Bracket A",
            "description": "Recycled casting aluminium parts fabricated with local wind power",
            "year": 2026,
            "carbon_value": 3.20,
            "unit": "per_unit",
            "source": "Munich Recycled Metal Association 2026",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ref_comp,
            "country": None,
            "city": None,
            "product_category": "components",
            "product_name": "Precision Casting X",
            "description": "Standard structural casting component global reference value",
            "year": 2026,
            "carbon_value": 4.80,
            "unit": "per_unit",
            "source": "Global Mechanical Component Index 2026",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.carbon_reference.insert_many(carbon_refs)

    # 6. SEED PRODUCTS
    print("Seeding Products...")
    products = [
        {
            "_id": prod_steel,
            "org_id": org_id,
            "department_id": dept_mfg_pune,
            "name": "Structural Steel Beam",
            "category": "steel",
            "description": "Standard load-bearing structural steel beams for eco-construction.",
            "production_country": "IN",
            "production_city": "Pune",
            "unit_price": {"amount": 4.50, "currency": "USD"},
            "carbon": {
                "per_unit_kg": 1.75,
                "reference_id": ref_steel,
                "match_tier": 1,
                "is_approximation": False,
                "unit": "per_kg",
                "calculated_at": now
            },
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": prod_bracket,
            "org_id": org_id,
            "department_id": dept_mfg_munich,
            "name": "Aluminium Bracket A",
            "category": "aluminium",
            "description": "Lightweight chassis brackets made from highly recyclable grades.",
            "production_country": "DE",
            "production_city": "Munich",
            "unit_price": {"amount": 12.00, "currency": "USD"},
            "carbon": {
                "per_unit_kg": 3.20,
                "reference_id": ref_alum,
                "match_tier": 1,
                "is_approximation": False,
                "unit": "per_unit",
                "calculated_at": now
            },
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": prod_casting,
            "org_id": org_id,
            "department_id": dept_rnd,
            "name": "Precision Casting X",
            "category": "components",
            "description": "High-tolerance precision cast components for experimental assemblies.",
            "production_country": "US",
            "production_city": "San Francisco",
            "unit_price": {"amount": 85.00, "currency": "USD"},
            "carbon": {
                "per_unit_kg": 4.80,
                "reference_id": ref_comp,
                "match_tier": 2,
                "is_approximation": True,
                "unit": "per_unit",
                "calculated_at": now
            },
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.products.insert_many(products)

    # 7. SEED PRODUCT SALES & TRANSACTIONS
    print("Seeding Product Sales & Ledger Transactions...")
    sales = []
    transactions = []
    
    for m in range(1, 7):
        steel_units = 10000 + m * 500
        steel_rev = steel_units * 4.50
        sales.append({
            "org_id": org_id,
            "product_id": prod_steel,
            "period": {"year": 2026, "month": m},
            "units_sold": steel_units,
            "unit_price": {"amount": 4.50, "currency": "USD"},
            "revenue_usd": steel_rev,
            "created_at": now,
            "updated_at": now
        })
        transactions.append({
            "org_id": org_id,
            "product_id": prod_steel,
            "period": {"year": 2026, "month": m},
            "quantity_units": steel_units,
            "amount_kg": steel_units * 10 * 1.75,
            "source_type": "product",
            "source_link_id": None,
            "created_at": now,
            "updated_at": now
        })

        bracket_units = 2500 + m * 200
        bracket_rev = bracket_units * 12.00
        sales.append({
            "org_id": org_id,
            "product_id": prod_bracket,
            "period": {"year": 2026, "month": m},
            "units_sold": bracket_units,
            "unit_price": {"amount": 12.00, "currency": "USD"},
            "revenue_usd": bracket_rev,
            "created_at": now,
            "updated_at": now
        })
        transactions.append({
            "org_id": org_id,
            "product_id": prod_bracket,
            "period": {"year": 2026, "month": m},
            "quantity_units": bracket_units,
            "amount_kg": bracket_units * 3.20,
            "source_type": "product",
            "source_link_id": None,
            "created_at": now,
            "updated_at": now
        })

        casting_units = 500 + m * 50
        casting_rev = casting_units * 85.00
        sales.append({
            "org_id": org_id,
            "product_id": prod_casting,
            "period": {"year": 2026, "month": m},
            "units_sold": casting_units,
            "unit_price": {"amount": 85.00, "currency": "USD"},
            "revenue_usd": casting_rev,
            "created_at": now,
            "updated_at": now
        })
        transactions.append({
            "org_id": org_id,
            "product_id": prod_casting,
            "period": {"year": 2026, "month": m},
            "quantity_units": casting_units,
            "amount_kg": casting_units * 4.80,
            "source_type": "product",
            "source_link_id": None,
            "created_at": now,
            "updated_at": now
        })

    await mongo_db.product_sales.insert_many(sales)
    await mongo_db.carbon_transactions.insert_many(transactions)

    # 8. SEED OVERHEAD ALLOCATIONS
    print("Seeding Overhead Allocations...")
    allocation_doc = {
        "org_id": org_id,
        "department_id": dept_mfg_munich,
        "period": {"year": 2026, "month": 6},
        "overhead_total_kg": 15000.0,
        "revenue_total": {"amount": 32400.0, "currency": "USD"},
        "lines": [
            {
                "product_id": prod_bracket,
                "revenue_usd": 32400.0,
                "revenue_share_pct": 100.0,
                "allocated_kg": 15000.0
            }
        ],
        "created_at": now
    }
    await mongo_db.overhead_allocations.insert_one(allocation_doc)

    # 9. SEED POLICIES
    print("Seeding Policies...")
    policies = [
        {
            "org_id": org_id,
            "title": "Corporate Climate Action Code of Conduct",
            "category": "Environmental",
            "summary": "Mandatory standard operating guidelines to reach Net Zero emissions across all regional facilities by Q4 2028.",
            "content": "This policy outlines the official corporate instructions for minimizing facility electricity waste, managing worker commute offsets, and enforcing green criteria in all equipment procurement. All facility managers must file monthly carbon logs. Failure to submit logs within 5 business days after month-end triggers compliance escalations.",
            "status": "active",
            "version": "1.2",
            "created_by": ObjectId("6650a2f4762c4a929baaaa01"),
            "created_at": now,
            "updated_at": now
        },
        {
            "org_id": org_id,
            "title": "Scope 3 Employee Business Travel Policy",
            "category": "Scope 3 Carbon",
            "summary": "Establishes carbon limits on air travel and prioritizes remote/rail travel options.",
            "content": "To reduce our Scope 3 indirect transport emissions, all employee business trips over 300km must be audited. Flights are only permitted under critical commercial circumstances. Rail travel is mandatory for short-haul travel under 4 hours. Every flight booking is loaded with a standard carbon offset fee charged to the booking department.",
            "status": "active",
            "version": "2.0",
            "created_by": ObjectId("6650a2f4762c4a929baaaa01"),
            "created_at": now,
            "updated_at": now
        },
        {
            "org_id": org_id,
            "title": "Vendor & Supply Chain ESG Compliance Matrix",
            "category": "Governance",
            "summary": "Establishes human rights, labor equality, and anti-bribery criteria for tier-1 supply vendors.",
            "content": "Acme Corp is committed to maintaining a diverse, clean, and ethical supply chain. All vendor contracts exceeding $50k annually must comply with our Environmental, Social, and Governance (ESG) guidelines. Under no circumstances will we partner with suppliers violating local labor laws, child protection acts, or diversity goals.",
            "status": "active",
            "version": "1.0",
            "created_by": ObjectId("6650a2f4762c4a929baaaa01"),
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.policies.insert_many(policies)

    # 10. SEED COMPLIANCE ISSUES
    print("Seeding Audits & Compliance Issues...")
    compliance_issues = [
        {
            "org_id": org_id,
            "title": "Missing Commute Telemetry - SF HQ",
            "description": "San Francisco office hasn't uploaded commuter transport share distributions for Q1 2026.",
            "severity": "medium",
            "status": "open",
            "department_id": dept_corp,
            "created_at": now,
            "updated_at": now
        },
        {
            "org_id": org_id,
            "title": "Unapproved Air Travel Booking - Logistics Team",
            "description": "Logistics department booked a business flight from Pune to Delhi without the required carbon offset pre-clearance.",
            "severity": "low",
            "status": "resolved",
            "resolution_note": "Travel approved retroactively. Carbon offset charge of 120 kg offset applied to Logistics Q2 ledger.",
            "department_id": dept_mfg_pune,
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.compliance_issues.insert_many(compliance_issues)

    # 11. SEED DIVERSITY METRICS
    print("Seeding Diversity Metrics...")
    diversity_metrics = [
        {
            "org_id": org_id,
            "department_id": dept_corp,
            "period": {"year": 2026, "month": 6},
            "dimension": "gender",
            "breakdown": {"Female": 46, "Male": 37, "Other": 2}
        },
        {
            "org_id": org_id,
            "department_id": dept_mfg,
            "period": {"year": 2026, "month": 6},
            "dimension": "gender",
            "breakdown": {"Female": 112, "Male": 204, "Other": 4}
        },
        {
            "org_id": org_id,
            "department_id": dept_corp,
            "period": {"year": 2026, "month": 6},
            "dimension": "age",
            "breakdown": {"<30 Years": 28, "30-45 Years": 44, "46-60 Years": 13}
        }
    ]
    await mongo_db.diversity_metrics.insert_many(diversity_metrics)

    # 12. SEED PARTNER ORGANISATIONS
    print("Seeding Partner Organisations...")
    partner_org_1 = ObjectId("6650a2f4762c4a929baaaa50")
    partner_org_2 = ObjectId("6650a2f4762c4a929baaaa51")
    
    partner_orgs = [
        {
            "_id": partner_org_1,
            "name": "Global Smelting Ltd",
            "type": "corporate",
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": partner_org_2,
            "name": "SemiTech Alloys",
            "type": "corporate",
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.organizations.insert_many(partner_orgs)

    # 13. SEED PARTNER PRODUCTS
    print("Seeding Partner Products...")
    partner_prod_pig_iron = ObjectId("6650a2f4762c4a929baaaa60")
    partner_prod_silicon = ObjectId("6650a2f4762c4a929baaaa61")
    
    partner_products = [
        {
            "_id": partner_prod_pig_iron,
            "org_id": partner_org_1,
            "department_id": None,
            "name": "Pig Iron Ingots Grade A",
            "category": "steel",
            "description": "Unfinished pig iron raw feedstocks for high-grade steel synthesis.",
            "production_country": "IN",
            "production_city": "Mumbai",
            "unit_price": {"amount": 1.20, "currency": "USD"},
            "carbon": {
                "per_unit_kg": 62.4,
                "reference_id": None,
                "match_tier": 1,
                "is_approximation": False,
                "unit": "per_kg",
                "calculated_at": now
            },
            "status": "active",
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": partner_prod_silicon,
            "org_id": partner_org_2,
            "department_id": None,
            "name": "Silicon Wafer Substrate 300mm",
            "category": "components",
            "description": "Ultra-pure semiconductor wafer substrates for silicon processing.",
            "production_country": "DE",
            "production_city": "Munich",
            "unit_price": {"amount": 42.00, "currency": "USD"},
            "carbon": {
                "per_unit_kg": 8.40,
                "reference_id": None,
                "match_tier": 1,
                "is_approximation": False,
                "unit": "per_unit",
                "calculated_at": now
            },
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.products.insert_many(partner_products)

    # 14. SEED PRODUCT LINKS
    print("Seeding Product Links...")
    product_links = [
        {
            "requester_org_id": org_id,
            "requester_product_id": prod_steel,
            "partner_org_id": partner_org_1,
            "partner_product_id": partner_prod_pig_iron,
            "link_type": "component",
            "status": "confirmed",
            "shared": {
                "mode": "exact",
                "value_kg": 62.4,
                "snapshot_at": now
            },
            "requested_by": ObjectId("6a537999a3fc1c02c7da342d"),
            "responded_by": ObjectId("6a537999a3fc1c02c7da342e"),
            "responded_at": now,
            "created_at": now,
            "updated_at": now
        },
        {
            "requester_org_id": org_id,
            "requester_product_id": prod_casting,
            "partner_org_id": partner_org_2,
            "partner_product_id": partner_prod_silicon,
            "link_type": "component",
            "status": "pending",
            "shared": None,
            "requested_by": ObjectId("6a537999a3fc1c02c7da342d"),
            "responded_by": None,
            "responded_at": None,
            "created_at": now,
            "updated_at": now
        }
    ]
    await mongo_db.product_links.insert_many(product_links)

    print("Data seeding completed successfully!")
    await db.close()

if __name__ == "__main__":
    asyncio.run(seed_large_data())
