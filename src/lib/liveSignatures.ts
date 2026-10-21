// Types and helpers for the live counts and the feed of new signatures.
// The API is GET /signature-database/v1/stats and GET /signature-database/v1/recent.

export type SignatureType = "function" | "event" | "error";

export interface StatsCount {
  function: number | null;
  event: number | null;
  error: number | null;
  unknown: number | null;
  total: number | null;
}

export interface RecentSignature {
  signature: string;
  signatureHash4: string;
  signatureHash32: string;
  createdAt: string;
  types: SignatureType[];
  // The contract whose verification added the signature. null for an imported signature.
  source: { name: string | null; chainId: string; address: string } | null;
}

export interface RecentResponse {
  ok: boolean;
  result: { signatures: RecentSignature[]; next: string | null };
}

// One row of the feed: the new signatures of one contract, or of one import
export interface FeedRow {
  key: string;
  source: RecentSignature["source"];
  signatures: RecentSignature[];
  // The time that the newest signature of the row was created
  createdAt: string;
  // The number of times that the row got signatures from a poll. The UI uses it
  // to highlight the row.
  flash: number;
}

export const STAT_FIELDS = ["function", "event", "error", "unknown", "total"] as const;

// The signatures of one verification share the contract. The signatures of one
// import share the transaction, so they have the same createdAt.
export function feedKey(sig: RecentSignature): string {
  return sig.source ? `${sig.source.chainId}:${sig.source.address}` : `import:${sig.createdAt}`;
}

// Adds signatures to the feed. A signature joins the row of its contract and
// moves that row to the top. The feed keeps at most maxRows rows. live is false
// for the signatures that the page loads at start.
export function addToFeed(rows: FeedRow[], sigs: RecentSignature[], maxRows: number, live: boolean): FeedRow[] {
  let next = rows;
  for (const sig of sigs) {
    const key = feedKey(sig);
    const existing = next.find((row) => row.key === key);
    const row: FeedRow = existing
      ? {
          ...existing,
          signatures: [...existing.signatures, sig],
          createdAt: sig.createdAt > existing.createdAt ? sig.createdAt : existing.createdAt,
          flash: live ? existing.flash + 1 : existing.flash,
        }
      : { key, source: sig.source, signatures: [sig], createdAt: sig.createdAt, flash: live ? 1 : 0 };
    next = [row, ...next.filter((r) => r.key !== key)];
  }
  return next.slice(0, maxRows);
}

// Adds the signatures that the feed shows to the counts. A count that is null
// stays null.
export function countSignatures(count: StatsCount, sigs: RecentSignature[]): StatsCount {
  const next = { ...count };
  const add = (field: keyof StatsCount) => {
    const value = next[field];
    if (value !== null) next[field] = value + 1;
  };
  for (const sig of sigs) {
    add("total");
    if (sig.types.length === 0) add("unknown");
    for (const type of sig.types) add(type);
  }
  return next;
}

// Merges a /stats response into the counts on the screen. The screen never shows
// a lower number than before: two API instances can differ for a few seconds,
// and the feed adds signatures before /stats counts them.
export function mergeStats(shown: StatsCount | null, server: StatsCount): StatsCount {
  if (!shown) return server;
  const next = { ...server };
  for (const field of STAT_FIELDS) {
    const s = server[field];
    const current = shown[field];
    next[field] = s === null ? null : current === null ? s : Math.max(s, current);
  }
  return next;
}

// The wait before the next row leaves the queue. The queue empties in about one
// poll interval, but at most maxPerSecond rows show each second.
export function releaseDelayMs(rowsInQueue: number, pollIntervalMs: number, maxPerSecond: number): number {
  const minDelay = 1000 / maxPerSecond;
  if (rowsInQueue <= 0) return minDelay;
  return Math.max(minDelay, Math.min(1000, pollIntervalMs / rowsInQueue));
}

export function rowsInQueue(queue: RecentSignature[]): number {
  return new Set(queue.map(feedKey)).size;
}

// The signatures that leave the queue in one step: all queued signatures of the
// first contract (or import), so a row shows its full count at once.
export function takeFromQueue(queue: RecentSignature[]): { taken: RecentSignature[]; rest: RecentSignature[] } {
  if (queue.length === 0) return { taken: [], rest: [] };
  const key = feedKey(queue[0]);
  return {
    taken: queue.filter((sig) => feedKey(sig) === key),
    rest: queue.filter((sig) => feedKey(sig) !== key),
  };
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function timeAgo(iso: string, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// A short chain name for the feed: "Ethereum Sepolia Testnet" -> "Sepolia",
// "Base Mainnet" -> "Base". The full name stays in the tooltip.
const TESTNET_NAMES = /\b(Sepolia|Hoodi|Holesky|Goerli|Fuji|Amoy|Chiado|Curtis|Bepolia|Calibration|Galileo)\b/;

export function shortChainName(name: string): string {
  let short = name.replace(/ Mainnet$/, "");
  if (TESTNET_NAMES.test(short)) short = short.replace(/ Testnet$/, "");
  short = short.replace(/^Ethereum (Sepolia|Hoodi|Holesky|Goerli)$/, "$1");
  return short || name;
}

// Keeps the newest maxRows rows of the queue. The queue is oldest first. The
// caller still counts the dropped signatures, so only the display skips them.
export function trimQueue(
  queue: RecentSignature[],
  maxRows: number
): { kept: RecentSignature[]; dropped: RecentSignature[] } {
  const keys = [...new Set(queue.map(feedKey))];
  if (keys.length <= maxRows) return { kept: queue, dropped: [] };
  const keep = new Set(keys.slice(-maxRows));
  return {
    kept: queue.filter((sig) => keep.has(feedKey(sig))),
    dropped: queue.filter((sig) => !keep.has(feedKey(sig))),
  };
}
