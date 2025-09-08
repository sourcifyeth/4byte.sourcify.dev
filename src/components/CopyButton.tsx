"use client";

import { useState } from 'react';
import { MdContentCopy, MdCheck } from 'react-icons/md';
import { Tooltip } from 'react-tooltip';

interface CopyButtonProps {
  text: string;
  title?: string;
  className?: string;
  id?: string;
}

export default function CopyButton({ text, title = "Copy to clipboard", className = "", id }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const buttonId = id || `copy-button-${Math.random().toString(36).substr(2, 9)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        id={buttonId}
        onClick={handleCopy}
        className={`p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer ${className}`}
        data-tooltip-id={buttonId}
        data-tooltip-content={copied ? "Copied!" : title}
      >
        {copied ? (
          <MdCheck className="w-4 h-4 text-green-600" />
        ) : (
          <MdContentCopy className="w-4 h-4 text-gray-500" />
        )}
      </button>
      <Tooltip 
        id={buttonId} 
        place="top" 
        className={copied ? "!bg-green-600" : ""}
      />
    </>
  );
}