import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActions, useLatestPredictions, useNurses, useProfileNames } from "@/lib/queries";
import { fmtTimeSec, type ActionType } from "@/lib/store";
import { useT, type StringKey } from "@/lib/i18n";

export const Route = createFileRoute("/actions")({
  validateSearch: (s: Record<string, unknown>) => ({ nurse: typeof s["nurse"] === "string" ? (s["nurse"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Manual Actions — Nurse Stress Monitor" },
      { name: "description", content: "Record and review supervisor actions." },
      { property: "og:title", content: "Manual Actions — Nurse Stress Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Record and review supervisor actions." },
    ],
  }),
  component: () => <AppShell title="Manual Actions"><Actions /></AppShell>,
});

function Actions() {
  const { nurse: preset } = Route.useSearch();
  const t = useT();
  const nurses = useNurses();
  const preds = useLatestPredictions();
  const actions = useActions();
  const authors = useProfileNames((actions.data ?? []).map((a) => a.created_by));
  const active = (nurses.data ?? []).filter((n) => n.is_active);
  const [nurseId, setNurseId] = useState(preset ?? "");
  useEffect(() => { if (preset) setNurseId(preset); }, [preset]);

  const nurseName = (id: string) => nurses.data?.find((n) => n.id === id)?.full_name ?? "—";

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit">
        <CardHeader><CardTitle className="text-base">{t("actions.record")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-1.5 mb-4"><Label>{t("actions.nurse")}</Label>
            <Select value={nurseId} onValueChange={setNurseId}>
              <SelectTrigger><SelectValue placeholder={t("actions.selectNurse")} /></SelectTrigger>
              <SelectContent>{active.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name} ({n.nurse_code})</SelectItem>)}</SelectContent>
            </Select></div>
          {nurseId ? <ActionForm key={nurseId} nurseId={nurseId} predictionId={preds.data?.get(nurseId)?.id ?? null} />
            : <p className="text-sm text-muted-foreground">{t("actions.selectToRecord")}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("actions.previous")}</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>{t("actions.table.time")}</TableHead><TableHead>{t("actions.table.nurse")}</TableHead><TableHead>{t("actions.table.action")}</TableHead><TableHead>{t("actions.table.notes")}</TableHead><TableHead>{t("actions.table.by")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {(actions.data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("actions.empty")}</TableCell></TableRow>}
            {(actions.data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap text-sm">{fmtTimeSec(a.created_at)}</TableCell>
                <TableCell>{nurseName(a.nurse_id)}</TableCell>
                <TableCell>{t(`action.${a.action_type}` as StringKey)}</TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">{a.note || "—"}</TableCell>
                <TableCell className="text-sm">{authors.data?.get(a.created_by) ?? "…"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
