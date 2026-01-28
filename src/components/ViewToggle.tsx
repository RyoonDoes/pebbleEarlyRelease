import { LayoutGrid, Calendar } from "lucide-react";

type ViewType = "command" | "timetable";

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-muted rounded-lg p-1">
      <button
        onClick={() => onViewChange("command")}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-smooth
          ${activeView === "command" 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
          }
        `}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Commands</span>
      </button>
      
      <button
        onClick={() => onViewChange("timetable")}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-smooth
          ${activeView === "timetable" 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
          }
        `}
      >
        <Calendar className="w-4 h-4" />
        <span>Timetable</span>
      </button>
    </div>
  );
}
