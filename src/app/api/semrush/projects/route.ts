import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export interface SemrushProject {
  projectId: number;
  projectName: string;
  domain: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.SEMRUSH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SEMRUSH_API_KEY not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(
      `https://api.semrush.com/management/v1/projects?key=${apiKey}`
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`SEMrush API error: ${err}`);
    }

    const data = await response.json();

    const projects: SemrushProject[] = data.map(
      (p: { project_id: number; project_name: string; domain_unicode: string }) => ({
        projectId: p.project_id,
        projectName: p.project_name,
        domain: p.domain_unicode,
      })
    );

    projects.sort((a, b) => a.projectName.localeCompare(b.projectName));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("SEMrush projects error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list SEMrush projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
