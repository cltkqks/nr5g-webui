import { AnalyzerController } from "../../types/analyzer";

interface ApplicationsViewProps {
  controller: AnalyzerController;
}

export function ApplicationsView({ controller }: ApplicationsViewProps) {
  const { state } = controller;
  const modules = state.appModules;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-slate-50">Applications</h2>
        <p className="text-sm text-slate-400">
          Explore installed application modules and their availability.
        </p>
      </header>

      {modules.length === 0 ? (
        <p className="text-slate-400">No application modules detected.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-100">
                  {m.name}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                    m.enabled
                      ? "bg-cyan-500/20 text-cyan-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {m.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-sm text-slate-400">{m.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
