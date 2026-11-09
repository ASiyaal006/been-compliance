"use client";

import { useSyncExternalStore } from "react";
import { createDefectLog, saveInspection, type SaveInspectionInput } from "@/actions/product-inspection";
import { DEFECT_PHOTOS_BUCKET, defectPhotoPath } from "@/lib/defect-photos";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/with-timeout";
import type { DefectSeverity } from "@/lib/types/product-inspection";

/**
 * The offline outbox: inspection saves and defects are written to this phone first (IndexedDB) and
 * uploaded in the order they were made, straight away when there is signal and automatically later
 * when there isn't. Items that the server turns down stay here, marked failed, until the inspector
 * fixes or removes them, so nothing typed on the factory floor is ever silently lost.
 */

type ItemBase = {
  id: string;
  orderId: string;
  /** Upload order. A save that replaces an older one moves to the back, after defects logged before it. */
  seq: number;
  /** "failed" means the server turned it down (shown to the inspector); network trouble just stays "pending". */
  status: "pending" | "failed";
  error?: string;
  /** Failed upload attempts because of the connection, to say "still trying" rather than stay silent. */
  attempts: number;
};

export type SaveItem = ItemBase & { kind: "save"; input: SaveInspectionInput };

export type DefectFields = {
  severity: DefectSeverity;
  description: string;
  checklistSection: string;
  quantity: string;
};

export type DefectItem = ItemBase & {
  kind: "defect";
  input: DefectFields;
  photo: Blob;
  photoType: string;
  /** Fixed when queued so a retried upload lands on the same file and the defect is never logged twice. */
  photoId: string;
  createdAt: number;
};

export type OutboxItem = SaveItem | DefectItem;

// ------------------------------------------------------------------------------
// IndexedDB
// ------------------------------------------------------------------------------

const DB_NAME = "been-offline";
const STORE = "outbox";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const getAll = () => tx<OutboxItem[]>("readonly", (s) => s.getAll());
const getItem = (id: string) => tx<OutboxItem | undefined>("readonly", (s) => s.get(id));
const putItem = (item: OutboxItem) => tx<IDBValidKey>("readwrite", (s) => s.put(item));
const deleteItem = (id: string) => tx<undefined>("readwrite", (s) => s.delete(id));

/** Changes an item only if it is still the version that was uploaded (the inspector may have saved again meanwhile). */
async function updateIfUnchanged(item: OutboxItem, change: (current: OutboxItem) => OutboxItem | null) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    const req = store.get(item.id);
    req.onsuccess = () => {
      const current = req.result as OutboxItem | undefined;
      if (!current || current.seq !== item.seq) return;
      const next = change(current);
      if (next) store.put(next);
      else store.delete(item.id);
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ------------------------------------------------------------------------------
// Shared state for the screen (this tab, and other tabs via BroadcastChannel)
// ------------------------------------------------------------------------------

export type OutboxState = {
  /** Null until read from the phone. */
  items: OutboxItem[] | null;
  syncing: boolean;
  /** Bumped each time a run uploads something, so the screen can refresh from the server. */
  uploadedRuns: number;
};

let state: OutboxState = { items: null, syncing: false, uploadedRuns: 0 };
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let lastSeq = 0;

function emit(patch: Partial<OutboxState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

async function reload() {
  try {
    const items = await getAll();
    items.sort((a, b) => a.seq - b.seq);
    emit({ items });
  } catch {
    // Private browsing or storage switched off: behave as an empty outbox.
    emit({ items: [] });
  }
}

async function changed() {
  await reload();
  channel?.postMessage("changed");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("been-outbox");
      channel.onmessage = () => void reload();
    }
    void reload();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      channel?.close();
      channel = null;
    }
  };
}

const serverState: OutboxState = { items: null, syncing: false, uploadedRuns: 0 };

export function useOutbox(): OutboxState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

function nextSeq(): number {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
}

/** Asks the browser not to clear the outbox when the phone runs low on space. */
function keepStorage() {
  void navigator.storage?.persist?.().catch(() => undefined);
}

// ------------------------------------------------------------------------------
// Queueing
// ------------------------------------------------------------------------------

const saveId = (orderId: string) => `save:${orderId}`;

/** Stores the latest checklist answers for a booking, replacing any earlier unsent save. */
export async function queueSave(input: SaveInspectionInput): Promise<string> {
  const item: SaveItem = { id: saveId(input.orderId), kind: "save", orderId: input.orderId, seq: nextSeq(), status: "pending", attempts: 0, input };
  await putItem(item);
  keepStorage();
  await changed();
  return item.id;
}

