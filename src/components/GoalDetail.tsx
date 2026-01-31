import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { GoalWithEvaluation, DecisionImpact, NormalizedEvent, SequenceConfig, CountConfig, PendingWindow } from "@/hooks/useGoalTracking";

interface GoalDetailProps {
  goal: GoalWithEvaluation;
  onBack: () => void;
}

export function GoalDetail({ goal, onBack }: GoalDetailProps) {
  const { rule, evaluation } = goal;
  const [impacts, setImpacts] = useState<DecisionImpact[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<NormalizedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Fetch related data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch impacts for this goal
      const { data: impactsData } = await supabase
        .from('decision_impacts')
        .select('*')
        .eq('goal_rule_id', rule.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (impactsData) {
        setImpacts(impactsData as unknown as DecisionImpact[]);
        
        // Fetch related events
        const eventIds = impactsData.map(i => i.event_id);
        if (eventIds.length > 0) {
          const { data: eventsData } = await supabase
            .from('normalized_events')
            .select('*')
            .in('id', eventIds)
            .order('occurred_at', { ascending: false });
          
          if (eventsData) {
            setRelatedEvents(eventsData as unknown as NormalizedEvent[]);
          }
        }
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [rule.id]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (endTime: string) => {
    const remaining = new Date(endTime).getTime() - Date.now();
    if (remaining < 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const renderRuleDescription = () => {
    if (rule.rule_type === 'sequence') {
      const config = rule.rule_config as SequenceConfig;
      return (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{config.events[0]?.name}</span>
          {' → '}
          <span className="font-medium text-foreground">{config.events[1]?.name}</span>
          {' within '}
          <span className="font-mono">{config.min_hours}..{config.max_hours}h</span>
        </div>
      );
    }
    
    if (rule.rule_type === 'count') {
      const config = rule.rule_config as CountConfig;
      return (
        <div className="text-sm text-muted-foreground">
          <span className="font-mono">{config.required_count}x</span>
          {' '}
          <span className="font-medium text-foreground">{config.event_pattern.name}</span>
          {' in '}
          <span className="font-mono">{config.rolling_days}</span>
          {' days'}
        </div>
      );
    }
    
    return null;
  };

  const getImpactIcon = (impactType: string) => {
    switch (impactType) {
      case 'window_completed':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'window_expired':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'window_created':
        return <Minus className="h-4 w-4 text-blue-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{rule.name}</h2>
          {rule.description && (
            <p className="text-sm text-muted-foreground">{rule.description}</p>
          )}
        </div>
        <Badge 
          variant="secondary" 
          className={cn("text-xs", config.bg, config.color)}
        >
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Progress this week</span>
            <span className="text-lg font-mono font-bold">
              {completions}/{required}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="mt-4 pt-4 border-t border-border">
            {renderRuleDescription()}
          </div>
        </CardContent>
      </Card>

      {/* Pending Windows */}
      {pendingWindows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Windows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingWindows.map((window, i) => {
              const remaining = new Date(window.window_end).getTime() - Date.now();
              const isUrgent = remaining < 60 * 60 * 1000;
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "p-3 rounded-lg border",
                    isUrgent ? "border-amber-500/50 bg-amber-500/5" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Waiting for next event
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started: {formatTime(window.event_a_time)}
                      </p>
                    </div>
                    <div className={cn(
                      "text-xs font-mono",
                      isUrgent ? "text-amber-500" : "text-muted-foreground"
                    )}>
                      {getTimeRemaining(window.window_end)}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Decision Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : impacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No decisions have affected this goal yet
            </p>
          ) : (
            <div className="space-y-3">
              {impacts.map((impact, i) => {
                const event = relatedEvents.find(e => e.id === impact.event_id);
                const impactDetails = impact.impact_details as Record<string, unknown>;
                
                return (
                  <div key={impact.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getImpactIcon(impact.impact_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {event?.event_name || 'Unknown event'}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(impact.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {impact.impact_type.replace(/_/g, ' ')}
                        {impactDetails.window_hours && ` (${impactDetails.window_hours}h window)`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failure reason */}
      {evaluation?.last_fail_reason && (
        <Card className="border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">Last Failure</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {evaluation.last_fail_reason}
                </p>
                {evaluation.last_fail_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(evaluation.last_fail_at)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
