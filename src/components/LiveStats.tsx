"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaQuestionCircle, FaTimes } from "react-icons/fa";
import CopyButton from "@/components/CopyButton";
import {
  addToFeed,
  countSignatures,
  FeedRow,
  mergeStats,
  RecentResponse,
  RecentSignature,
  releaseDelayMs,
  rowsInQueue,
  shortAddress,
  shortChainName,
  SignatureType,
  StatsCount,
  takeFromQueue,
  timeAgo,
} from "@/lib/liveSignatures";

const API_BASE_URL = process.env.NEXT_PUBLIC_OPENCHAIN_API_URL || "https://api.openchain.xyz";
const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENVIRONMENT === "production";
const SOURCIFY_SERVER_URL = IS_PRODUCTION ? "https://sourcify.dev/server" : "https://staging.sourcify.dev/server";
const SOURCIFY_REPO_URL = IS_PRODUCTION ? "https://repo.sourcify.dev" : "https://repo.staging.sourcify.dev";

const POLL_MS = 5_000;
const STATS_MS = 60_000;
// /recent asks again for the last minute, because rows can commit late
const OVERLAP_MS = 60_000;
// The feed at start, and after the tab was hidden for longer than this
const INITIAL_WINDOW_MS = 10 * 60_000;
const MAX_PAGES = 5;
// At most this many rows come in each second
const MAX_ROWS_PER_SECOND = 4;
const MAX_ROWS = 20;

type FeedState = "loading" | "ok" | "error";

function useLiveSignatures() {
  const [count, setCount] = useState<StatsCount | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [feedState, setFeedState] = useState<FeedState>("loading");
  // Signatures that wait while the user looks at the feed, so the rows do not move
  const [heldCount, setHeldCount] = useState(0);
  const paused = useRef(false);
  const held = useRef<RecentSignature[]>([]);

  const queue = useRef<RecentSignature[]>([]);
  // signatureHash32 -> createdAt in ms, to remove the duplicates of the overlap
  const seen = useRef(new Map<string, number>());
  // The start time of the last poll that succeeded
  const lastPollMs = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let statsTimer: ReturnType<typeof setInterval> | undefined;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    let polling = false;

    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/signature-database/v1/stats`, { cache: "no-store" });
        const data = await response.json();
        if (stopped) return;
        setCount((shown) => mergeStats(shown, data.result.count));
        setRefreshedAt(data.result.metadata.refreshed_at);
        setStatsError(false);
      } catch (error) {
        console.error("Stats error:", error);
        if (!stopped) setStatsError(true);
      }
    };

    // All new signatures since sinceMs, oldest first, without the ones that the page has
    const fetchRecent = async (sinceMs: number): Promise<RecentSignature[]> => {
      const found: RecentSignature[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const params = new URLSearchParams({ since: new Date(sinceMs).toISOString(), limit: "500" });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`${API_BASE_URL}/signature-database/v1/recent?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: RecentResponse = await response.json();
        for (const sig of data.result.signatures) {
          if (seen.current.has(sig.signatureHash32)) continue;
          seen.current.set(sig.signatureHash32, Date.parse(sig.createdAt));
          found.push(sig);
        }
        cursor = data.result.next;
        if (!cursor) break;
      }
      // Forget the hashes that the overlap cannot give again
      const oldest = sinceMs - OVERLAP_MS;
      for (const [hash, createdMs] of seen.current) {
        if (createdMs < oldest) seen.current.delete(hash);
      }
      return found;
    };

    const release = () => {
      releaseTimer = undefined;
      if (stopped || queue.current.length === 0) return;
      const { taken, rest } = takeFromQueue(queue.current);
      queue.current = rest;
      if (paused.current) {
        held.current.push(...taken);
        setHeldCount(held.current.length);
      } else {
        setRows((current) => addToFeed(current, taken, MAX_ROWS, true));
      }
      setCount((current) => (current ? countSignatures(current, taken) : current));
      if (rest.length > 0) {
        releaseTimer = setTimeout(release, releaseDelayMs(rowsInQueue(rest), POLL_MS, MAX_ROWS_PER_SECOND));
      }
    };

    const poll = async () => {
      polling = true;
      const now = Date.now();
      // At start, or after a long time in a hidden tab: show the last minutes at once
      const catchUp = lastPollMs.current === null || now - lastPollMs.current > INITIAL_WINDOW_MS;
      try {
        const sigs = await fetchRecent(catchUp ? now - INITIAL_WINDOW_MS : lastPollMs.current! - OVERLAP_MS);
        if (stopped) return;
        lastPollMs.current = now;
        if (catchUp) {
          queue.current = [];
          held.current = [];
          setHeldCount(0);
          setRows((current) => addToFeed(current, sigs, MAX_ROWS, false));
        } else if (sigs.length > 0) {
          queue.current.push(...sigs);
          if (!releaseTimer) release();
        }
        setFeedState("ok");
      } catch (error) {
        console.error("Recent signatures error:", error);
        if (!stopped) setFeedState("error");
      } finally {
        polling = false;
      }
      if (!stopped && document.visibilityState === "visible") {
        pollTimer = setTimeout(poll, POLL_MS);
      }
    };

    const start = () => {
      fetchStats();
      statsTimer = setInterval(fetchStats, STATS_MS);
      // A poll that is still in progress sets the next timer itself
      if (!polling) poll();
    };

    const pause = () => {
      clearTimeout(pollTimer);
      clearInterval(statsTimer);
      pollTimer = undefined;
      statsTimer = undefined;
    };

    const onVisibilityChange = () => {
      pause();
      if (document.visibilityState === "visible") start();
    };

    if (document.visibilityState === "visible") {
      start();
    } else {
      fetchStats();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      pause();
      clearTimeout(releaseTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const setPaused = useCallback((value: boolean) => {
    paused.current = value;
    if (!value && held.current.length > 0) {
      const waiting = held.current;
      held.current = [];
      setHeldCount(0);
      setRows((current) => addToFeed(current, waiting, MAX_ROWS, true));
    }
  }, []);

  return { count, refreshedAt, statsError, rows, feedState, heldCount, setPaused };
}

function useChainNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch(`${SOURCIFY_SERVER_URL}/chains`)
      .then((response) => response.json())
      .then((chains: { chainId: number; name: string }[]) =>
        setNames(Object.fromEntries(chains.map((chain) => [String(chain.chainId), chain.name])))
      )
      .catch(() => undefined);
  }, []);
  return names;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// A number that flashes when it goes up
