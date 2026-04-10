"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";

const STORAGE_KEY = "i3-favourites";

function getFavourites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setFavourites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

interface FavouriteToggleProps {
  /** Unique ID for the item (e.g. client slug or ID) */
  id: string;
  /** Size in px. Default: 16 */
  size?: number;
  /** Callback when toggled */
  onToggle?: (isFav: boolean) => void;
}

/**
 * Gold star toggle that persists favourites to localStorage.
 * Renders as a filled gold star when active, outline when inactive.
 */
export function FavouriteToggle({ id, size = 16, onToggle }: FavouriteToggleProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(getFavourites().includes(id));
  }, [id]);

  const toggle = useCallback(() => {
    const favs = getFavourites();
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavourites(next);
    const now = next.includes(id);
    setIsFav(now);
    onToggle?.(now);
  }, [id, onToggle]);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={isFav}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isFav ? "scale(1.1)" : "scale(1)",
      }}
    >
      <Star
        style={{
          width: size,
          height: size,
          fill: isFav ? "#f59e0b" : "none",
          color: isFav ? "#f59e0b" : "var(--text-4)",
          transition: "fill 0.2s ease, color 0.2s ease",
        }}
      />
    </button>
  );
}

/**
 * Hook to get and listen for favourite changes.
 * Returns [isFavourite, allFavouriteIds].
 */
export function useFavourites(): string[] {
  const [favs, setFavs] = useState<string[]>(() => getFavourites());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setFavs(getFavourites());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return favs;
}
