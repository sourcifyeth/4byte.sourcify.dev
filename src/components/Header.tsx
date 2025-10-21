"use client";

import Image from "next/image";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { FiExternalLink, FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";

function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-gray-600 hover:text-cerulean-blue-400 transition-colors"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200 md:hidden z-50">
          <div className="flex flex-col p-4 gap-4">
            <Link
              href="/import"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              Import/Submit Signatures
            </Link>
            <Link
              href="https://api.openchain.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium flex items-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              API
              <FiExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://docs.sourcify.dev/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium flex items-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              Docs
              <FiExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://github.com/sourcifyeth/4byte.sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors flex items-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              <FaGithub className="w-5 h-5" />
              GitHub
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function Header() {
  return (
    <>
      {/* Migration Banner */}
      <div className="bg-cerulean-blue-600 text-white py-3 px-4 text-center">
        <div className="max-w-[100rem] mx-auto">
          <p className="text-sm md:text-base">
            📢 <strong>Migration Notice:</strong> Sourcify is taking over{" "}
            <a
              href="https://openchain.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-cerulean-blue-200 underline"
            >
              openchain.xyz
            </a>{" "}
            API . Please switch to <strong>api.4byte.sourcify.dev</strong> (same API).
          </p>
        </div>
      </div>

      <header className="shadow-sm relative">
        <div className="mx-auto py-4 flex items-center justify-between w-full max-w-[100rem] px-6 md:px-12 lg:px-12 xl:px-24">
          <Link href="/" className="flex items-center">
            <Image src="/sourcify.png" alt="Sourcify Logo" className="h-10 w-auto mr-3" width={32} height={32} />
            <span className="text-gray-700 font-vt323 text-2xl">sourcify.eth</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/import" className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium">
              Import/Submit Signatures
            </Link>
            <Link
              href="https://sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium flex items-center gap-1"
            >
              sourcify.dev
              <FiExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://docs.sourcify.dev/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium flex items-center gap-1"
            >
              API
              <FiExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://docs.sourcify.dev/docs/repository/signature-database"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors font-medium flex items-center gap-1"
            >
              Docs
              <FiExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://github.com/sourcifyeth/4byte.sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-cerulean-blue-400 transition-colors"
            >
              <FaGithub className="w-6 h-6" />
            </Link>
          </div>

          {/* Mobile Menu */}
          <MobileMenu />
        </div>
      </header>
    </>
  );
}
