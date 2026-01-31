import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Types
export interface GoalRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: 'sequence' | 'count' | 'gate' | 'compound';
  rule_config: SequenceConfig | CountConfig | GateConfig | CompoundConfig;
  rolling_window_days: number;
  required_completions: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SequenceConfig {
  events: { name: string; type?: string }[];
  min_hours: number;
  max_hours: number;
}

export interface CountConfig {
  event_pattern: { name: string; type?: string };
  required_count: number;
  rolling_days: number;
}

export interface GateConfig {
  condition: {
    event_name: string;
    min_hours_ago?: number;
    max_hours_ago?: number;
    min_magnitude?: number;
  };
  gated_rule_id: string;
}

export interface CompoundConfig {
  operator: 'AND' | 'OR';
  child_rule_ids: string[];
}

export interface PendingWindow {
  event_a_name: string;
  event_a_time: string;
  window_start: string;
  window_end: string;
  event_a_id: string;
}

export interface GoalEvaluation {
  id: string;
  goal_rule_id: string;
  evaluated_at: string;
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed';
  completions_in_window: number;
  required_in_window: number;
  pending_windows: PendingWindow[];
  last_success_at: string | null;
  last_fail_at: string | null;
  last_fail_reason: string | null;
  confidence: number;
  details: Record<string, unknown>;
}

export interface NormalizedEvent {
  id: string;
  event_type: string;
  event_name: string;
  occurred_at: string;
  magnitude: number | null;
  confidence: number;
  metadata: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

export interface DecisionImpact {
  id: string;
  event_id: string;
  goal_rule_id: string;
  impact_type: 'window_created' | 'window_completed' | 'window_expired' | 'gate_opened' | 'gate_closed';
  impact_details: Record<string, unknown>;
  created_at: string;
}

export interface GoalWithEvaluation {
  rule: GoalRule;
  evaluation: GoalEvaluation | null;
}

export function useGoalTracking() {
  const [goals, setGoals] = useState<GoalWithEvaluation[]>([]);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [impacts, setImpacts] = useState<DecisionImpact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Fetch goals and their latest evaluations
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    
    const { data: rulesData, error: rulesError } = await supabase
      .from('goal_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error("Error fetching goal rules:", rulesError);
      setIsLoading(false);
      return;
    }

    const rules = (rulesData || []) as unknown as GoalRule[];
    const goalsWithEvals: GoalWithEvaluation[] = [];

    for (const rule of rules) {
      const { data: evalData } = await supabase
        .from('goal_evaluations')
        .select('*')
        .eq('goal_rule_id', rule.id)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .single();

      goalsWithEvals.push({
        rule,
        evaluation: evalData as unknown as GoalEvaluation | null
      });
    }

    setGoals(goalsWithEvals);
    setIsLoading(false);
  }, []);

  // Fetch recent events
  const fetchEvents = useCallback(async (days: number = 7) => {
    const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('normalized_events')
      .select('*')
      .gte('occurred_at', windowStart.toISOString())
      .order('occurred_at', { ascending: false });

    if (!error && data) {
      setEvents(data as unknown as NormalizedEvent[]);
    }
  }, []);

  // Fetch decision impacts for an event
  const fetchImpactsForEvent = useCallback(async (eventId: string) => {
    const { data, error } = await supabase
      .from('decision_impacts')
      .select('*')
      .eq('event_id', eventId);

    if (!error && data) {
      return data as unknown as DecisionImpact[];
    }
    return [];
  }, []);

  // Evaluate all goals
  const evaluateGoals = useCallback(async (triggerEventId?: string) => {
    setIsEvaluating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('goal-evaluator', {
        body: { action: 'evaluate', triggerEventId }
      });

      if (error) throw error;

      // Refresh goals after evaluation
      await fetchGoals();
      await fetchEvents();
      
      return data;
    } catch (error) {
      console.error("Error evaluating goals:", error);
      throw error;
    } finally {
      setIsEvaluating(false);
    }
  }, [fetchGoals, fetchEvents]);

  // What-if simulation
  const simulateWhatIf = useCallback(async (hypotheticalEvents: Omit<NormalizedEvent, 'id' | 'created_at'>[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('goal-evaluator', {
        body: { action: 'what_if', hypotheticalEvents }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error simulating what-if:", error);
      throw error;
    }
  }, []);

  // Add a new goal rule
  const addGoalRule = useCallback(async (rule: Omit<GoalRule, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('goal_rules')
      .insert({
        name: rule.name,
        description: rule.description,
        rule_type: rule.rule_type,
        rule_config: rule.rule_config as unknown as Json,
        rolling_window_days: rule.rolling_window_days,
        required_completions: rule.required_completions,
        is_active: rule.is_active,
        priority: rule.priority
      })
      .select()
      .single();

    if (!error && data) {
      await fetchGoals();
      return data as unknown as GoalRule;
    }
    return null;
  }, [fetchGoals]);

  // Update a goal rule
  const updateGoalRule = useCallback(async (id: string, updates: Partial<GoalRule>) => {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.rule_type !== undefined) updateData.rule_type = updates.rule_type;
    if (updates.rule_config !== undefined) updateData.rule_config = updates.rule_config as unknown as Json;
    if (updates.rolling_window_days !== undefined) updateData.rolling_window_days = updates.rolling_window_days;
    if (updates.required_completions !== undefined) updateData.required_completions = updates.required_completions;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.priority !== undefined) updateData.priority = updates.priority;

    const { error } = await supabase
      .from('goal_rules')
      .update(updateData)
      .eq('id', id);

    if (!error) {
      await fetchGoals();
    }
    return { error };
  }, [fetchGoals]);

  // Delete a goal rule
  const deleteGoalRule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('goal_rules')
      .delete()
      .eq('id', id);

    if (!error) {
      setGoals(prev => prev.filter(g => g.rule.id !== id));
    }
    return { error };
  }, []);

  // Add a normalized event
  const addEvent = useCallback(async (event: Omit<NormalizedEvent, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('normalized_events')
      .insert({
        event_type: event.event_type,
        event_name: event.event_name,
        occurred_at: event.occurred_at,
        magnitude: event.magnitude,
        confidence: event.confidence,
        metadata: event.metadata as unknown as Json,
        source_type: event.source_type,
        source_id: event.source_id
      })
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => [data as unknown as NormalizedEvent, ...prev]);
      // Trigger evaluation with this event
      await evaluateGoals(data.id);
      return data as unknown as NormalizedEvent;
    }
    return null;
  }, [evaluateGoals]);

  // Initial fetch
  useEffect(() => {
    fetchGoals();
    fetchEvents();
  }, [fetchGoals, fetchEvents]);

  return {
    goals,
    events,
    impacts,
    isLoading,
    isEvaluating,
    fetchGoals,
    fetchEvents,
    fetchImpactsForEvent,
    evaluateGoals,
    simulateWhatIf,
    addGoalRule,
    updateGoalRule,
    deleteGoalRule,
    addEvent,
  };
}
