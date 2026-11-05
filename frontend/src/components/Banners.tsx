import { AlertTriangle, X } from "lucide-react";

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="bg-red-50 border-l-4 border-red-500 p-4 m-4 flex items-start gap-3">
      <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
      <p className="text-sm text-red-800 font-medium flex-1">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss error" className="text-red-500 hover:text-red-700">
        <X size={18} />
      </button>
    </div>
  );
}

export function MissingSoilBanner({ sites }: { sites: string[] }) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 flex items-start gap-3">
      <AlertTriangle className="text-yellow-500 mt-0.5 shrink-0" size={20} />
      <div>
        <p className="text-sm text-yellow-800 font-medium">SoilGrids returned null for: {sites.join(", ")}.</p>
        <p className="text-sm text-yellow-700 mt-1">
          The map has no value at that exact point (water, a built-up area, or a gap in the map). The request still
          succeeded; try moving the point slightly.
        </p>
      </div>
    </div>
  );
}
