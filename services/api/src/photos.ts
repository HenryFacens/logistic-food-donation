import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getConfig } from "./config.js";
import { getPool } from "./db.js";
import { ApiError } from "./errors.js";

let containerPromise: Promise<ContainerClient> | undefined;

function getContainer(): Promise<ContainerClient> {
  const config = getConfig();
  if (!config.AzureWebJobsStorage) {
    return Promise.reject(new Error("AzureWebJobsStorage is not configured"));
  }
  containerPromise ??= (async () => {
    const container = BlobServiceClient.fromConnectionString(
      config.AzureWebJobsStorage!,
    ).getContainerClient(config.PHOTO_CONTAINER);
    await container.createIfNotExists();
    return container;
  })().catch((error) => {
    containerPromise = undefined;
    throw error;
  });
  return containerPromise;
}

export const photoPath = (photoId: string) => `/api/photos/${photoId}`;

export async function storePhoto(
  sellerId: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const container = await getContainer();
  const id = randomUUID();
  const blobName = `${sellerId}/${id}`;
  await container.getBlockBlobClient(blobName).uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  await getPool().query(
    `INSERT INTO photos (id, seller_id, blob_name, content_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, sellerId, blobName, contentType, data.length],
  );
  return id;
}

export async function readPhoto(
  photoId: string,
): Promise<{ data: Buffer; contentType: string }> {
  const result = await getPool().query<{
    blob_name: string;
    content_type: string;
  }>("SELECT blob_name, content_type FROM photos WHERE id = $1", [photoId]);
  const row = result.rows[0];
  if (!row) {
    throw new ApiError(404, "not_found", "Foto não encontrada.");
  }
  const container = await getContainer();
  const data = await container.getBlockBlobClient(row.blob_name).downloadToBuffer();
  return { data, contentType: row.content_type };
}

export async function assertPhotoOwner(
  client: PoolClient,
  photoId: string,
  sellerId: string,
): Promise<void> {
  const owned = await client.query(
    "SELECT 1 FROM photos WHERE id = $1 AND seller_id = $2",
    [photoId, sellerId],
  );
  if (!owned.rowCount) {
    throw new ApiError(422, "invalid_photo", "Foto não encontrada para este doador.");
  }
}
