import type { GrandPlanStore, GrandPlanAiProvider } from "../contracts/interfaces";
import type { GrandPlanSources } from "../core/types";

export async function generateGrandPlanWithAdapters(input: {
  planId: string;
  sources: GrandPlanSources;
  store: GrandPlanStore;
  ai: GrandPlanAiProvider;
}) {
  const generated = await input.ai.generatePlan({ sources: input.sources });
  await input.store.save(input.planId, generated);
  return generated;
}
