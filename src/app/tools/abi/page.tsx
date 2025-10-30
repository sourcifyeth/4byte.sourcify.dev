import Link from "next/link";
import { FiExternalLink, FiArrowRight } from "react-icons/fi";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ABI Decoder - 4byte.sourcify.dev",
  description: "ABI decoder has moved to Swiss Knife calldata decoder",
};

export default function ABIDecoderPage() {
  return (
    <div className="min-h-[60vh] py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold font-vt323 text-gray-800 mb-2">ABI Decoder</h1>
            <p className="text-gray-600">Decode Ethereum calldata and transaction inputs</p>
          </div>

          <div className="bg-cerulean-blue-50 border border-cerulean-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <FiArrowRight className="w-6 h-6 text-cerulean-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">ABI Decoder Has Moved</h2>
                <p className="text-gray-700 mb-4">
                  We no longer maintain openchain.xyz&apos;s ABI decoder. Please use Swiss Knife&apos;s ABI decoder
                  instead.
                </p>
                <a
                  href="https://calldata.swiss-knife.xyz/decoder"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white py-3 px-6 rounded-md transition-colors font-medium"
                >
                  Go to Swiss Knife ABI Decoder
                  <FiExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Other Resources</h3>
            <div className="space-y-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
              >
                <FiArrowRight className="w-4 h-4" />
                Search for function signatures
              </Link>
              <Link
                href="/import"
                className="flex items-center gap-2 text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
              >
                <FiArrowRight className="w-4 h-4" />
                Import/Submit signatures
              </Link>
              <Link
                href="https://docs.sourcify.dev/docs/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
              >
                <FiArrowRight className="w-4 h-4" />
                Sourcify API documentation
                <FiExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
