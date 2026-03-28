"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  /** If provided, filters client-side instead of navigating */
  onSearch?: (query: string) => void;
  /** Initial value for the input */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  defaultValue = "",
  placeholder = "Search topics...",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSearch) {
      router.push(`/topics?q=${encodeURIComponent(query)}`);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius)] border py-3 pl-10 pr-4 text-base outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
        }}
      />
    </form>
  );
}
