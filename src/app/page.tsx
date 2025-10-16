"use client";

import { useState, useEffect, Suspense } from "react";
import CopyButton from "@/components/CopyButton";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FaQuestionCircle, FaCheckCircle, FaBan } from "react-icons/fa";
import { HiOutlineCursorClick } from "react-icons/hi";
import { Tooltip } from "react-tooltip";

interface SearchResult {
  name: string;
  filtered: boolean;
  hex_signature: string;
  type: "function" | "event" | "error";
  hasVerifiedContract: boolean;
}

interface ApiResult {
  name: string;
  filtered: boolean;
  hasVerifiedContract: boolean;
}

interface ApiResponse {
  ok: boolean;
  result: {
    function?: Record<string, ApiResult[] | null>;
    event?: Record<string, ApiResult[]>;
  };
}

interface Stats {
  function?: number;
  event?: number;
  error?: number;
  unknown?: number;
  total?: number;
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_OPENCHAIN_API_URL || "https://api.openchain.xyz";

// Example selectors for users to try
const exampleSelectors = [
  { query: "0xa9059cbb", description: "4-byte function selector" },
  { query: "transfer*", description: "Wildcard text search for signatures starting with 'transfer'" },
  { query: "*Supply*", description: "Signatures containing 'Supply'" },
  { query: "?all()", description: "Single char wildcard - matches 'call()', 'wall()', etc." },
  { query: "transferFrom(address,address,uint256)", description: "Full function signature" },
  { query: "0xbb757047c2b5f3974fe26b7c10f732e7bce710b0952a71082702781e62ae0595", description: "32-byte event hash" },
];

function SearchInterface() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsDate, setStatsDate] = useState<string | null>(null);

  // Update URL with search query
  const updateURL = (searchQuery: string) => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    const newURL = params.toString() ? `/?${params.toString()}` : "/";

    // Use history API to avoid scroll jumps
    window.history.replaceState(null, "", newURL);
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResults(undefined);

    const trimmedQuery = searchQuery.trim();

    // Update URL with search query
    updateURL(trimmedQuery);

    // Check if it's a hex query (starts with 0x or is 8 hex chars)
    const isHexQuery =
      trimmedQuery.toLowerCase().startsWith("0x") || (trimmedQuery.length === 8 && /^[a-fA-F0-9]+$/.test(trimmedQuery));

    if (isHexQuery) {
      // Validate hex hash format and determine type
      const hexQuery = trimmedQuery.toLowerCase().startsWith("0x")
        ? trimmedQuery.toLowerCase()
        : "0x" + trimmedQuery.toLowerCase();

      const hexWithoutPrefix = hexQuery.slice(2);

      // Validate hex characters
      if (!/^[a-fA-F0-9]+$/.test(hexWithoutPrefix)) {
        setError("Invalid hex format. Use only 0-9 and a-f characters.");
        setLoading(false);
        return;
      }

      if (hexWithoutPrefix.length !== 8 && hexWithoutPrefix.length !== 64) {
        setError(
          `Invalid hash length. Expected 4 bytes (8 hex chars) for functions or 32 bytes (64 hex chars) for events. Got ${hexWithoutPrefix.length} hex characters.`
        );
        setLoading(false);
        return;
      }

      try {
        // Search for all types: function, event, and error
        const params = new URLSearchParams();
        params.append("function", hexQuery);
        params.append("event", hexQuery);
        params.append("filter", "false"); // don't filter but show visually

        const response = await fetch(`${API_BASE_URL}/signature-database/v1/lookup?${params.toString()}`);
        const data: ApiResponse = await response.json();

        const newResults: SearchResult[] = [];

        // Add function results
        if (data.result.function) {
          Object.entries(data.result.function).forEach(([hex, sigs]) => {
            sigs?.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
                type: "function",
                hasVerifiedContract: sig.hasVerifiedContract,
              })
            );
          });
        }

        // Add event results
        if (data.result.event) {
          Object.entries(data.result.event).forEach(([hex, sigs]) => {
            sigs.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
                type: "event",
                hasVerifiedContract: sig.hasVerifiedContract,
              })
            );
          });
        }

        setResults(newResults);
      } catch (error) {
        console.error("Search error:", error);
        setError("Failed to fetch results. Please try again.");
      }
    } else {
      // Text search

      try {
        const response = await fetch(
          `${API_BASE_URL}/signature-database/v1/search?query=${encodeURIComponent(trimmedQuery)}`
        );
        const data: ApiResponse = await response.json();

        const newResults: SearchResult[] = [];

        // Add function results
        if (data.result.function) {
          Object.entries(data.result.function).forEach(([hex, sigs]) => {
            sigs?.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
                type: "function",
                hasVerifiedContract: sig.hasVerifiedContract,
              })
            );
          });
        }

        // Add event results
        if (data.result.event) {
          Object.entries(data.result.event).forEach(([hex, sigs]) => {
            sigs.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
                type: "event",
                hasVerifiedContract: sig.hasVerifiedContract,
              })
            );
          });
        }

        setResults(newResults);
      } catch (error) {
        console.error("Search error:", error);
        setError("Failed to fetch results. Please try again.");
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch(query);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/signature-database/v1/stats`);
      const data = await response.json();
      console.log("Stats data:", data);
      setStats(data.result.count);
      setStatsDate(data.result.metadata.refreshed_at);
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  const handleExampleClick = async (example: string) => {
    setQuery(example);
    await performSearch(example);
  };

  // Load query from URL parameters on mount only
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    }
    fetchStats();
  }, []); // Empty dependency array - only run on mount

  return (
    <div className="min-h-screen py-2">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-0">
          <div className="flex flex-col justify-center mb-4">
            <h1 className="text-3xl md:text-5xl font-bold font-vt323 text-gray-800">
              {process.env.NEXT_PUBLIC_ENVIRONMENT !== "production" ? "(staging) " : ""}4byte.sourcify.dev
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-600 mx-auto mt-4 px-4">
            Created from Sourcify verified contracts and follows the{" "}
            <a
              href="https://openchain.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cerulean-blue-600"
            >
              openchain.xyz
            </a>{" "}
            &apos;s API. See{" "}
            <Link
              href="https://docs.sourcify.dev/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cerulean-blue-600"
            >
              Sourcify API docs
            </Link>
            .
          </p>
          <div className="my-4">
            {stats ? (
              <>
                {statsDate && (
                  <div className="text-xs md:text-sm text-gray-400">
                    Stats updated:{" "}
                    {new Date(statsDate).toLocaleString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-gray-700">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:border-cerulean-blue-400 hover:shadow-md transition-all duration-200">
                    <div className="text-sm text-gray-400 mb-2 flex items-center justify-center gap-1">
                      Found in a Verified Contract ABI
                      <FaQuestionCircle
                        className="w-3 h-3 text-gray-400 cursor-help"
                        data-tooltip-id="stats-tooltip"
                        data-tooltip-content="The signatures found in at least one verified contract ABI on Sourcify"
                      />
                    </div>
                    <div className="space-y-1">
                      {stats.function !== undefined && <div>{stats.function.toLocaleString()} functions</div>}
                      {stats.event !== undefined && <div>{stats.event.toLocaleString()} events</div>}
                      {stats.error !== undefined && <div>{stats.error.toLocaleString()} errors</div>}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:border-cerulean-blue-400 hover:shadow-md transition-all duration-200">
                    <div className="text-sm text-gray-400 mb-2 flex items-center justify-center gap-1">
                      Public Submissions
                      <FaQuestionCircle
                        className="w-3 h-3 text-gray-400 cursor-help"
                        data-tooltip-id="stats-tooltip"
                        data-tooltip-content="Signatures without a verified contract on Sourcify. For signatures submitted via the /import endpoint or from other signature databases."
                      />
                    </div>
                    <div>{stats.unknown !== undefined && <span>{stats.unknown.toLocaleString()}</span>}</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:border-cerulean-blue-400 hover:shadow-md transition-all duration-200">
                    <div className="text-sm text-gray-400 mb-2">Total Signatures</div>
                    <div className="font-semibold">
                      {stats.total !== undefined && <span>{stats.total.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-cerulean-blue-600 border-t-transparent"></div>
                <span>Loading stats...</span>
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto mb-8">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg border border-gray-200">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col md:flex-row gap-4 items-stretch md:items-center"
              role="search"
            >
              <div className="flex-1">
                <input
                  type="search"
                  name="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setResults(undefined);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit(e);
                    }
                  }}
                  placeholder="e.g. 'balanceOf(address)' or '0xa9059cbb'"
                  className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-200 transition-all text-sm md:text-base"
                  autoComplete="off"
                  data-1p-ignore
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-400 text-white py-3 px-4 rounded-md transition-colors cursor-pointer whitespace-nowrap text-sm md:text-base"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>

            {/* Example Selectors */}
            <div className="mt-6">
              <div className="text-sm md:text-base font-medium text-gray-800 mb-2 flex items-center gap-1">
                Try Some Examples
                <HiOutlineCursorClick className="w-5 h-5 text-gray-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {exampleSelectors.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example.query)}
                    className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-cerulean-blue-300 p-3 rounded-md transition-all cursor-pointer"
                  >
                    <div className="font-mono text-xs md:text-sm text-gray-900 break-all mb-1">{example.query}</div>
                    <div className="text-xs text-gray-600">{example.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* <div className="mt-6 text-xs md:text-sm text-gray-600 space-y-1">
              <div>
                <b>Text search:</b> Use &apos;*&apos; and &apos;?&apos; for wildcards, case sensitive.
              </div>
              <div>
                <b>0x hash search:</b> Start with &apos;0x&apos;. Search 4byte or full 32 byte hash.
              </div>
              <div>
                <b>?q=0x12345678 in URL:</b> Use the ?q=0x12345678 query parameter for a sharable link.
              </div>
            </div> */}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-8 mb-6 mx-2">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-cerulean-blue-600"></div>
              <span className="ml-3 text-sm md:text-base text-gray-600">Searching...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mx-2">
            <div className="text-red-800 font-medium text-sm md:text-base">Error</div>
            <div className="text-red-700 text-xs md:text-sm mt-1">{error}</div>
          </div>
        )}

        {!loading && results && results.length === 0 && query.trim() && !error && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 mx-2 text-center">
            <div className="text-gray-600 text-sm md:text-base">
              No results found for <span className="font-mono font-semibold">"{query}"</span>
            </div>
            <div className="text-gray-500 text-xs md:text-sm mt-2">
              Try using wildcards (*) or check your search syntax
            </div>
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <>
            <div className="text-xs md:text-sm text-gray-600 px-2 mb-2">
              Showing {results.length} result{results.length > 1 ? "s" : ""}
            </div>
            {results.length && results.length % 100 === 0 && (
              <div className="text-xs md:text-sm text-gray-600 px-2 mb-4">
                Results are limited to 100 for each type. Try to be more specific with the query.
              </div>
            )}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mx-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cerulean-blue-500 text-white">
                    <tr>
                      <th className="py-2 md:py-3 text-center text-xs font-medium uppercase tracking-wider w-16"></th>
                      <th className="py-2 md:py-3 text-left text-xs font-medium uppercase tracking-wider">Hash</th>
                      <th className="pl-2 md:pl-6 py-2 md:py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={`${result.hex_signature}-${index}`} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-center">
                          {result.hasVerifiedContract && (
                            <FaCheckCircle
                              className="w-4 h-4 text-green-600 cursor-help mx-auto"
                              data-tooltip-id="verified-badge-tooltip"
                              data-tooltip-content="This signature is found in at least one verified contract on Sourcify"
                            />
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1 md:gap-2">
                            <span
                              className={`flex items-center gap-1 font-mono text-xs md:text-sm break-all xl:break-normal w-[150px] md:w-[400px] xl:w-auto xl:max-w-none ${
                                result.filtered ? "text-gray-300" : "text-gray-900"
                              }`}
                            >
                              {result.hex_signature}
                              <CopyButton text={result.hex_signature} title="Copy hash" />
                            </span>
                          </div>
                        </td>
                        <td className="pl-2 md:pl-6 py-2">
                          <div className="flex items-center gap-1 md:gap-2">
                            {result.filtered && (
                              <FaBan
                                className="w-4 h-4 text-gray-400 cursor-help"
                                data-tooltip-id="spam-badge-tooltip"
                                data-tooltip-content="This signature has been flagged as potential spam"
                              />
                            )}
                            <span
                              className={`flex items-center gap-1 font-mono text-xs md:text-sm ${
                                result.filtered ? "text-gray-300" : "text-gray-900"
                              }`}
                            >
                              {result.name} <CopyButton text={result.name} title="Copy name" />
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <Tooltip id="stats-tooltip" place="top" className="max-w-sm" />
      <Tooltip id="verified-badge-tooltip" place="top" />
      <Tooltip id="spam-badge-tooltip" place="top" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SearchInterface />
    </Suspense>
  );
}
