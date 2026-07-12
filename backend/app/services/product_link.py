"""Service layer for cross-company product links and supply-chain carbon adoption (Phase 14)."""

from __future__ import annotations

from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import has_role, require_manage_permission
from app.models.common import utcnow
from app.services.product import get_product


def _require_privileged(user: dict) -> None:
    """Cross-company links aren't tied to a single department, so acting on one
    requires an elevated role (admin or dept_head) rather than a subtree check."""
    if not has_role(user, "master_admin", "org_admin", "dept_head"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Requires an org_admin, master_admin, or dept_head role",
        )


async def create_link(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    org_id = user["org_id"]
    req_prod_id = ObjectId(str(data.requester_product_id))
    partner_org_id = ObjectId(str(data.partner_org_id))
    partner_prod_id = ObjectId(str(data.partner_product_id))

    # A link must be cross-company; self-linking would let one org create and
    # then "confirm" its own link, defeating the confirmation step.
    if partner_org_id == org_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "A product link must reference a different organisation",
        )

    # Validate requester product exists in caller's org
    req_prod = await get_product(db, org_id, str(req_prod_id))
    await require_manage_permission(user, req_prod.get("department_id"))

    # Validate partner product exists in partner org
    partner_prod = await db.products.find_one({
        "_id": partner_prod_id,
        "org_id": partner_org_id,
    })
    if partner_prod is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Partner product not found in the specified partner organisation",
        )

    # Unique check
    dup = await db.product_links.find_one({
        "requester_product_id": req_prod_id,
        "partner_product_id": partner_prod_id,
    })
    if dup:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "A product link request for this pair already exists",
        )

    now = utcnow()
    doc = {
        "requester_org_id": org_id,
        "requester_product_id": req_prod_id,
        "partner_org_id": partner_org_id,
        "partner_product_id": partner_prod_id,
        "link_type": data.link_type,
        "status": "pending",
        "shared": None,
        "requested_by": user["_id"],
        "responded_by": None,
        "responded_at": None,
        "created_at": now,
        "updated_at": now,
    }

    res = await db.product_links.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


async def list_links(
    db: AsyncIOMotorDatabase, user: dict, direction: Optional[str] = None
) -> list[dict]:
    org_id = user["org_id"]
    query = {}

    if direction == "outgoing":
        query["requester_org_id"] = org_id
    elif direction == "incoming":
        query["partner_org_id"] = org_id
    else:
        # Both directions
        query["$or"] = [
            {"requester_org_id": org_id},
            {"partner_org_id": org_id},
        ]

    return await db.product_links.find(query).sort("created_at", -1).to_list(1000)


async def respond_to_link(
    db: AsyncIOMotorDatabase, user: dict, link_id_str: str, action: str
) -> dict:
    org_id = user["org_id"]
    link_id = ObjectId(link_id_str)

    link = await db.product_links.find_one({"_id": link_id})
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product link request not found")

    # Responding to a cross-company link requires an elevated role, not merely
    # membership in the acting organisation.
    _require_privileged(user)

    now = utcnow()

    if action in ("confirm", "reject"):
        # Must be partner org
        if link["partner_org_id"] != org_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Only the partner organisation can confirm or reject a link request",
            )
        if link["status"] != "pending":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Cannot {action} link that is currently in '{link['status']}' state",
            )

        if action == "confirm":
            partner_prod = await db.products.find_one({"_id": link["partner_product_id"]})
            if not partner_prod or not partner_prod.get("carbon"):
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "Cannot confirm link: partner product has no calculated carbon values",
                )

            carbon_val = partner_prod["carbon"]["per_unit_kg"]
            updates = {
                "status": "confirmed",
                "shared": {
                    "mode": "partner_per_unit_carbon",
                    "value_kg": carbon_val,
                    "snapshot_at": now,
                },
                "responded_by": user["_id"],
                "responded_at": now,
                "updated_at": now,
            }
        else:
            # reject
            updates = {
                "status": "rejected",
                "responded_by": user["_id"],
                "responded_at": now,
                "updated_at": now,
            }

        await db.product_links.update_one({"_id": link_id}, {"$set": updates})

    elif action == "revoke":
        # Either side can revoke
        if link["requester_org_id"] != org_id and link["partner_org_id"] != org_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Only involved organisations can revoke a confirmed link",
            )

        # Clear adopted carbon references in products that used this link
        await db.products.update_many(
            {"org_id": link["requester_org_id"], "carbon.source_link_id": link_id},
            {"$set": {"carbon": None, "updated_at": now}},  # force re-calc
        )

        updates = {
            "status": "revoked",
            "updated_at": now,
        }
        await db.product_links.update_one({"_id": link_id}, {"$set": updates})

    return await db.product_links.find_one({"_id": link_id})


async def adopt_linked_value(
    db: AsyncIOMotorDatabase, user: dict, product_id_str: str, link_id_str: str
) -> dict:
    org_id = user["org_id"]
    product_id = ObjectId(product_id_str)
    link_id = ObjectId(link_id_str)

    prod = await get_product(db, org_id, product_id_str)
    await require_manage_permission(user, prod.get("department_id"))

    link = await db.product_links.find_one({"_id": link_id})
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product link not found")

    if link["status"] != "confirmed":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Cannot adopt value from a link that is not confirmed",
        )

    if link["requester_product_id"] != product_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "This link does not belong to the requested product",
        )

    shared = link.get("shared")
    if not shared or shared.get("value_kg") is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Link has no snapshot carbon values to adopt",
        )

    now = utcnow()
    carbon_data = {
        "per_unit_kg": shared["value_kg"],
        "reference_id": None,  # Exempt from local reference DB
        "match_tier": 0,  # Explicitly adopted link
        "is_approximation": False,
        "unit": "per_unit",
        "calculated_at": now,
        "source_link_id": link_id,
    }

    await db.products.update_one(
        {"_id": product_id},
        {"$set": {"carbon": carbon_data, "updated_at": now}},
    )

    return await get_product(db, org_id, product_id_str)
