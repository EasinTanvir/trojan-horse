import "server-only";

import { initEdgeStore } from "@edgestore/server";
import { createEdgeStoreNextHandler } from "@edgestore/server/adapters/next/app";

/**
 * EdgeStore router — report photos only.
 *
 * Reads EDGE_STORE_ACCESS_KEY / EDGE_STORE_SECRET_KEY from the environment
 * (never NEXT_PUBLIC_), and is reached exclusively through the route handler at
 * /api/edgestore/[...edgestore].
 */
const es = initEdgeStore.create();

export const edgeStoreRouter = es.router({
  /* Public bucket: report photos are shown on the map to anyone reading it. */
  reportPhotos: es.fileBucket({
    maxSize: 1024 * 1024 * 8, // 8 MB
    accept: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  }),
});

export const edgeStoreHandler = createEdgeStoreNextHandler({
  router: edgeStoreRouter,
});
