"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaArrowLeft, FaUpload } from "react-icons/fa";
import { ethers } from "ethers";

// Example data
const examples = {
  raw: `function transfer(address,uint256)
testWithoutType(address,uint256)
function transferFrom(address,address,uint256)
event Transfer(address,address,uint256)
error InsufficientBalance(address)`,
  abi: JSON.stringify([
    {
      constant: false,
      inputs: [
        {
          name: "_from",
          type: "address",
        },
        {
          name: "_to",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      constant: false,
      inputs: [
        {
          name: "_to",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        {
          name: "who",
          type: "address",
        },
      ],
      name: "InsufficientBalance",
      type: "error",
    },
  ]),
};

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_OPENCHAIN_API_URL || "https://api.openchain.xyz";

interface ImportResponseDetails {
  imported: Record<string, string>;
  duplicated: Record<string, string>;
  invalid: string[];
}

interface ImportResponse {
  function: ImportResponseDetails;
  event: ImportResponseDetails;
}

interface ImportRequest {
  function: string[];
  event: string[];
}

function constructRequest(input: string): ImportRequest {
  // First, try to parse as JSON (ABI)
  try {
    const trimmedInput = input.trim();
    if (trimmedInput.startsWith("[") && trimmedInput.endsWith("]")) {
      const abi = JSON.parse(trimmedInput);
      const iface = new ethers.Interface(abi);

      const functions: string[] = [];
      const errors: string[] = [];
      const events: string[] = [];
      iface.forEachFunction((frag) => functions.push(frag.format()));
      iface.forEachError((frag) => errors.push(frag.format()));
      iface.forEachEvent((frag) => events.push(frag.format()));

      console.log(functions, errors, events);

      return {
        function: [...functions, ...errors],
        event: events,
      };
    }
  } catch (e) {
    // Not valid JSON or not a valid ABI, continue with line-by-line parsing
  }

  // Fallback to line-by-line parsing
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .reduce(
      (obj, line) => {
        if (line.startsWith("function ")) {
          obj.function.push(line.substring("function ".length));
        } else if (line.startsWith("error ")) {
          obj.function.push(line.substring("error ".length));
        } else if (line.startsWith("event ")) {
          obj.event.push(line.substring("event ".length));
        } else {
          // Try to detect if it's a function or event signature
          if (line.includes("(") && line.includes(")")) {
            if (line.toLowerCase().includes("event")) {
              obj.event.push(line);
            } else {
              obj.function.push(line);
            }
          }
        }
        return obj;
      },
      { function: [] as string[], event: [] as string[] }
    );
}

export default function ImportPage() {
  const [importData, setImportData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const submitImport = async () => {
    const importDataTrimmed = importData.trim();
    if (importDataTrimmed.length === 0) {
      setError("The import data field is empty, please provide some data.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setResults(null);
    setAlertMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/signature-database/v1/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(constructRequest(importDataTrimmed)),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Import failed");
      }

      const result = data.result as ImportResponse;
      setResults(result);

      const impFunctions = Object.entries(result.function.imported).length;
      const impEvents = Object.entries(result.event.imported).length;
      const dupFunctions = Object.entries(result.function.duplicated).length;
      const dupEvents = Object.entries(result.event.duplicated).length;

      setAlertMessage(
        `Imported ${impFunctions} functions and ${impEvents} events! Skipped ${dupFunctions} functions and ${dupEvents} events.`
      );
    } catch (err: any) {
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    const allResults = [];

    // Add imported signatures (green)
    for (const [sig, hash] of Object.entries(results.function.imported)) {
      allResults.push({ sig, hash, type: "function", status: "imported" });
    }
    for (const [sig, hash] of Object.entries(results.event.imported)) {
      allResults.push({ sig, hash, type: "event", status: "imported" });
    }

    // Add duplicated signatures (gray)
    for (const [sig, hash] of Object.entries(results.function.duplicated)) {
      allResults.push({ sig, hash, type: "function", status: "duplicated" });
    }
    for (const [sig, hash] of Object.entries(results.event.duplicated)) {
      allResults.push({ sig, hash, type: "event", status: "duplicated" });
    }

    // Add invalid signatures (red)
    for (const sig of results.function.invalid || []) {
      allResults.push({ sig, hash: "", type: "function", status: "invalid" });
    }
    for (const sig of results.event.invalid || []) {
      allResults.push({ sig, hash: "", type: "event", status: "invalid" });
    }

    if (allResults.length === 0) return null;

    return (
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cerulean-blue-500 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Signature</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Hash</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allResults.map((result, index) => (
                  <tr
                    key={index}
                    className={`${
                      result.status === "imported"
                        ? "bg-green-50"
                        : result.status === "duplicated"
                        ? "bg-gray-50"
                        : "bg-red-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          result.status === "imported"
                            ? "bg-green-100 text-green-800"
                            : result.status === "duplicated"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.status === "imported"
                          ? "Imported"
                          : result.status === "duplicated"
                          ? "Duplicated"
                          : "Invalid"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-gray-900">{result.sig}</code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-gray-900">{result.hash}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Messages */}
        {alertMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-green-800 text-sm">{alertMessage}</div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-medium text-sm">Error</div>
            <div className="text-red-700 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Import Form */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          {" "}
          {/* Textarea */}
          <div className="mb-6">
            <label htmlFor="import-data" className="block text-sm font-medium text-gray-700 mb-2">
              Signature Data
            </label>
            <textarea
              id="import-data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submitImport();
                }
              }}
              placeholder="Enter data to import or use an example below..."
              className="w-full h-64 p-4 border border-gray-300 rounded-md bg-white text-gray-800 font-mono text-sm focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-200 transition-all resize-y"
              autoComplete="off"
              data-1p-ignore
            />
          </div>
          {/* Examples */}
          <div className="mb-6">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-gray-700">Examples:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setImportData(examples.raw)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors cursor-pointer"
                >
                  Raw
                </button>
                <button
                  onClick={() => setImportData(examples.abi)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors cursor-pointer"
                >
                  ABI
                </button>
              </div>
            </div>
          </div>
          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={submitImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-3 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Importing...
                </>
              ) : (
                <>
                  <FaUpload className="w-4 h-4" />
                  Import Signatures
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {renderResults()}
      </main>
    </div>
  );
}
