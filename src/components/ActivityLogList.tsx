import { Utensils, Dumbbell, Pill, Activity, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityLog } from "@/hooks/useTracking";

interface ActivityLogListProps {
  activityLogs: ActivityLog[];
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  exercise: Dumbbell,
  supplement: Pill,
  other: Activity,
};

const ACTIVITY_COLORS: Record<string, string> = {
  food: "bg-green-500/10 text-green-600 border-green-500/20",
  exercise: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  supplement: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function ActivityLogList({ activityLogs }: ActivityLogListProps) {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: false 
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Group by date
  const groupedLogs = activityLogs.reduce((acc, log) => {
    const dateKey = formatDate(log.logged_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  if (activityLogs.length === 0) {
    return (
      <div className="animate-fade-in">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
          Activity Log
        </p>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No activities logged</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Log food, exercise, or other activities
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        Activity Log
      </p>
      
      {Object.entries(groupedLogs).map(([date, logs]) => (
        <div key={date}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
          <div className="space-y-2">
            {logs.map((log) => {
              const Icon = ACTIVITY_ICONS[log.activity_type] || Activity;
              const colorClass = ACTIVITY_COLORS[log.activity_type] || ACTIVITY_COLORS.other;
              
              return (
                <Card key={log.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-md ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{log.description}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.logged_at)}
                          </div>
                        </div>
                        
                        {log.parsed_data && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(log.parsed_data).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {log.inferred_trackables && Object.keys(log.inferred_trackables).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">Inferred nutrients:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(log.inferred_trackables).map(([name, value]) => (
                                <Badge key={name} variant="outline" className="text-xs font-mono">
                                  {name}: {value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