function LiveNumber({ value }: { value: number | null }) {
  const previous = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value !== null && previous.current !== null && value > previous.current) setBump((b) => b + 1);
    previous.current = value;
  }, [value]);

  if (value === null) {
    return (
      <span
        className="text-gray-400 italic cursor-help"
        data-tooltip-id="global-tooltip"
        data-tooltip-content="Not available at the moment. The daily count is missing or too old. The total is still live."
      >
        Not available
      </span>
    );
  }
  return (
    <span key={bump} className={`tabular-nums ${bump > 0 ? "animate-count-bump" : ""}`}>
      {value.toLocaleString()}
    </span>
  );
}

function StatCell({ label, value, strong }: { label: string; value: number | null | undefined; strong?: boolean }) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className={`text-base md:text-lg ${strong ? "font-semibold text-gray-900" : "text-gray-800"}`}>
        {value === undefined ? "–" : <LiveNumber value={value} />}
      </span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}

function StatsBar({
  count,
  refreshedAt,
  statsError,
}: {
  count: StatsCount | null;
  refreshedAt: string | null;
  statsError: boolean;
}) {
  if (!count) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 h-[74px]">
        {statsError ? (
          "Stats are not available at the moment."
        ) : (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cerulean-blue-600 border-t-transparent"></div>
            Loading stats...
          </>
        )}
      </div>
    );
  }
  const updated = refreshedAt
    ? new Date(refreshedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div className="bg-white border border-gray-200 rounded-lg grid grid-cols-2 md:grid-cols-[3fr_1fr_1fr] divide-y md:divide-y-0 md:divide-x divide-gray-200 text-gray-700">
      <div className="col-span-2 md:col-span-1 px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 flex items-center justify-center gap-1">
          In verified contract ABIs
          <FaQuestionCircle
            className="w-3 h-3 cursor-help"
            data-tooltip-id="global-tooltip"
            data-tooltip-content="The signatures found in at least one verified contract ABI on Sourcify"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCell label="functions" value={count.function} />
          <StatCell label="events" value={count.event} />
          <StatCell label="errors" value={count.error} />
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 flex items-center justify-center gap-1">
          Public submissions
          <FaQuestionCircle
            className="w-3 h-3 cursor-help"
            data-tooltip-id="global-tooltip"
            data-tooltip-content="Signatures without a verified contract on Sourcify. For signatures submitted via the /import endpoint or from other signature databases."
          />
        </div>
        <StatCell label="signatures" value={count.unknown} />
      </div>
      <div className="px-3 py-2 border-l border-gray-200">
        <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 flex items-center justify-center gap-1.5">
          Total
          <span
            className="flex items-center gap-1 normal-case tracking-normal text-green-700 cursor-help"
            data-tooltip-id="global-tooltip"
            data-tooltip-content={`The counts go up with each new signature below, and update every minute. Last update: ${updated}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
            </span>
            live
          </span>
        </div>
        <StatCell label="signatures" value={count.total} strong />
      </div>
    </div>
  );
}

const TYPE_STYLES: Record<SignatureType | "unknown", string> = {
  function: "bg-cerulean-blue-100 text-cerulean-blue-700",
  event: "bg-amber-100 text-amber-800",
  error: "bg-light-coral-100 text-light-coral-800",
  unknown: "bg-gray-100 text-gray-600",
};

function typeCounts(sigs: RecentSignature[]): [SignatureType | "unknown", number][] {
  const counts = new Map<SignatureType | "unknown", number>();
  for (const sig of sigs) {
    const types = sig.types.length > 0 ? sig.types : (["unknown"] as const);
    for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()];
}

function sourceTitle(source: FeedRow["source"], chainNames: Record<string, string>) {
  if (!source) return { name: "Public submission", chain: null, chainFull: null };
  const chainFull = chainNames[source.chainId] ?? `Chain ${source.chainId}`;
  return { name: source.name ?? "Contract", chain: shortChainName(chainFull), chainFull };
}

function FeedRowView({
  row,
  now,
  chainNames,
  selected,
  onSelect,
}: {
  row: FeedRow;
  now: number;
  chainNames: Record<string, string>;
  selected: boolean;
  onSelect: () => void;
}) {
  const examples = row.signatures.slice(-2).reverse();
  const more = row.signatures.length - examples.length;
  const source = row.source;
  const title = sourceTitle(source, chainNames);

  return (
    <li className="relative animate-row-in">
      {row.flash > 0 && (
        <div key={row.flash} className="absolute inset-0 pointer-events-none animate-row-flash rounded" />
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-haspopup="dialog"
        className={`relative w-full text-left px-3 py-1.5 flex flex-wrap md:flex-nowrap items-center gap-x-2 gap-y-0.5 cursor-pointer ${
          selected ? "bg-cerulean-blue-100/60" : "hover:bg-gray-50"
        }`}
      >
        <span className="shrink-0 min-w-[2.75rem] text-center rounded bg-green-50 text-green-700 text-xs font-semibold tabular-nums py-0.5">
          +{row.signatures.length}
        </span>
        <span className={`shrink-0 text-sm font-medium truncate max-w-[13rem] ${source ? "text-gray-800" : "text-gray-600"}`}>
          {title.name}
        </span>
        {title.chain && (
          <span className="shrink-0 text-sm text-gray-600 truncate max-w-[10rem]" title={title.chainFull ?? undefined}>
            <span className="text-gray-400">on </span>
            {title.chain}
          </span>
        )}
        {source && (
          <span className="shrink-0 font-mono text-xs text-cerulean-blue-600">{shortAddress(source.address)}</span>
        )}
        <span className="min-w-0 flex-1 font-mono text-xs text-gray-500 truncate">
          {examples.map((sig) => sig.signature).join("  ")}
          {more > 0 && <span className="text-gray-400"> +{more} more</span>}
        </span>
        <span className="shrink-0 text-[11px] text-gray-400 tabular-nums w-14 text-right">
          {timeAgo(row.createdAt, now)}
        </span>
      </button>
    </li>
  );
}

// The details of one feed row, in a panel over the right half of the feed
function FeedDetails({
  row,
  now,
  chainNames,
  onClose,
}: {
  row: FeedRow;
  now: number;
  chainNames: Record<string, string>;
  onClose: () => void;
}) {
  const source = row.source;
  const title = sourceTitle(source, chainNames);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-label={`New signatures of ${title.name}`}
      className="absolute inset-y-0 right-0 z-10 w-full md:w-1/2 bg-white border-l border-gray-200 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.15)] flex flex-col text-left animate-slide-in-right"
    >
      <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold text-gray-900 truncate">{title.name}</span>
          {title.chainFull && <span className="text-gray-500">{title.chainFull}</span>}
          {source && (
            <span className="flex items-center gap-1 font-mono text-xs">
              <a
                href={`${SOURCIFY_REPO_URL}/${source.chainId}/${source.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cerulean-blue-600 hover:underline"
                title={source.address}
              >
                {shortAddress(source.address)}
              </a>
              <CopyButton text={source.address} title="Copy address" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-1 border-b border-gray-100 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-gray-700">{row.signatures.length} new</span>
        {typeCounts(row.signatures).map(([type, n]) => (
          <span key={type} className={`text-[11px] rounded px-1.5 ${TYPE_STYLES[type]}`}>
            {n} {type === "unknown" ? "without type" : `${type}${n > 1 ? "s" : ""}`}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-gray-400" title={new Date(row.createdAt).toLocaleString()}>
          {timeAgo(row.createdAt, now)}
        </span>
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {[...row.signatures].reverse().map((sig) => (
          <li key={sig.signatureHash32} className="px-3 py-1 flex items-center gap-2">
            <span className="shrink-0 font-mono text-[11px] text-gray-400">{sig.signatureHash4}</span>
            <span className="min-w-0 flex-1 font-mono text-xs text-gray-800 truncate" title={sig.signature}>
              {sig.signature}
            </span>
            {sig.types.map((type) => (
              <span key={type} className={`shrink-0 text-[10px] rounded px-1 ${TYPE_STYLES[type]}`}>
                {type}
              </span>
            ))}
            <CopyButton text={sig.signature} title="Copy signature" />
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Feed({
  rows,
  feedState,
  heldCount,
  setPaused,
}: {
  rows: FeedRow[];
  feedState: FeedState;
  heldCount: number;
  setPaused: (paused: boolean) => void;
}) {
  const now = useNow(1000);
  const chainNames = useChainNames();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // The native events, not React's onMouseEnter/onMouseLeave: React reports a
  // leave when a new row moves the row under the mouse.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    element.addEventListener("mouseenter", enter);
    element.addEventListener("mouseleave", leave);
    return () => {
      element.removeEventListener("mouseenter", enter);
      element.removeEventListener("mouseleave", leave);
    };
  }, []);

  // Keep the rows in place while the user looks at them
  useEffect(() => {
    setPaused(hovered || selectedKey !== null);
  }, [hovered, selectedKey, setPaused]);
  // The last version of the selected row, so the panel stays open if the row leaves the feed
  const [selectedRow, setSelectedRow] = useState<FeedRow | null>(null);

  useEffect(() => {
    if (!selectedKey) return;
    const row = rows.find((r) => r.key === selectedKey);
    if (row) setSelectedRow(row);
  }, [rows, selectedKey]);

  const close = useCallback(() => {
    setSelectedKey(null);
    setSelectedRow(null);
  }, []);

  return (
    <div
      className="relative bg-white border border-gray-200 rounded-lg overflow-hidden"
      ref={box}
      data-paused={hovered || selectedKey !== null}
    >
      <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-gray-500">
          New signatures
          {heldCount > 0 && (
            <span className="ml-2 normal-case tracking-normal text-cerulean-blue-600">
              paused · {heldCount} new waiting
            </span>
          )}
        </span>
        <span className="hidden sm:inline text-[11px] text-gray-400">
          from verifications and imports · click a row for details
        </span>
      </div>
      <ul className="divide-y divide-gray-100 h-[9.5rem] overflow-y-auto">
        {feedState === "loading" && rows.length === 0 && (
          <li className="h-full flex items-center justify-center text-sm text-gray-400">Loading new signatures...</li>
        )}
        {feedState === "ok" && rows.length === 0 && (
          <li className="h-full flex items-center justify-center text-sm text-gray-400 px-4 text-center">
            No new signatures in the last 10 minutes. New signatures show here when they arrive.
          </li>
        )}
        {rows.map((row) => (
          <FeedRowView
            key={row.key}
            row={row}
            now={now}
            chainNames={chainNames}
            selected={row.key === selectedKey}
            onSelect={() => {
              setSelectedKey(row.key);
              setSelectedRow(row);
            }}
          />
        ))}
      </ul>
      {selectedRow && <FeedDetails row={selectedRow} now={now} chainNames={chainNames} onClose={close} />}
    </div>
  );
}

export default function LiveStats() {
  const { count, refreshedAt, statsError, rows, feedState, heldCount, setPaused } = useLiveSignatures();
  return (
    <div className="space-y-2">
      <StatsBar count={count} refreshedAt={refreshedAt} statsError={statsError} />
      {/* If /recent fails, the numbers stay and the feed hides */}
      {feedState !== "error" && (
        <Feed rows={rows} feedState={feedState} heldCount={heldCount} setPaused={setPaused} />
      )}
    </div>
  );
}
