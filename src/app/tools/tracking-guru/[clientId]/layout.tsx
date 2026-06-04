import { redirect } from "next/navigation";

export default async function TrackingGuruLegacyClientLayout() {
  redirect("/tools/tracking-guru");
  return null;
}
