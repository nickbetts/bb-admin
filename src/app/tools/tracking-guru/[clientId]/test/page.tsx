"use client";

import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/shadcn/card";
import { ArrowLeft } from "lucide-react";

interface TestPageProps {
  params: Promise<{ clientId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const { clientId } = use(params);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/tools/tracking-guru" className="hover:opacity-70">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Test Tracking</h1>
      </div>

      <Card className="p-6">
        <p className="mb-4 text-neutral-600">
          Coming soon: Send test events and debug tracking pixels
        </p>
        <p className="text-sm text-neutral-500">Client ID: {clientId}</p>
      </Card>
    </div>
  );
}
