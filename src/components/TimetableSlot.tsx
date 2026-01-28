import { Check, Clock } from "lucide-react";

interface TimetableSlotProps {
  time: string;
  action: string;
  status: "pending" | "active" | "completed";
  causalImpact?: string;
}

export function TimetableSlot({ time, action, status, causalImpact }: TimetableSlotProps) {
  return (
    <div
      className={`
        flex items-start gap-4 py-3 px-4 rounded-md transition-smooth
        ${status === "active" 
          ? "bg-accent border border-primary/20" 
          : status === "completed"
            ? "opacity-60"
            : "hover:bg-muted/50"
        }
      `}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0 mt-0.5">
        {status === "completed" ? (
          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-success" />
          </div>
        ) : status === "active" ? (
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-border" />
        )}
      </div>

      {/* Time */}
      <div className="flex-shrink-0 w-16">
        <span className="font-mono text-sm text-muted-foreground">{time}</span>
      </div>

      {/* Action */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${status === "completed" ? "line-through" : ""}`}>
          {action}
        </p>
        {causalImpact && status === "active" && (
          <p className="text-xs text-causal-trace mt-1 font-mono">
            → {causalImpact}
          </p>
        )}
      </div>
    </div>
  );
}
