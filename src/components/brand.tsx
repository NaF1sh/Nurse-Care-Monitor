import { cn } from "@/lib/utils";

interface BrandProps {
  size?: "sm" | "md" | "lg";
  variant?: "pine" | "sage" | "ink";
  withSubtitle?: boolean;
  className?: string;
}

export function WeCareLogo({
  size = "md",
  variant = "pine",
  withSubtitle = true,
  className,
}: BrandProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      {/* Brand Icon Mark: Minimal, clean, ECG pulse line in Pine / Sage */}
      <span
        className={cn(
          "grid place-items-center rounded-lg font-bold shrink-0 transition-transform duration-200",
          size === "sm" ? "w-7 h-7" : size === "lg" ? "w-10 h-10 rounded-xl" : "w-8 h-8",
          "bg-[#244D45] text-[#C6E2D6]"
        )}
      >
        <svg
          width={size === "sm" ? 16 : size === "lg" ? 22 : 18}
          height={size === "sm" ? 16 : size === "lg" ? 22 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12h4l3-7 4 14 3-7h4" />
        </svg>
      </span>

      {/* Brand Wordmark: Nurse Care Monitor with subtitle */}
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-bold tracking-tight text-[#192C28] flex items-center leading-none",
            size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base"
          )}
        >
          Nurse Care
          <span className="text-[#244D45] ml-1 font-semibold">Monitor</span>
        </span>
        {withSubtitle && (
          <span className="text-[9px] font-semibold tracking-wider text-[#64766E] uppercase mt-0.5">
            CLINICAL WORKSPACE
          </span>
        )}
      </div>
    </div>
  );
}
