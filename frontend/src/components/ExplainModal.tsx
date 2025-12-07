import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

function humanLabel(fname: string) {
  if (!fname) return fname;
  if (fname.startsWith("num__")) return fname.replace("num__", "").replace(/_/g, " ");
  if (fname.startsWith("cat__")) {
    const rest = fname.replace("cat__", "");
    const parts = rest.split("_");
    const col = parts[0];
    const val = parts.slice(1).join("_");
    return `${col.toUpperCase()} = ${val}`;
  }
  return fname.replace(/_/g, " ");
}

interface BarProps {
  value: number;
  scale: number;
}

function Bar({ value, scale }: BarProps) {
  const max = Math.max(scale || 0.1, 1e-6);
  const widthPct = Math.min(100, Math.round((Math.abs(value) / max) * 100));
  const isPositive = value >= 0;

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-32 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isPositive ? 'bg-destructive' : 'bg-success'
          }`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="min-w-[4rem] text-right font-mono text-sm">
        {value >= 0 ? "+" : ""}{Number(value).toFixed(4)}
      </div>
    </div>
  );
}

interface Props {
  explain: any;
  onClose: () => void;
}

export default function ExplainModal({ explain = {}, onClose }: Props) {
  const rawItems = explain.explanations || [];
  const items = useMemo(() => {
    return rawItems.map((it: any) => {
      const { 
        feature, 
        feature_name = feature, 
        shap_value, 
        shapValue = shap_value, 
        value, 
        feature_value = value, 
      } = it;

      return {
        feature: feature_name ?? "unknown",
        shap_value: Number(shapValue ?? shap_value ?? 0), 
        raw_value: feature_value ?? value ?? null 
      };
    });
  }, [explain.explanations]);

  const score = explain.score ?? null;
  const maxAbs = items.length ? Math.max(...items.map((i: any) => Math.abs(i.shap_value) || 0.0001)) : 0.1;

  const plainSummary = useMemo(() => {
    if (!items.length) return "No explanation available.";
    const top = items.slice().sort((a: any, b: any) => Math.abs(b.shap_value) - Math.abs(a.shap_value))[0];
    const sign = top.shap_value >= 0 ? "increases" : "decreases";
    return `${humanLabel(top.feature)} ${sign} predicted risk the most (${Math.abs(top.shap_value).toFixed(4)}).`;
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in"
      onMouseDown={onClose}
    >
      <div 
        className="glass-card max-w-3xl w-full max-h-[90vh] flex flex-col animate-slide-up"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Fraud Explanation</h2>
            {score !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                Fraud Score: <span className="font-mono font-semibold text-primary">{Number(score).toFixed(4)}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-accent/10 border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-foreground">{plainSummary}</p>
          </div>

          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border hover:bg-secondary/70 transition-colors"
                >
                  <div className="flex-1 mr-4">
                    <div className="font-medium text-foreground capitalize mb-1">
                      {humanLabel(item.feature)}
                    </div>
                    {item.raw_value !== null && (
                      <div className="text-xs text-muted-foreground">
                        Value: {item.raw_value}
                      </div>
                    )}
                  </div>
                  <Bar value={item.shap_value} scale={maxAbs} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No feature explanations available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