export async function queueDefect(orderId: string, input: DefectFields, photo: File): Promise<string> {
  const item: DefectItem = {
    id: `defect:${crypto.randomUUID()}`,
    kind: "defect",
    orderId,
    seq: nextSeq(),
    status: "pending",
    attempts: 0,
    input,
    // Stored as a plain Blob: some phones can't keep File objects in IndexedDB.
    photo: new Blob([photo], { type: photo.type }),
    photoType: photo.type,
    photoId: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await putItem(item);
  keepStorage();
  await changed();
  return item.id;
}

export async function removeOutboxItem(id: string) {
  await deleteItem(id);
  await changed();
}

/** Puts a failed item back in the queue and tries again. */
export async function retryOutboxItem(id: string) {
  const item = await getItem(id);
  if (item) {
    await putItem({ ...item, status: "pending", error: undefined, attempts: 0 });
    await changed();
  }
  await flushOutbox();
}

// ------------------------------------------------------------------------------
// Uploading
// ------------------------------------------------------------------------------

type SendResult = { ok: true } | { ok: false; error: string };

/** Thrown for anything that isn't a clear answer from the server: no signal, timeouts, app updates. */
class ConnectionError extends Error {}

async function sendSave(item: SaveItem): Promise<SendResult> {
  return saveInspection(item.input);
}

async function sendDefect(item: DefectItem): Promise<SendResult> {
  const supabase = createSupabaseBrowserClient();
  // getSession reads the sign-in kept on the phone, so it works before the connection is fully back.
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { ok: false, error: "You must be signed in to do this." };

  const path = defectPhotoPath(userId, item.orderId, item.photoType, item.photoId);
  const { error: uploadError } = await supabase.storage
    .from(DEFECT_PHOTOS_BUCKET)
    .upload(path, item.photo, { contentType: item.photoType });
  // "Already exists" means an earlier try got the photo up before the connection dropped.
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) {
    if (/bucket not found/i.test(uploadError.message)) {
      return { ok: false, error: "Photo storage isn't set up yet. Run the product inspection results SQL in Supabase first." };
    }
    if (/row-level security|unauthori[sz]ed|forbidden/i.test(uploadError.message)) {
      return { ok: false, error: `The photo could not be uploaded: ${uploadError.message}` };
    }
    throw new ConnectionError(uploadError.message);
  }

  return createDefectLog({ orderId: item.orderId, ...item.input, photoPath: path });
}

const isSignedOut = (error: string) => /must be signed in/i.test(error);

let running: Promise<void> | null = null;
let again = false;

/**
 * Uploads everything waiting, oldest first. Stops at the first connection problem and tries again later.
 * Only one upload runs at a time, across tabs where the browser supports it.
 */
export function flushOutbox(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    emit({ syncing: true });
    try {
      do {
        again = false;
        const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
        if (locks) await locks.request("been-outbox", runOnce);
        else await runOnce();
      } while (again);
    } finally {
      running = null;
      emit({ syncing: false });
    }
  })();
  return running;
}

async function runOnce() {
  let items: OutboxItem[];
  try {
    items = (await getAll()).sort((a, b) => a.seq - b.seq);
  } catch {
    return;
  }
  // A failed item holds back everything after it for the same booking, so a report is never
  // submitted without a defect logged before it.
  const held = new Set<string>();
  let uploaded = false;

  for (const item of items) {
    if (item.status === "failed") {
      held.add(item.orderId);
      continue;
    }
    if (held.has(item.orderId)) continue;
    if (typeof navigator !== "undefined" && !navigator.onLine) break;

    let result: SendResult;
    try {
      // Factory Wi-Fi often says "connected" with nothing getting through, so don't wait for ever.
      result =
        item.kind === "save"
          ? await withTimeout(sendSave(item), "Saving", 30_000)
          : await withTimeout(sendDefect(item), "Uploading the defect", 120_000);
    } catch (err) {
      await updateIfUnchanged(item, (current) => ({
        ...current,
        attempts: current.attempts + 1,
        error: err instanceof Error ? err.message : String(err),
      })).catch(() => undefined);
      break;
    }

    if (result.ok) {
      uploaded = true;
      await updateIfUnchanged(item, () => null);
    } else if (isSignedOut(result.error)) {
      // Keep it queued: it goes up once the inspector signs in again.
      await updateIfUnchanged(item, (current) => ({ ...current, attempts: current.attempts + 1, error: result.error }));
      break;
    } else {
      held.add(item.orderId);
      await updateIfUnchanged(item, (current) => ({ ...current, status: "failed", error: result.error }));
    }
  }

  await changed();
  if (uploaded) emit({ uploadedRuns: state.uploadedRuns + 1 });
}

export type SendNowOutcome = { status: "sent" } | { status: "queued" } | { status: "rejected"; error: string };

/** Tries to upload a just-queued item and says what happened to it. */
export async function sendNow(id: string): Promise<SendNowOutcome> {
  if (typeof navigator === "undefined" || navigator.onLine) await flushOutbox();
  const item = await getItem(id).catch(() => undefined);
  if (!item) return { status: "sent" };
  if (item.status === "failed") return { status: "rejected", error: item.error ?? "This couldn't be saved." };
  return { status: "queued" };
}
