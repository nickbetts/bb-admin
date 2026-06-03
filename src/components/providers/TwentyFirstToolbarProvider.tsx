"use client";

import { TwentyFirstToolbar } from "@21st-extension/toolbar-next";

export function TwentyFirstToolbarProvider() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <TwentyFirstToolbar config={{ plugins: [] }} />;
}
