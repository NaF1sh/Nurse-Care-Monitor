import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StressBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllPredictions, useNurses, type Nurse, type Prediction } from "@/lib/queries";
import { fmtTime, isStale } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Prediction Summary — Nurse Stress Monitor" },
      { name: "description", content: "Summary of all AI stress predictions per nurse." },
      { property: "og:title", content: "Prediction Summary — Nurse Stress Monitor" },
      { property: "og:description", content: "Summary of all AI stress predictions per nurse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PredictionsPage />,
});

function PredictionsPage() {
  const t = useT();
  return <AppShell title={t("pred.title")}><Predictions /></AppShell>;
}

function Predictions() {
  const t = useT();
  const nurses = useNurses();
  const preds = useAllPredictions();
  if (nurses.isLoading || preds.isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (nurses.error || preds.error) return <p className="text-sm text-destructive">{t("pred.error")}</p>;

  const all = preds.data ?? [];
  const byNurse = new Map<string, Prediction[]>();
  for (const p of all) {
    const list = byNurse.get(p.nurse_id) ?? [];
    list.push(p);
    byNurse.set(p.nurse_id, list);
  }
  const nurseById = new Map((nurses.data ?? []).map((n) => [n.id, n]));
  const ok = all.filter((p) => p.api_status === "ok");
  const count = (l: string) => ok.filter((p) => p.stress_level === l).length;
  const stats = [
    { label: t("pred.stat.total"), value: all.length, cls: "text-foreground" },
    { label: t("dash.stats.normal"), value: count("normal"), cls: "text-status-normal" },
    { label: t("dash.stats.moderate"), value: count("moderate"), cls: "text-status-moderate" },
    { label: t("dash.stats.high"), value: count("high"), cls: "text-status-high" },
    { label: t("pred.stat.errors"), value: all.length - ok.length, cls: all.length - ok.length ? "text-status-high" : "text-foreground" },
  ];

  const nurseCards = (nurses.data ?? []).filter((n) => n.is_active).map((n) => {
    const list = byNurse.get(n.id) ?? [];
    const latest = list[0];
    const high = list.filter((p) => p.stress_level === "high").length;
    return { n, list, latest, high };
  });

  const recent = all.slice(0, 50);

  return (
    <>
      <p className="text-xs text-muted-foreground">{t("dash.disclaimer")}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 font-mono text-2xl font-semibold", s.cls)}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <h2 className="mt-6 text-base font-semibold">{t("pred.perNurse")}</h2>
      {nurseCards.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t("dash.empty")}</p>}
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nurseCards.map(({ n, list, latest, high }) => (
          <Card key={n.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <Link to="/nurses/$id" params={{ id: n.id }} className="text-primary hover:underline">{n.full_name}</Link>
                </CardTitle>
                <span className="font-mono text-xs text-muted-foreground">{n.nurse_code}</span>
              </div>
              <p className="text-xs text-muted-foreground">{n.ward ?? t("nurses.unassigned")}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <StressBadge level={latest?.stress_level} stale={!!latest && isStale(latest.created_at)} />
                <span className="text-xs text-muted-foreground">{fmtTime(latest?.created_at)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t pt-2 text-xs">
                <div><p className="text-muted-foreground">{t("pred.total")}</p><p className="font-mono font-medium">{list.length}</p></div>
                <div><p className="text-muted-foreground">{t("pred.highCount")}</p><p className={cn("font-mono font-medium", high ? "text-status-high" : undefined)}>{high}</p></div>
                <div><p className="text-muted-foreground">{t("detail.confidence")}</p><p className="font-mono font-medium">{latest?.confidence != null ? `${Math.round(latest.confidence * 100)}%` : "—"}</p></div>
              </div>
              {latest && latest.api_status !== "ok" && <p className="text-xs text-status-high">{t("detail.apiError")}</p>}
              {latest?.model_version && <p className="text-xs text-muted-foreground">{t("detail.modelVersion")}: {latest.model_version}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("pred.recent")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("detail.table.time")}</TableHead>
              <TableHead>{t("actions.table.nurse")}</TableHead>
              <TableHead>{t("detail.table.stress")}</TableHead>
              <TableHead>{t("detail.table.confidence")}</TableHead>
              <TableHead>{t("detail.table.model")}</TableHead>
              <TableHead>{t("detail.table.api")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recent.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("detail.noPredictions")}</TableCell></TableRow>}
              {recent.map((p) => {
                const n: Nurse | undefined = nurseById.get(p.nurse_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-muted-foreground">{fmtTime(p.created_at)}</TableCell>
                    <TableCell>
                      {n ? (
                        <>
                          <Link to="/nurses/$id" params={{ id: n.id }} className="font-medium text-primary hover:underline">{n.full_name}</Link>
                          <div className="font-mono text-xs text-muted-foreground">{n.nurse_code}</div>
                        </>
                      ) : "—"}
                    </TableCell>
                    <TableCell><StressBadge level={p.stress_level} /></TableCell>
                    <TableCell className="font-mono text-sm">{p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.model_version ?? t("detail.notProvided")}</TableCell>
                    <TableCell className={cn("text-sm", p.api_status === "ok" ? "text-muted-foreground" : "text-status-high")}>{p.api_status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
