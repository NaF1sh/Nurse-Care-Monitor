import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { SplashScreen, splashBootstrap, SPLASH_KEY } from "@/components/SplashScreen";

function boot(reduced = false) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
  // Execute the exact pre-paint bootstrap shipped in the document head.
  window.eval(splashBootstrap);
}
beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); localStorage.clear(); delete document.documentElement.dataset["ncmIntro"]; delete document.documentElement.dataset["ncmDeadline"]; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("official brand introduction", () => {
  it("starts only once in a session, and releases the document by 1780ms without hydration", () => {
    boot(); expect(sessionStorage.getItem(SPLASH_KEY)).toBe("1");
    expect(document.documentElement.dataset["ncmIntro"]).toBe("true");
    vi.advanceTimersByTime(1780); expect(document.documentElement.dataset["ncmIntro"]).toBeUndefined();
    boot(); expect(document.documentElement.dataset["ncmIntro"]).toBeUndefined();
  });
  it("mounts application content during the intro and does not replay on remount", () => {
    boot(); const app=render(<LanguageProvider><button>Application ready</button><SplashScreen /></LanguageProvider>);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByTestId("brand-splash")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1780)); expect(screen.queryByTestId("brand-splash")).toBeNull();
    app.unmount(); boot(); render(<LanguageProvider><SplashScreen /></LanguageProvider>);
    expect(screen.queryByTestId("brand-splash")).toBeNull();
  });
  it("releases reduced motion after a short 120ms introduction", () => {
    boot(true); vi.advanceTimersByTime(120); expect(document.documentElement.dataset["ncmIntro"]).toBeUndefined();
  });
  it("uses the approved Bangla tagline", () => {
    localStorage.setItem("nsm-lang", "bn"); boot(); render(<LanguageProvider><SplashScreen /></LanguageProvider>);
    expect(screen.getByText("যাঁরা যত্ন নেন, আমরা তাঁদের যত্ন নিই")).toBeInTheDocument();
  });
  it("still releases the document when storage is denied", () => {
    vi.spyOn(Storage.prototype,"getItem").mockImplementation(() => { throw new Error("denied"); });
    boot(); vi.advanceTimersByTime(1780); expect(document.documentElement.dataset["ncmIntro"]).toBeUndefined();
  });
});
