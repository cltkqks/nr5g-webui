import { ChangeEvent } from "react";
import { AnalyzerController } from "../../types/analyzer";

interface ControlPanelProps {
  controller: AnalyzerController;
}

const pathOptions = [
  { value: "1RF", label: "1 RF" },
  { value: "2RF", label: "2 RF" },
  { value: "correlation", label: "Correlation" },
] as const;

export function ControlPanel({ controller }: ControlPanelProps) {
  const {
    state: { config, connectionState },
    updateConfig,
    recallPreset,
  } = controller;

  const handleNumberChange = (
    event: ChangeEvent<HTMLInputElement>,
    key: keyof typeof config
  ) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      updateConfig({ [key]: value } as Partial<typeof config>);
    }
  };

  return (
    <section className="flex h-full flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header>
        <h2 className="text-lg font-semibold text-slate-100">
          Control summary
        </h2>
        <p className="text-sm text-slate-400">
          Adjust measurement fundamentals and recall domain-specific presets.
        </p>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-4 text-sm">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Center frequency (GHz)
          </span>
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
            type="number"
            step={0.01}
            value={config.centerFrequencyGHz}
            onChange={(event) =>
              handleNumberChange(event, "centerFrequencyGHz")
            }
            min={0}
            disabled={connectionState === "disconnected"}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Span (GHz)
          </span>
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
            type="number"
            step={0.1}
            value={config.spanGHz}
            onChange={(event) => handleNumberChange(event, "spanGHz")}
            min={0.01}
            disabled={connectionState === "disconnected"}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Analysis bandwidth (GHz)
          </span>
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
            type="number"
            step={0.1}
            value={config.analysisBandwidthGHz}
            onChange={(event) =>
              handleNumberChange(event, "analysisBandwidthGHz")
            }
            min={0.2}
            max={8}
            disabled={connectionState === "disconnected"}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              RBW (kHz)
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
              type="number"
              step={10}
              value={config.rbwKHz}
              onChange={(event) => handleNumberChange(event, "rbwKHz")}
              min={1}
              disabled={connectionState === "disconnected"}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              VBW (kHz)
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
              type="number"
              step={10}
              value={config.vbwKHz}
              onChange={(event) => handleNumberChange(event, "vbwKHz")}
              min={1}
              disabled={connectionState === "disconnected"}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Reference level (dBm)
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
              type="number"
              step={1}
              value={config.referenceLevelDbm}
              onChange={(event) =>
                handleNumberChange(event, "referenceLevelDbm")
              }
              disabled={connectionState === "disconnected"}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Attenuation (dB)
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
              type="number"
              step={1}
              value={config.attenuationDb}
              onChange={(event) => handleNumberChange(event, "attenuationDb")}
              min={0}
              max={70}
              disabled={connectionState === "disconnected"}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Averaging depth
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
              type="number"
              step={10}
              value={config.averagingCount}
              onChange={(event) => handleNumberChange(event, "averagingCount")}
              min={1}
              disabled={connectionState === "disconnected"}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Trigger mode
            </span>
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 focus:border-cyan-400 focus:outline-none"
              value={config.triggerMode}
              onChange={(event) =>
                updateConfig({
                  triggerMode: event.target.value as typeof config.triggerMode,
                })
              }
              disabled={connectionState === "disconnected"}
            >
              <option value="free run">Free run</option>
              <option value="video">Video</option>
              <option value="external">External</option>
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Input path routing
          </span>
          <div className="flex gap-2">
            {pathOptions.map((option) => (
              <button
                key={option.value}
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  config.pathMode === option.value
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
                onClick={() => updateConfig({ pathMode: option.value })}
                disabled={connectionState === "disconnected"}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <footer className="flex flex-col gap-3 border-t border-slate-800 pt-4 text-xs">
        <span className="uppercase tracking-wide text-slate-500">
          Recall presets
        </span>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
            onClick={() => recallPreset("5g-fr2")}
          >
            5G FR2 (28 GHz)
          </button>
          <button
            className="flex-1 rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
            onClick={() => recallPreset("satcom")}
          >
            Satcom (Ka-band)
          </button>
          <button
            className="flex-1 rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
            onClick={() => recallPreset("radar")}
          >
            Automotive radar
          </button>
        </div>
      </footer>
    </section>
  );
}
