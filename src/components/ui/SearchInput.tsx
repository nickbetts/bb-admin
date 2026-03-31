"use client";

import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <div style={{ position: "relative", maxWidth: 320, width: "100%" }}>
      <Search
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          width: 16,
          height: 16,
          color: "var(--text-3)",
          pointerEvents: "none",
        }}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input"
        style={{ paddingLeft: 36 }}
        aria-label={placeholder}
      />
    </div>
  );
}
