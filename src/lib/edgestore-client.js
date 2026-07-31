"use client";

import { createEdgeStoreProvider } from "@edgestore/react";

/**
 * Client half of EdgeStore. `EdgeStoreProvider` wraps the user panel (the only
 * place uploads happen); `useEdgeStore` gives ReportForm the upload call.
 */
const { EdgeStoreProvider, useEdgeStore } = createEdgeStoreProvider();

export { EdgeStoreProvider, useEdgeStore };
