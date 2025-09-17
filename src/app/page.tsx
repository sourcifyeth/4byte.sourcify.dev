"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import CopyButton from "@/components/CopyButton";
import Link from "next/link";

interface SearchResult {
  name: string;
  filtered: boolean;
  hex_signature: string;
}

interface ApiResult {
  name: string;
  filtered: boolean;
}

interface ApiResponse {
  ok: boolean;
  result: {
    function?: Record<string, ApiResult[]>;
    event?: Record<string, ApiResult[]>;
  };
}

interface Stats {
  function?: number;
  event?: number;
  error?: number;
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_OPENCHAIN_API_URL || "https://api.openchain.xyz";

// Example selectors for users to try
const exampleSelectors = [
  "0xa9059cbb",
  "transfer*",
  "*Supply*",
  "transferFrom(address,address,uint256)",
  "0xbb757047c2b5f3974fe26b7c10f732e7bce710b0952a71082702781e62ae0595",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchType, setSearchType] = useState<"search" | "lookup">("search");
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    const trimmedQuery = searchQuery.trim();

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

      let param: string;

      if (hexWithoutPrefix.length === 8) {
        // 4-byte function selector
        param = "function";
        setSearchType("lookup");
      } else if (hexWithoutPrefix.length === 64) {
        // 32-byte event hash - search in events
        param = "event";
        setSearchType("lookup");
      } else {
        setError(
          `Invalid hash length. Expected 4 bytes (8 hex chars) for functions or 32 bytes (64 hex chars) for events. Got ${hexWithoutPrefix.length} hex characters.`
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/signature-database/v1/lookup?${param}=${encodeURIComponent(hexQuery)}`
        );
        const data: ApiResponse = await response.json();

        const newResults: SearchResult[] = [];
        if (data.result.function) {
          Object.entries(data.result.function).forEach(([hex, sigs]) => {
            sigs.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
              })
            );
          });
        }
        if (data.result.event) {
          Object.entries(data.result.event).forEach(([hex, sigs]) => {
            sigs.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
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
      setSearchType("search");

      try {
        const response = await fetch(
          `${API_BASE_URL}/signature-database/v1/search?query=${encodeURIComponent(trimmedQuery)}`
        );
        const data: ApiResponse = await response.json();

        const newResults: SearchResult[] = [];
        if (data.result.function) {
          Object.entries(data.result.function).forEach(([hex, sigs]) => {
            sigs.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
              })
            );
          });
        }
        if (data.result.event) {
          Object.entries(data.result.event).forEach(([hex, sigs]) => {
            sigs.forEach((sig) =>
              newResults.push({
                name: sig.name,
                filtered: sig.filtered,
                hex_signature: hex,
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
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  const handleExampleClick = async (example: string) => {
    setQuery(example);
    await performSearch(example);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen py-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-4">
          <div className="flex flex-col justify-center mb-4">
            <h1 className="text-4xl md:text-6xl font-bold font-vt323 text-gray-800">4byte.sourcify.dev</h1>
          </div>
          <p className="text-lg md:text-2xl text-gray-800 mx-auto px-4">
            Ethereum function selector database created from Sourcify verified contracts.
          </p>
          <p className="text-sm md:text-base text-gray-600 mx-auto mt-4 px-4">
            4byte.sourcify.dev is created from Sourcify verified contracts and follows the{" "}
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
          <div className="my-4 text-base md:text-xl flex flex-wrap justify-center gap-4 md:gap-6 text-cerulean-blue-600">
            {stats ? (
              <>
                {stats.function !== undefined && <span>{stats.function.toLocaleString()} functions</span>}
                {stats.event !== undefined && <span>{stats.event.toLocaleString()} events</span>}
                {stats.error !== undefined && <span>{stats.error.toLocaleString()} errors</span>}
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
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 'balanceOf(address)' or '0xa9059cbb'"
                  className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-200 transition-all text-sm md:text-base"
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

            <div className="mt-6 text-xs md:text-sm text-gray-600 space-y-1">
              <div>
                <b>Text search:</b> Use &apos;*&apos; and &apos;?&apos; for wildcards
              </div>
              <div>
                <b>0x hash search:</b> Start with &apos;0x&apos;. Search 4byte or full 32 byte hash.
              </div>
            </div>

            {/* Example Selectors */}
            <div className="mt-6">
              <div className="text-sm md:text-base font-medium text-gray-800 mb-2">Examples</div>
              <div className="flex flex-wrap gap-2">
                {exampleSelectors.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs md:text-sm bg-gray-100 px-2 md:px-4 py-1 md:py-2 hover:bg-gray-200 text-gray-800 transition-colors font-mono cursor-pointer rounded-md break-all"
                  >
                    <span className="font-mono">{example}</span>
                  </button>
                ))}
              </div>
            </div>
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

        {!loading && results.length > 0 && (
          <>
            <div className="text-xs md:text-sm text-gray-600 px-2 mb-2">
              Showing {results.length} result{results.length > 1 ? "s" : ""}
            </div>
            {results.length % 100 === 0 && (
              <div className="text-xs md:text-sm text-gray-600 px-2 mb-4">
                Results are limited to 100 for each type. Try to be more specific with the query.
              </div>
            )}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mx-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cerulean-blue-500 text-white">
                    <tr>
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Hash
                      </th>
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={`${result.hex_signature}-${index}`} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-2 ">
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="font-mono text-xs md:text-sm text-gray-900 break-all xl:break-normal w-[150px] md:w-[400px] xl:w-auto xl:max-w-none">
                              {result.hex_signature}
                            </span>
                            <CopyButton text={result.hex_signature} title="Copy hash" />
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-2">
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="font-mono text-xs md:text-sm text-gray-900">{result.name}</span>
                            <CopyButton text={result.name} title="Copy name" />
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
    </div>
  );
}
