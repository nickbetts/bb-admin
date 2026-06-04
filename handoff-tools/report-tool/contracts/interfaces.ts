export interface Report {
  id: string;
  title: string;
  status: "draft" | "review" | "approved" | "published";
}

export interface ReportSection {
  id: string;
  reportId: string;
  type: string;
  title: string;
  position: number;
  visibleBlocks?: string[];
  content?: unknown;
}

export interface ReportStore {
  create(input: { title: string; clientId?: string; createdBy: string }): Promise<Report>;
  getById(reportId: string): Promise<Report | null>;
  listSections(reportId: string): Promise<ReportSection[]>;
  updateSection(sectionId: string, patch: Partial<ReportSection>): Promise<void>;
  reorderSections(reportId: string, orderedSectionIds: string[]): Promise<void>;
}

export interface ScreenshotStorage {
  put(input: {
    reportId: string;
    filename: string;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<{ url: string }>;
  remove(url: string): Promise<void>;
}
