import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAddAction } from "@/lib/queries";
import { ACTION_LABELS, type ActionType } from "@/lib/store";
import { useT, type StringKey } from "@/lib/i18n";

/** Manual action form for one nurse. Staff record actions themselves; nothing is automated. */
export function ActionForm({ nurseId, predictionId }: { nurseId: string; predictionId: string | null }) {
  const t = useT();
  const add = useAddAction();
  const [type, setType] = useState<ActionType>("checked");
  const [note, setNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    add.mutate(
      { nurse_id: nurseId, prediction_id: predictionId, action_type: type, note: note.trim() },
      { onSuccess: () => { setNote(""); setType("checked"); toast.success(t("actionform.saved")); }, onError: (err) => toast.error(err.message) },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-2"><Label>{t("actionform.action")}</Label>
        <RadioGroup value={type} onValueChange={(v) => setType(v as ActionType)}>
          {(Object.keys(ACTION_LABELS) as ActionType[]).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <RadioGroupItem value={k} id={`${nurseId}-${k}`} />
              <Label htmlFor={`${nurseId}-${k}`} className="font-normal">{t(`action.${k}` as StringKey)}</Label>
            </div>
          ))}
        </RadioGroup></div>
      <div className="grid gap-1.5"><Label htmlFor={`${nurseId}-note`}>{t("actionform.notes")}</Label>
        <Textarea id={`${nurseId}-note`} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? t("actionform.saving") : t("actionform.save")}</Button>
    </form>
  );
}
