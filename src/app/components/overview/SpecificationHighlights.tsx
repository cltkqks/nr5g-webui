import { AnalyzerSpecificationHighlight } from "../../types/analyzer";

interface SpecificationHighlightsProps {
  highlights: AnalyzerSpecificationHighlight[];
}

export function SpecificationHighlights({
  highlights,
}: SpecificationHighlightsProps) {
  return (
    <section className="h-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">
          Specification spotlight
        </h2>
        <p className="text-sm text-slate-400">
          Key metrics that differentiate the SPAX platform.
        </p>
      </header>
      <ul className="flex flex-col gap-4">
        {highlights.map((highlight) => (
          <li
            key={highlight.title}
            className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {highlight.title}
            </p>
            <p className="text-xl font-semibold text-slate-50">
              {highlight.value}
            </p>
            <p className="text-sm text-slate-400">{highlight.caption}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
