import { Suspense } from "react";
import { DashboardPage } from "./components/DashboardPage";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <DashboardPage />
    </Suspense>
  );
}
