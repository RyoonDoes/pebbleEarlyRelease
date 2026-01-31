import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ChevronRight,
  Plus,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalWithEvaluation, PendingWindow } from "@/hooks/useGoalTracking";

interface GoalCardProps {
  goal: GoalWithEvaluation;
  onSelect: (goalId: string) => void;
}

function GoalCard({ goal, onSelect }: GoalCardProps) {
  const { rule, evaluation } = goal;
  
  const status = evaluation?.status || 'off_track';
  const completions = evaluation?.completions_in_window || 0;
  const required = evaluation?.required_in_window || rule.required_completions;
  const progress = required > 0 ? (completions / required) * 100 : 0;
  const pendingWindows = (evaluation?.pending_windows || []) as PendingWindow[];
  
  const statusConfig = {
    completed: { 
      icon: CheckCircle2, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10',
      label: 'Completed' 
    },
    on_track: { 
      icon: Target, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      label: 'On Track' 
    },
    at_risk: { 
      icon: AlertTriangle, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10',
      label: 'At Risk' 
    },
    off_track: { 
      icon: XCircle, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10',
      label: 'Off Track' 
    },
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  // Calculate time remaining for at-risk windows
  const getTimeRemaining = (window: PendingWindow) => {
    const remaining = new Date(window.window_end).getTime() - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSelect(rule.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon className={cn("h-4 w-4", config.color)} />
              <h3 className="font-medium text-sm truncate">{rule.name}</h3>
            </div>
            
            {rule.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                {rule.description}
              </p>
            )}
            
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress value={progress} className="h-1.5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {completions}/{required}
              </span>
            </div>
            
            {pendingWindows.length > 0 && status === 'at_risk' && (
              <div className="flex items-center gap-1 mt-2">
                <Clock className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-500">
                  {getTimeRemaining(pendingWindows[0])} remaining
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="secondary" 
              className={cn("text-[10px] px-1.5", config.bg, config.color)}
            >
              {config.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GoalListProps {
  goals: GoalWithEvaluation[];
  isLoading: boolean;
  isEvaluating: boolean;
  onSelectGoal: (goalId: string) => void;
  onRefresh: () => void;
  onAddGoal: () => void;
}

export function GoalList({ 
  goals, 
  isLoading, 
  isEvaluating,
  onSelectGoal, 
  onRefresh,
  onAddGoal 
}: GoalListProps) {
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'off_track'>('all');
  
  const filteredGoals = goals.filter(g => {
    if (filter === 'all') return true;
    return g.evaluation?.status === filter;
  });

  const atRiskCount = goals.filter(g => g.evaluation?.status === 'at_risk').length;
  const offTrackCount = goals.filter(g => g.evaluation?.status === 'off_track').length;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({goals.length})
          </Button>
          {atRiskCount > 0 && (
            <Button
              variant={filter === 'at_risk' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('at_risk')}
              className="text-amber-500"
            >
              At Risk ({atRiskCount})
            </Button>
          )}
          {offTrackCount > 0 && (
            <Button
              variant={filter === 'off_track' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('off_track')}
              className="text-red-500"
            >
              Off Track ({offTrackCount})
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isEvaluating}
          >
            <RefreshCw className={cn("h-4 w-4", isEvaluating && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddGoal}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Goal
          </Button>
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {goals.length === 0 
                ? "No goals configured yet" 
                : "No goals match this filter"
              }
            </p>
            {goals.length === 0 && (
              <Button variant="link" size="sm" onClick={onAddGoal}>
                Create your first goal
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map(goal => (
            <GoalCard 
              key={goal.rule.id} 
              goal={goal} 
              onSelect={onSelectGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
