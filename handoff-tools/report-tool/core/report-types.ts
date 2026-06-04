export interface ReportData {
  title: string;
  period: string;
  client: { name: string; logoUrl: string | null; website: string | null };
  sections: Array<{
    id: string;
    sectionType: string;
    title: string;
    commentary: string | null;
    contentText: string | null;
    enabled: boolean;
  }>;
  screenshots: Array<{
    id: string;
    sectionId: string | null;
    filename: string;
    url: string;
    caption: string | null;
  }>;
}
