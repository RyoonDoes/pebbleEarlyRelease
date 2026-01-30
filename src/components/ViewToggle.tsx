import { LayoutGrid, Calendar, GitBranch, Package, Target, Activity } from "lucide-react";

type ViewType = "command" | "timetable" | "model" | "inventory" | "trackables" | "activity";

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface TabConfig {
  id: ViewType;
  icon: React.ElementType;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "command", icon: LayoutGrid, label: "Commands" },
  { id: "timetable", icon: Calendar, label: "Timetable" },
  { id: "inventory", icon: Package, label: "Inventory" },
  { id: "trackables", icon: Target, label: "Trackables" },
  { id: "activity", icon: Activity, label: "Activity" },
  { id: "model", icon: GitBranch, label: "Model" },
];

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-muted rounded-lg p-1 flex-wrap gap-1">
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-smooth
            ${activeView === id 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
