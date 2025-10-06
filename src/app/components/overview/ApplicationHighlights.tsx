import { AnalyzerAppModule } from "../../types/analyzer";

interface ApplicationHighlightsProps {
  modules: AnalyzerAppModule[];
}

export function ApplicationHighlights({ modules }: ApplicationHighlightsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Application modules
          </h2>
          <p className="text-sm text-slate-400">
            Extend the analyzer with optional measurement personalities.
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {modules.filter((module) => module.enabled).length} active
        </span>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <article
            key={module.id}
            className={`flex h-full flex-col gap-3 rounded-xl border p-4 transition ${
              module.enabled
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                : "border-slate-800 bg-slate-950/60 text-slate-300"
            }`}
          >
            <header className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-tight">
                {module.name}
              </h3>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  module.enabled
                    ? "bg-cyan-400/90 text-slate-900"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {module.enabled ? "Enabled" : "License"}
              </span>
            </header>
            <p className="text-sm leading-relaxed text-inherit">
              {module.summary}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
