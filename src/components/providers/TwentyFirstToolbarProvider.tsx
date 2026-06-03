"use client";

import { TwentyFirstToolbar } from "@21st-extension/toolbar-next";
import { ReactPlugin } from "@21st-extension/react";

export function TwentyFirstToolbarProvider() {
  return <TwentyFirstToolbar config={{ plugins: [ReactPlugin] }} />;
}
