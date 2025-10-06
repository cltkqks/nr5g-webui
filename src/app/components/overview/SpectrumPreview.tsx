import { AnalyzerState } from "../../types/analyzer";

interface SpectrumPreviewProps {
  state: AnalyzerState;
}

const WIDTH = 780;
const HEIGHT = 260;

export function SpectrumPreview({ state }: SpectrumPreviewProps) {
  const { spectrum, markers, config } = state;

  if (spectrum.length === 0) {
    return null;
  }

  const frequencies = spectrum.map((point) => point.frequency);
  const amplitudes = spectrum.map((point) => point.amplitude);
  const minAmp = Math.min(...amplitudes);
  const maxAmp = Math.max(...amplitudes);
  const freqMin = Math.min(...frequencies);
  const freqMax = Math.max(...frequencies);

  const path = spectrum
    .map((point, index) => {
      const x = ((point.frequency - freqMin) / (freqMax - freqMin)) * WIDTH;
      const y =
        HEIGHT - ((point.amplitude - minAmp) / (maxAmp - minAmp)) * HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Wideband spectrum
          </h2>
          <p className="text-sm text-slate-400">
            Center {config.centerFrequencyGHz.toFixed(2)} GHz • Span{" "}
            {config.spanGHz.toFixed(2)} GHz • BW{" "}
            {config.analysisBandwidthGHz.toFixed(1)} GHz
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {spectrum.length} pts @ {HEIGHT}px render
        </span>
      </header>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-64 w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950"
        >
          <defs>
            <linearGradient id="traceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${WIDTH},${HEIGHT} L 0,${HEIGHT} Z`}
            fill="url(#traceGradient)"
            opacity={0.35}
          />
          <path
            d={path}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {markers.map((marker) => {
            const x =
              ((marker.frequency - freqMin) / (freqMax - freqMin)) * WIDTH;
            const y =
              HEIGHT -
              ((marker.amplitude - minAmp) / (maxAmp - minAmp)) * HEIGHT;
            return (
              <g key={marker.label}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill="#fbbf24"
                  stroke="#0f172a"
                  strokeWidth={2}
                />
                <text
                  x={x + 8}
                  y={Math.max(20, y - 8)}
                  className="text-[10px] font-semibold"
                  fill="#fbbf24"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
