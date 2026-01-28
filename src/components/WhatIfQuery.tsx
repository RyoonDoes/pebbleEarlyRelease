import { useState } from "react";
import { ArrowRight, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CausalEffect {
  node: string;
  direction: "increase" | "decrease" | "neutral";
  magnitude: "low" | "medium" | "high";
  mechanism: string;
}

interface WhatIfQueryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatIfQuery({ isOpen, onClose }: WhatIfQueryProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CausalEffect[] | null>(null);

  const handleQuery = () => {
    // Mock causal trace results
    if (query.toLowerCase().includes("coffee") || query.toLowerCase().includes("caffeine")) {
      setResults([
        {
          node: "cortisol_spike",
          direction: "increase",
          magnitude: "medium",
          mechanism: "Caffeine → Adrenal stimulation → Cortisol release"
        },
        {
          node: "iron_absorption",
          direction: "decrease",
          magnitude: "high",
          mechanism: "Polyphenols in coffee → Chelation of non-heme iron → Reduced absorption"
        },
        {
          node: "alertness",
          direction: "increase",
          magnitude: "high",
          mechanism: "Caffeine → Adenosine receptor blocking → Increased wakefulness"
        },
        {
          node: "sleep_quality",
          direction: "decrease",
          magnitude: "medium",
          mechanism: "Caffeine half-life ~5h → Evening consumption → Delayed sleep onset"
        },
      ]);
    } else if (query.trim()) {
      setResults([
        {
          node: "example_node",
          direction: "neutral",
          magnitude: "low",
          mechanism: "No significant causal pathways found in current model"
        },
      ]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/10 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">What-If Query</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-smooth"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Query input */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <Input
              placeholder="What if I drink coffee with breakfast?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              className="flex-1"
            />
            <Button onClick={handleQuery} disabled={!query.trim()}>
              Trace
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ask about any action to see causal downstream effects
          </p>
        </div>

        {/* Results */}
        {results && (
          <div className="p-4 max-h-[400px] overflow-y-auto animate-fade-in">
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">
              Causal Trace Results
            </p>
            
            <div className="space-y-4">
              {results.map((effect, index) => (
                <div key={index} className="causal-edge py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`
                      inline-flex items-center justify-center w-5 h-5 rounded text-xs font-mono font-semibold
                      ${effect.direction === "increase" 
                        ? "bg-warning/20 text-warning" 
                        : effect.direction === "decrease"
                          ? "bg-causal-trace/20 text-causal-trace"
                          : "bg-muted text-muted-foreground"
                      }
                    `}>
                      {effect.direction === "increase" ? "↑" : effect.direction === "decrease" ? "↓" : "−"}
                    </span>
                    <span className="font-mono text-sm font-medium">{effect.node}</span>
                    <span className={`
                      text-xs px-1.5 py-0.5 rounded
                      ${effect.magnitude === "high" 
                        ? "bg-destructive/10 text-destructive" 
                        : effect.magnitude === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }
                    `}>
                      {effect.magnitude}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono pl-7">
                    {effect.mechanism}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Note:</span> These effects are derived from your imported causal model. 
                Pebble does not invent causal relationships.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
