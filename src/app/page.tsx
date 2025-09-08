"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
};

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
  function: number;
  event: number;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchType, setSearchType] = useState<"search" | "lookup">("search");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    // Auto-detect if query starts with 0x for lookup, otherwise search
    const isHexQuery =
      query.trim().toLowerCase().startsWith("0x") || (query.trim().length === 8 && /^[a-fA-F0-9]+$/.test(query.trim()));

    setSearchType(isHexQuery ? "lookup" : "search");

    try {
      const endpoint = isHexQuery ? "/api/lookup" : "/api/search";
      const param = isHexQuery ? "selector" : "query";
      const response = await fetch(`${endpoint}?${param}=${encodeURIComponent(query.trim())}`);
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
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      console.log("Stats data:", data);
      setStats(data.result.count);
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <header className="text-center py-4">
          <div className="flex flex-col items-center justify-center mb-4">
            <h1 className="text-6xl font-bold font-vt323 text-gray-800">4byte.sourcify.dev</h1>
          </div>
          <p className="text-2xl text-gray-800 mx-auto">
            Ethereum function selector database created from Sourcify verified contracts.
          </p>
          <p className="text-gray-600 mx-auto mt-4">
            4byte.sourcify.dev is created from Sourcify verified contracts and follows the{" "}
            <a
              href="https://openchain.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cerulean-blue-600"
            >
              openchain.xyz
            </a>{" "}
            API.
          </p>
          {stats && (
            <div className="mt-4 flex justify-center gap-6 text-sm text-cerulean-blue-600">
              <span>{stats.function.toLocaleString()} functions</span>
              <span>{stats.event.toLocaleString()} events</span>
            </div>
          )}
        </header>

        <div className="mx-auto mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name (e.g. transfer) or by selector (e.g. 0xa9059cbb)"
                  className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-200 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-400 text-white py-3 px-4 rounded-md transition-colors"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Hash
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.slice(0, 50).map((result, index) => (
                    <tr key={`${result.hex_signature}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-900 break-all">{result.hex_signature}</span>
                          <button
                            onClick={() => copyToClipboard(result.hex_signature)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy hash"
                          >
                            <svg
                              className="w-4 h-4 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-900">{result.name}</span>
                          <button
                            onClick={() => copyToClipboard(result.name)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy name"
                          >
                            <svg
                              className="w-4 h-4 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.length > 50 && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                Showing first 50 of {results.length} results
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
