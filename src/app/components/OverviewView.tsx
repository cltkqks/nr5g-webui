import { AnalyzerController } from "../types/analyzer";
import { SpectrumPreview } from "./overview/SpectrumPreview";
import { MeasurementGrid } from "./overview/MeasurementGrid";
import { ControlPanel } from "./overview/ControlPanel";
import { SpecificationHighlights } from "./overview/SpecificationHighlights";
import { DualPathStatus } from "./overview/DualPathStatus";
import { ApplicationHighlights } from "./overview/ApplicationHighlights";

interface OverviewViewProps {
  controller: AnalyzerController;
}

export function OverviewView({ controller }: OverviewViewProps) {
  const { state } = controller;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SpectrumPreview state={state} />
        <ControlPanel controller={controller} />
      </div>
      <MeasurementGrid measurements={state.measurements} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <DualPathStatus
          config={state.config}
          acquisitionState={state.acquisitionState}
        />
        <SpecificationHighlights highlights={state.specificationHighlights} />
      </div>
      <ApplicationHighlights modules={state.appModules} />
    </div>
  );
}
