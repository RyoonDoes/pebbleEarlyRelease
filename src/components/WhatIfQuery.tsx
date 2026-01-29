import { useState } from "react";
import { HelpCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CausalModel } from "@/components/CausalModelImport";
import { toast } from "sonner";

interface WhatIfQueryProps {
  isOpen: boolean;
  onClose: () => void;
  causalModel: CausalModel | null;
}

export function WhatIfQuery({ isOpen, onClose, causalModel }: WhatIfQueryProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResponse("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/causal-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          query, 
          model: causalModel 
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(errorData.error || "Failed to analyze query");
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        throw new Error("No response body");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let fullResponse = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error("What-if query error:", error);
      toast.error("Failed to analyze query. Please try again.");
    } finally {
      setIsLoading(false);
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

        {/* Model status */}
        <div className="px-4 pt-3">
          <div className={`text-xs font-mono px-2 py-1 rounded inline-flex items-center gap-1.5 ${
            causalModel ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${causalModel ? "bg-success" : "bg-muted-foreground"}`} />
            {causalModel 
              ? `Model: ${causalModel.name} (${causalModel.nodes.length} nodes)` 
              : "No model loaded"
            }
          </div>
        </div>

        {/* Query input */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <Input
              placeholder="What if I drink coffee with breakfast?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleQuery} disabled={!query.trim() || isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Trace"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ask about any action to see causal downstream effects
            {causalModel && ` based on your ${causalModel.name} model`}
          </p>
        </div>

        {/* Results */}
        {response && (
          <div className="p-4 max-h-[400px] overflow-y-auto animate-fade-in">
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">
              Causal Analysis
            </p>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/90">
                {response}
              </div>
            </div>

            <div className="mt-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Note:</span> {causalModel 
                  ? "Analysis based on your imported causal model. Pebble traces relationships you defined."
                  : "Import a causal model for more specific node-based analysis."
                }
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !response && (
          <div className="p-8 flex flex-col items-center justify-center gap-3 animate-fade-in">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Tracing causal pathways...</p>
          </div>
        )}
      </div>
    </div>
  );
}
