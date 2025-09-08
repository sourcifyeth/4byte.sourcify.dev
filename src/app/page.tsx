"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectorQuery, setSelectorQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [lookupResults, setLookupResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
      const data: ApiResponse = await response.json();

      const results: SearchResult[] = [];
      if (data.result.function) {
        Object.entries(data.result.function).forEach(([hex, sigs]) => {
          sigs.forEach((sig) =>
            results.push({
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
            results.push({
              name: sig.name,
              filtered: sig.filtered,
              hex_signature: hex,
            })
          );
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    }
    setLoading(false);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectorQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/lookup?selector=${encodeURIComponent(selectorQuery)}`);
      const data: ApiResponse = await response.json();

      const results: SearchResult[] = [];
      if (data.result.function) {
        Object.entries(data.result.function).forEach(([hex, sigs]) => {
          sigs.forEach((sig) =>
            results.push({
              name: sig.name,
              filtered: sig.filtered,
              hex_signature: hex,
            })
          );
        });
      }

      setLookupResults(results);
    } catch (error) {
      console.error("Lookup error:", error);
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
            <h1 className="text-5xl font-bold font-vt323 text-gray-800">4byte.sourcify.dev</h1>
          </div>
          <p className="text-xl text-gray-800 mx-auto">
            Ethereum function selector database created from Sourcify verified contracts.
          </p>
          {stats && (
            <div className="mt-4 flex justify-center gap-6 text-sm text-cerulean-blue-600">
              <span>{stats.function.toLocaleString()} functions</span>
              <span>{stats.event.toLocaleString()} events</span>
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg border border-cerulean-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-cerulean-blue-800">Text Search</h2>
            <form onSubmit={handleSearch}>
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. transfer, approve, balanceOf"
                  className="w-full p-3 border border-cerulean-blue-300 rounded-md bg-white text-cerulean-blue-800 focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-200 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-400 text-white py-2 px-4 rounded-md transition-colors font-medium"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg border border-light-coral-200">
            <h2 className="text-xl font-semibold mb-4 text-light-coral-800">0x Selector Lookup</h2>
            <form onSubmit={handleLookup}>
              <div className="mb-4">
                <input
                  type="text"
                  value={selectorQuery}
                  onChange={(e) => setSelectorQuery(e.target.value)}
                  placeholder="e.g. 0xa9059cbb, a9059cbb"
                  className="w-full p-3 border border-light-coral-300 rounded-md bg-white text-light-coral-800 focus:border-light-coral-500 focus:ring-2 focus:ring-light-coral-200 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-light-coral-600 hover:bg-light-coral-700 disabled:bg-light-coral-400 text-white py-2 px-4 rounded-md transition-colors font-medium"
              >
                {loading ? "Looking up..." : "Lookup"}
              </button>
            </form>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg border border-cerulean-blue-200 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-cerulean-blue-800">Search Results</h3>
            <div className="space-y-2">
              {searchResults.slice(0, 10).map((result, index) => (
                <div
                  key={`${result.hex_signature}-${index}`}
                  className="p-3 bg-cerulean-blue-50 rounded border border-cerulean-blue-100"
                >
                  <div className="font-mono text-sm text-cerulean-blue-700 font-medium">{result.name}</div>
                  <div className="text-xs text-cerulean-blue-600 mt-1">{result.hex_signature}</div>
                </div>
              ))}
              {searchResults.length > 10 && (
                <div className="text-sm text-cerulean-blue-600 text-center py-2">
                  Showing first 10 of {searchResults.length} results
                </div>
              )}
            </div>
          </div>
        )}

        {lookupResults.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg border border-light-coral-200">
            <h3 className="text-lg font-semibold mb-4 text-light-coral-800">Lookup Results</h3>
            <div className="space-y-2">
              {lookupResults.map((result, index) => (
                <div
                  key={`${result.hex_signature}-${index}`}
                  className="p-3 bg-light-coral-50 rounded border border-light-coral-100"
                >
                  <div className="font-mono text-sm text-light-coral-700 font-medium">{result.name}</div>
                  <div className="text-xs text-light-coral-600 mt-1">{result.hex_signature}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
