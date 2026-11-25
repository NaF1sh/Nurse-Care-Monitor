import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/routes/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nurse Care Monitor" },
      { name: "description", content: "Hospital nurse stress monitoring and workforce coordination dashboard." },
      { property: "og:title", content: "Dashboard — Nurse Care Monitor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Spot nurse strain early. Support teams sooner." },
    ],
  }),
  component: () => (
    <AppShell title="Dashboard">
      <Dashboard />
    </AppShell>
  ),
});
