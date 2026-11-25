import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useT } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — NurseCare Monitor" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Reset password — NurseCare Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const t = useT();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setError(t("reset.mismatch")); return; }
    setBusy(true); setError("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setError(t("reset.failed")); return; }
    toast.success(t("reset.updated"));
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4"><LanguageToggle /></div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <BrandLogo className="mx-auto" />
          <CardTitle className="text-xl">{t("reset.title")}</CardTitle>
          <CardDescription>{ready ? t("reset.ready") : t("reset.notReady")}</CardDescription>
        </CardHeader>
        {ready && (
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="pw">{t("reset.newPassword")}</Label>
                <Input id="pw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pw2">{t("reset.confirmPassword")}</Label>
                <Input id="pw2" type="password" minLength={6} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{t("reset.submit")}</Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
