import { FileText, CheckCircle, AlertCircle } from "lucide-react";

interface CausalModelStatusProps {
  modelName?: string;
  nodeCount?: number;
  lastUpdated?: string;
  isLoaded?: boolean;
}

export function CausalModelStatus({
  modelName = "personal_biology_v3.txt",
  nodeCount = 47,
  lastUpdated = "2 days ago",
  isLoaded = true,
}: CausalModelStatusProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border">
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center
        ${isLoaded ? "bg-success/10" : "bg-warning/10"}
      `}>
        <FileText className={`w-4 h-4 ${isLoaded ? "text-success" : "text-warning"}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium truncate">{modelName}</span>
          {isLoaded ? (
            <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {nodeCount} nodes • Updated {lastUpdated}
        </p>
      </div>
    </div>
  );
}
