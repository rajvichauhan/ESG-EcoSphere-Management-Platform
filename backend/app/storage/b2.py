"""Backblaze B2 storage backend implementing S3-compatible API (Phase 12 / Component 2).

All operations are run in a worker thread via anyio.to_thread.run_sync to avoid
blocking the FastAPI async event loop.
"""
from __future__ import annotations

import boto3
from botocore.exceptions import ClientError
from anyio.to_thread import run_sync

from app.storage.base import StorageBackend


class B2Storage(StorageBackend):
    def __init__(
        self, key_id: str, app_key: str, endpoint: str, bucket_name: str
    ) -> None:
        self.bucket_name = bucket_name

        # Ensure the endpoint URL has a proper https schema prefix
        endpoint_url = endpoint
        if endpoint_url and not endpoint_url.startswith("http"):
            endpoint_url = f"https://{endpoint_url}"

        # Single shared client instance for connection reuse
        self.client = boto3.client(
            "s3",
            aws_access_key_id=key_id,
            aws_secret_access_key=app_key,
            endpoint_url=endpoint_url,
        )

    def _save_sync(self, key: str, data: bytes, content_type: str | None) -> str:
        # Check if file already exists with identical contents to avoid re-uploading (saving bandwidth)
        try:
            existing_head = self.client.head_object(Bucket=self.bucket_name, Key=key)
            # Compare size (ContentLength) to see if we can skip re-uploading
            if existing_head.get("ContentLength") == len(data):
                # Unchanged
                return key
        except ClientError:
            # File doesn't exist or is not accessible, proceed with upload
            pass

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=data,
            **extra_args
        )
        return key

    async def save(self, key: str, data: bytes, content_type: str | None = None) -> str:
        return await run_sync(self._save_sync, key, data, content_type)

    def _load_sync(self, key: str) -> bytes:
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=key)
            return response["Body"].read()
        except ClientError as e:
            # Handle both S3 and B2 status codes
            error_code = e.response.get("Error", {}).get("Code")
            if error_code in ("NoSuchKey", "404", "NoSuchBucket"):
                raise FileNotFoundError(key)
            raise e

    async def load(self, key: str) -> bytes:
        return await run_sync(self._load_sync, key)

    def _delete_sync(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
        except ClientError:
            pass

    async def delete(self, key: str) -> None:
        await run_sync(self._delete_sync, key)

    def _exists_sync(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchKey", "NoSuchBucket"):
                return False
            raise e

    async def exists(self, key: str) -> bool:
        return await run_sync(self._exists_sync, key)
