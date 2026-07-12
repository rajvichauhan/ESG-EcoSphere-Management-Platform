"""Database index management.

Called once during application startup to ensure every collection has the
indexes required for correctness (unique constraints) and performance.
Motor's ``create_index`` is idempotent — it returns the existing index name
if the index already exists.
"""

from __future__ import annotations

import pymongo
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_db


async def ensure_indexes() -> None:
    """Create all required indexes across all collections."""
    db: AsyncIOMotorDatabase = get_db()

    # ------------------------------------------------------------------
    # Identity & Tenancy  (Phases 1–2)
    # ------------------------------------------------------------------
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("org_id", 1), ("department_id", 1)])
    await db.users.create_index([("org_id", 1), ("xp_total", -1)])

    await db.sessions.create_index("token_hash", unique=True)
    await db.sessions.create_index("user_id")
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)

    await db.otps.create_index([("email", 1), ("purpose", 1)])
    await db.otps.create_index("expires_at", expireAfterSeconds=0)

    # ------------------------------------------------------------------
    # Master Data  (Phases 3–4)
    # ------------------------------------------------------------------

    # departments — Phase 11 adds ancestors index + unique sibling constraint
    await db.departments.create_index(
        [("org_id", 1), ("parent_id", 1), ("name", 1)],
        unique=True,
    )
    await db.departments.create_index([("org_id", 1), ("ancestors", 1)])

    await db.categories.create_index(
        [("org_id", 1), ("type", 1), ("name", 1)], unique=True,
    )

    await db.emission_factors.create_index(
        [("org_id", 1), ("activity", 1), ("item", 1), ("year", -1)],
    )

    # Policies
    await db.policies.create_index(
        [("org_id", 1), ("policy_group_id", 1), ("version", -1)],
    )

    # Policy comments
    await db.policy_comments.create_index(
        [("policy_id", 1), ("created_at", -1)],
    )

    # ------------------------------------------------------------------
    # Transactional Data  (Phases 5–10)
    # ------------------------------------------------------------------
    await db.operational_records.create_index(
        [("org_id", 1), ("op_type", 1), ("occurred_at", -1)],
    )

    await db.carbon_transactions.create_index(
        [("org_id", 1), ("period.year", 1), ("period.month", 1)],
    )
    await db.carbon_transactions.create_index(
        [("org_id", 1), ("department_id", 1), ("period.year", 1)],
    )
    await db.carbon_transactions.create_index(
        [("source_ref.collection", 1), ("source_ref.id", 1)],
    )

    # CSR
    await db.csr_participations.create_index(
        [("activity_id", 1), ("user_id", 1)], unique=True,
    )
    await db.csr_participations.create_index([("org_id", 1), ("status", 1)])

    # Diversity
    await db.diversity_metrics.create_index(
        [("org_id", 1), ("department_id", 1), ("dimension", 1),
         ("period.year", 1), ("period.month", 1)],
        unique=True,
    )

    # Training
    await db.training_completions.create_index(
        [("training_id", 1), ("user_id", 1)], unique=True,
    )

    # Policy acknowledgements
    await db.policy_acknowledgements.create_index(
        [("policy_id", 1), ("user_id", 1)], unique=True,
    )

    # Compliance
    await db.compliance_issues.create_index(
        [("org_id", 1), ("status", 1), ("due_date", 1)],
    )

    # ------------------------------------------------------------------
    # Gamification  (Phases 7–9)
    # ------------------------------------------------------------------
    await db.challenges.create_index([("org_id", 1), ("status", 1)])

    await db.challenge_participations.create_index(
        [("challenge_id", 1), ("user_id", 1)], unique=True,
    )
    await db.challenge_participations.create_index(
        "certificate.share_token", unique=True, sparse=True,
    )

    await db.xp_ledger.create_index([("user_id", 1), ("created_at", -1)])
    await db.xp_ledger.create_index(
        [("org_id", 1), ("department_id", 1), ("created_at", -1)],
    )

    await db.user_badges.create_index(
        [("user_id", 1), ("badge_id", 1)], unique=True,
    )

    # Department scores
    await db.department_scores.create_index(
        [("org_id", 1), ("department_id", 1),
         ("period.year", 1), ("period.month", 1)],
        unique=True,
    )

    # Notifications
    await db.notifications.create_index(
        [("user_id", 1), ("read_at", 1), ("created_at", -1)],
    )

    # ------------------------------------------------------------------
    # Phase 12 — Facility & Office Carbon
    # ------------------------------------------------------------------
    await db.city_profiles.create_index(
        [("country", 1), ("city", 1), ("year", 1)], unique=True,
    )

    await db.facilities.create_index([("org_id", 1), ("department_id", 1)])

    await db.facility_readings.create_index(
        [("facility_id", 1), ("period.year", 1), ("period.month", 1)],
        unique=True,
    )

    # ------------------------------------------------------------------
    # Phase 13 — Product & Manufacturing Carbon
    # ------------------------------------------------------------------
    await db.carbon_reference.create_index(
        [("country", 1), ("city", 1), ("product_category", 1),
         ("product_name", 1), ("year", 1)],
        unique=True,
    )
    await db.reference_value_history.create_index(
        [("reference_id", 1), ("changed_at", -1)],
    )

    await db.products.create_index([("org_id", 1), ("status", 1)])
    await db.products.create_index([("org_id", 1), ("category", 1)])

    # ------------------------------------------------------------------
    # Phase 14 — Allocation & Cross-Company Linking
    # ------------------------------------------------------------------
    await db.product_sales.create_index(
        [("org_id", 1), ("product_id", 1),
         ("period.year", 1), ("period.month", 1)],
        unique=True,
    )

    await db.overhead_allocations.create_index(
        [("org_id", 1), ("department_id", 1),
         ("period.year", 1), ("period.month", 1), ("status", 1)],
    )

    await db.product_links.create_index(
        [("requester_product_id", 1), ("partner_product_id", 1)],
        unique=True,
    )
