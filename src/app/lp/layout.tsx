/**
 * Layout for public landing pages — strips the default app styling.
 * Landing pages have their own inline CSS, so we don't want globals.css
 * or the Inter font applied.
 */
export default function LPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
