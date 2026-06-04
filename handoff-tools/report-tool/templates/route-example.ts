import { blockOrderIndex, isTextSection } from "../core/report-blocks";
import type { ReportStore } from "../contracts/interfaces";

export async function updateSectionVisibility(input: {
  sectionId: string;
  visibleBlocks: string[];
  store: ReportStore;
}) {
  await input.store.updateSection(input.sectionId, { visibleBlocks: input.visibleBlocks });
  return {
    isTextSection: isTextSection("text_work_complete"),
    firstOrder: blockOrderIndex(input.visibleBlocks, input.visibleBlocks[0] ?? ""),
  };
}
