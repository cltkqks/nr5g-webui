"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAnalyzer } from "../hooks/useAnalyzer";
import { NAV_ITEMS, TabId, isValidTabId } from "../navigation";
import { AnalyzerHeader } from "./AnalyzerHeader";
import { OverviewView } from "./OverviewView";
import { SideNavigation } from "./SideNavigation";

const SpectrumView = dynamic(
  () => import("./spectrum/SpectrumView").then((m) => m.SpectrumView),
  { loading: () => <div className="text-slate-400">Loading spectrum…</div> }
);
const MeasurementsView = dynamic(
  () =>
    import("./measurements/MeasurementsView").then((m) => m.MeasurementsView),
  { loading: () => <div className="text-slate-400">Loading measurements…</div> }
);
const SetupView = dynamic(
  () => import("./setup/SetupView").then((m) => m.SetupView),
  { loading: () => <div className="text-slate-400">Loading setup…</div> }
);
const ApplicationsView = dynamic(
  () =>
    import("./applications/ApplicationsView").then((m) => m.ApplicationsView),
  { loading: () => <div className="text-slate-400">Loading applications…</div> }
);

const navItems = NAV_ITEMS;

function assertNever(x: never): never {
  throw new Error(`Unhandled tab: ${x as unknown as string}`);
}

export function DashboardPage() {
  const controller = useAnalyzer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const active: TabId = isValidTabId(tabParam) ? tabParam : "overview";
  const handleSelect = (id: TabId) => {
    if (id === active) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const renderView = () => {
    switch (active) {
      case "overview":
        return <OverviewView controller={controller} />;
      case "spectrum":
        return <SpectrumView controller={controller} />;
      case "measurements":
        return <MeasurementsView controller={controller} />;
      case "setup":
        return <SetupView controller={controller} />;
      case "applications":
        return <ApplicationsView controller={controller} />;
      default:
        return assertNever(active as never);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AnalyzerHeader controller={controller} />
      <div className="mx-auto max-w-[1400px] px-6 pb-14">
        <div className="flex flex-col gap-6 pt-8 lg:flex-row">
          <SideNavigation
            items={navItems}
            activeId={active}
            onSelect={handleSelect}
          />
          <main className="flex-1">{renderView()}</main>
        </div>
      </div>
    </div>
  );
}
