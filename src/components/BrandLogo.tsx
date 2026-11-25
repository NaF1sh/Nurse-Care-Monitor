import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "pine" | "sage" | "ink" | "light" | "dark";
  withSubtitle?: boolean;
  compact?: boolean;
  className?: string;
}

/** Official artwork. The compact derivative only removes outer whitespace. */
export function BrandLogo({ size = "md", variant = "light", compact = false, className }: BrandLogoProps) {
  const dark = variant === "dark" || variant === "sage";
  return <span className={cn("brand-logo", `brand-logo--${size}`, compact && "brand-logo--compact", className)}>
    <img src={compact ? "/branding/emblem-compact.webp" : dark ? "/branding/dark-wordmark.webp" : "/branding/wordmark-compact.webp"}
      width={compact ? 860 : dark ? 2172 : 1915} height={compact ? 875 : dark ? 724 : 405}
      alt="NurseCare Monitor by WeCare" decoding="async" />
  </span>;
}
