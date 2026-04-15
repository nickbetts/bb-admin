/**
 * Animation presets for landing page sections.
 * CSS @keyframes + an IntersectionObserver inject script.
 */

export interface AnimationPreset {
  id: string;
  label: string;
  keyframes: string;
  className: string;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "fade-up",
    label: "Fade Up",
    keyframes: `@keyframes lpFadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }`,
    className: "lp-anim-fade-up",
  },
  {
    id: "fade-in",
    label: "Fade In",
    keyframes: `@keyframes lpFadeIn { from { opacity:0; } to { opacity:1; } }`,
    className: "lp-anim-fade-in",
  },
  {
    id: "slide-left",
    label: "Slide Left",
    keyframes: `@keyframes lpSlideLeft { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`,
    className: "lp-anim-slide-left",
  },
  {
    id: "slide-right",
    label: "Slide Right",
    keyframes: `@keyframes lpSlideRight { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }`,
    className: "lp-anim-slide-right",
  },
  {
    id: "scale-in",
    label: "Scale In",
    keyframes: `@keyframes lpScaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }`,
    className: "lp-anim-scale-in",
  },
  {
    id: "blur-in",
    label: "Blur In",
    keyframes: `@keyframes lpBlurIn { from { opacity:0; filter:blur(8px); } to { opacity:1; filter:blur(0); } }`,
    className: "lp-anim-blur-in",
  },
];

const ANIM_MAP: Record<string, AnimationPreset> = {};
for (const p of ANIMATION_PRESETS) ANIM_MAP[p.id] = p;

/**
 * Generate the CSS and JS to inject into a landing page for animations.
 * Only includes keyframes that are actually used in the page.
 */
export function getAnimationInjectionCode(html: string): string {
  const usedAnims = new Set<string>();
  const matches = html.matchAll(/data-animate="([^"]+)"/g);
  for (const m of matches) usedAnims.add(m[1]);

  if (usedAnims.size === 0) return "";

  const keyframeCss: string[] = [];
  const classCss: string[] = [];

  for (const id of usedAnims) {
    const preset = ANIM_MAP[id];
    if (!preset) continue;
    keyframeCss.push(preset.keyframes);
    classCss.push(
      `[data-animate="${id}"] { opacity:0; }`,
      `[data-animate="${id}"].lp-anim-visible { animation: ${preset.keyframes.match(/@keyframes (\w+)/)?.[1]} 0.6s ease forwards; }`
    );
  }

  const css = `<style data-lp-animations="true">\n${keyframeCss.join("\n")}\n${classCss.join("\n")}\n</style>`;

  const js = `<script data-lp-animations="true">
(function() {
  if (window.__lpAnimInit) return;
  window.__lpAnimInit = true;
  var els = document.querySelectorAll('[data-animate]');
  if (!els.length) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('lp-anim-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function(el) { observer.observe(el); });
})();
</script>`;

  return css + "\n" + js;
}

/**
 * Inject animation CSS + JS into an LP's HTML, or update existing.
 */
export function injectAnimations(html: string): string {
  // Remove existing animation injection
  let cleaned = html.replace(/<style data-lp-animations="true">[\s\S]*?<\/style>/g, "");
  cleaned = cleaned.replace(/<script data-lp-animations="true">[\s\S]*?<\/script>/g, "");

  const code = getAnimationInjectionCode(cleaned);
  if (!code) return cleaned;

  if (cleaned.includes("</body>")) {
    return cleaned.replace("</body>", `${code}\n</body>`);
  }
  return cleaned + code;
}
