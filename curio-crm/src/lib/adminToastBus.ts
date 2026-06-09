/** Global admin toast bus — works outside React (e.g. api client). */

export type AdminToastType = "loading" | "success" | "error" | "info";

export type AdminToastItem = {
  id: string;
  message: string;
  type: AdminToastType;
};

type Listener = (items: AdminToastItem[]) => void;

let items: AdminToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((fn) => fn([...items]));
}

function scheduleRemove(id: string, ms: number) {
  const prev = timers.get(id);
  if (prev) clearTimeout(prev);
  timers.set(
    id,
    setTimeout(() => {
      removeAdminToast(id);
      timers.delete(id);
    }, ms),
  );
}

export function subscribeAdminToasts(fn: Listener): () => void {
  listeners.add(fn);
  fn([...items]);
  return () => listeners.delete(fn);
}

export function pushAdminToast(message: string, type: AdminToastType = "info"): string {
  const id = crypto.randomUUID();
  items = [...items.slice(-4), { id, message, type }];
  emit();
  if (type === "success") scheduleRemove(id, 5000);
  if (type === "error") scheduleRemove(id, 14_000);
  if (type === "info") scheduleRemove(id, 4000);
  return id;
}

export function updateAdminToast(id: string, message: string, type: AdminToastType) {
  items = items.map((t) => (t.id === id ? { ...t, message, type } : t));
  emit();
  if (type === "success") scheduleRemove(id, 5000);
  if (type === "error") scheduleRemove(id, 14_000);
  if (type === "loading") {
    const prev = timers.get(id);
    if (prev) clearTimeout(prev);
    timers.delete(id);
  }
}

export function removeAdminToast(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Shorthand for UI-only actions (file picker, selection, etc.) */
export function notifyAdmin(message: string, type: AdminToastType = "info") {
  pushAdminToast(message, type);
}
