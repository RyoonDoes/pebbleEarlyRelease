import { Clock, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommandCardProps {
  title: string;
  description: string;
  timeLabel?: string;
  causalNote?: string;
  isPrimary?: boolean;
  onExecute?: () => void;
  onDismiss?: () => void;
}

export function CommandCard({
  title,
  description,
  timeLabel,
  causalNote,
  isPrimary = false,
  onExecute,
  onDismiss,
}: CommandCardProps) {
  return (
    <div
      className={`
        group relative rounded-lg border p-5 transition-smooth
        ${isPrimary 
          ? "border-primary/30 bg-card command-glow animate-pulse-glow" 
          : "border-border bg-card hover:border-primary/20 hover:shadow-md"
        }
      `}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-smooth hover:bg-muted"
        aria-label="Dismiss command"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Time indicator */}
      {timeLabel && (
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLabel}</span>
        </div>
      )}

      {/* Command title */}
      <h3 className={`font-mono font-semibold tracking-tight mb-2 ${isPrimary ? "text-lg text-primary" : "text-base"}`}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {description}
      </p>

      {/* Causal note */}
      {causalNote && (
        <div className="text-xs text-muted-foreground/80 font-mono border-l-2 border-causal-trace-faded pl-3 mb-4">
          {causalNote}
        </div>
      )}

      {/* Action */}
      <Button
        onClick={onExecute}
        variant={isPrimary ? "default" : "outline"}
        size="sm"
        className="w-full group/btn"
      >
        <span>Execute</span>
        <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
      </Button>
    </div>
  );
}
