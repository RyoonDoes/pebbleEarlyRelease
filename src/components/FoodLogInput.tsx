import { useState } from "react";
import { Camera, Send, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FoodLogInputProps {
  onSubmit?: (input: string) => void;
}

export function FoodLogInput({ onSubmit }: FoodLogInputProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit?.(input);
      setInput("");
      setIsExpanded(false);
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden transition-smooth">
      {/* Collapsed state */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-smooth"
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Utensils className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Log food intake...</span>
        </button>
      ) : (
        <div className="p-4 space-y-3 animate-fade-in">
          <Textarea
            placeholder="Describe what you ate... e.g., '300g beef mince, pan-fried, with a glass of milk'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[100px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm"
            autoFocus
          />
          
          {/* Preview interpretation */}
          {input.length > 10 && (
            <div className="border-t border-border pt-3 animate-slide-up">
              <p className="text-xs font-mono text-muted-foreground mb-2">PEBBLE INTERPRETATION</p>
              <div className="text-sm text-foreground/80 space-y-1">
                <p>• Food: <span className="text-foreground font-medium">Beef mince (ground beef)</span></p>
                <p>• Weight: <span className="text-foreground font-medium">~300g estimated</span></p>
                <p>• Method: <span className="text-foreground font-medium">Pan-fried (medium heat)</span></p>
                <p className="text-xs text-causal-trace mt-2 font-mono">
                  → Maps to: protein_intake, iron_intake, fat_intake
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Camera className="w-4 h-4 mr-2" />
              Add photo
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInput("");
                  setIsExpanded(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!input.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
