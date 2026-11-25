import { cn } from "@/lib/utils";

/** Geometry follows the supplied dark emblem (original coordinates, no rotation).
 * Rounded stroke centerlines preserve its three unequal arcs and open gaps. */
export function AnimatedLogo({ variant = "intro", className }: { variant?: "intro" | "loading"; className?: string }) {
  return <svg className={cn("animated-logo", `animated-logo--${variant}`, className)} viewBox="247 182 350 345" fill="none" aria-hidden="true">
    <g strokeWidth="35" strokeLinecap="round">
      <path className="brand-arc brand-arc--teal" pathLength="1" d="M424 208 C505 209 570 272 570 354 C570 423 524 480 457 498" stroke="var(--brand-turquoise)" />
      <path className="brand-arc brand-arc--coral" pathLength="1" d="M274 326 C284 287 307 257 336 237" stroke="var(--brand-coral)" />
      <path className="brand-arc brand-arc--amber" pathLength="1" d="M273 383 C285 445 334 491 400 501" stroke="var(--brand-amber)" />
    </g>
    <path className="brand-heart" fill="#fff" d="M422 423 C400 405 360 373 360 345 C360 306 401 291 422 325 C443 291 484 306 484 345 C484 373 444 405 422 423Z" />
  </svg>;
}
