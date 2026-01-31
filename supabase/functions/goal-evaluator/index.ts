import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface NormalizedEvent {
  id: string;
  event_type: string;
  event_name: string;
  occurred_at: string;
  magnitude: number | null;
  confidence: number;
  metadata: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
}

interface GoalRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: 'sequence' | 'count' | 'gate' | 'compound';
  rule_config: SequenceConfig | CountConfig | GateConfig | CompoundConfig;
  rolling_window_days: number;
  required_completions: number;
  is_active: boolean;
}

interface SequenceConfig {
  events: { name: string; type?: string }[];
  min_hours: number;
  max_hours: number;
}

interface CountConfig {
  event_pattern: { name: string; type?: string };
  required_count: number;
  rolling_days: number;
}

interface GateConfig {
  condition: {
    event_name: string;
    min_hours_ago?: number;
    max_hours_ago?: number;
    min_magnitude?: number;
  };
  gated_rule_id: string;
}

interface CompoundConfig {
  operator: 'AND' | 'OR';
  child_rule_ids: string[];
}

interface PendingWindow {
  event_a_name: string;
  event_a_time: string;
  window_start: string;
  window_end: string;
  event_a_id: string;
}

interface GoalEvaluation {
  goal_rule_id: string;
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

interface DecisionImpact {
  event_id: string;
  goal_rule_id: string;
  impact_type: 'window_created' | 'window_completed' | 'window_expired' | 'gate_opened' | 'gate_closed';
  impact_details: Record<string, unknown>;
}

// Evaluate a sequence rule
function evaluateSequenceRule(
  rule: GoalRule,
  events: NormalizedEvent[],
  now: Date
): { evaluation: Partial<GoalEvaluation>; impacts: DecisionImpact[] } {
  const config = rule.rule_config as SequenceConfig;
  const impacts: DecisionImpact[] = [];
  
  if (config.events.length < 2) {
    return { 
      evaluation: { 
        status: 'off_track', 
        completions_in_window: 0, 
        pending_windows: [],
        last_fail_reason: 'Sequence requires at least 2 events'
      },
      impacts 
    };
  }

  const eventA = config.events[0];
  const eventB = config.events[1];
  const minMs = config.min_hours * 60 * 60 * 1000;
  const maxMs = config.max_hours * 60 * 60 * 1000;
  
  // Get rolling window cutoff
  const windowStart = new Date(now.getTime() - rule.rolling_window_days * 24 * 60 * 60 * 1000);
  
  // Filter events in window
  const windowEvents = events.filter(e => new Date(e.occurred_at) >= windowStart);
  
  // Find all A events
  const aEvents = windowEvents.filter(e => 
    e.event_name.toLowerCase() === eventA.name.toLowerCase() &&
    (!eventA.type || e.event_type === eventA.type)
  ).sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  
  // Find all B events
  const bEvents = windowEvents.filter(e => 
    e.event_name.toLowerCase() === eventB.name.toLowerCase() &&
    (!eventB.type || e.event_type === eventB.type)
  ).sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  
  let completions = 0;
  let lastSuccess: Date | null = null;
  let lastFail: Date | null = null;
  let lastFailReason: string | null = null;
  const pendingWindows: PendingWindow[] = [];
  const usedBEvents = new Set<string>();
  
  // For each A event, check if there's a matching B event in the window
  for (const aEvent of aEvents) {
    const aTime = new Date(aEvent.occurred_at);
    const windowStartTime = new Date(aTime.getTime() + minMs);
    const windowEndTime = new Date(aTime.getTime() + maxMs);
    
    // Find matching B event
    const matchingB = bEvents.find(bEvent => {
      if (usedBEvents.has(bEvent.id)) return false;
      const bTime = new Date(bEvent.occurred_at);
      return bTime >= windowStartTime && bTime <= windowEndTime;
    });
    
    if (matchingB) {
      completions++;
      usedBEvents.add(matchingB.id);
      lastSuccess = new Date(matchingB.occurred_at);
      
      impacts.push({
        event_id: matchingB.id,
        goal_rule_id: rule.id,
        impact_type: 'window_completed',
        impact_details: {
          triggered_by: aEvent.id,
          sequence: [eventA.name, eventB.name],
          window_hours: `${config.min_hours}..${config.max_hours}`
        }
      });
    } else if (windowEndTime > now) {
      // Window is still open
      pendingWindows.push({
        event_a_name: eventA.name,
        event_a_time: aEvent.occurred_at,
        window_start: windowStartTime.toISOString(),
        window_end: windowEndTime.toISOString(),
        event_a_id: aEvent.id
      });
      
      impacts.push({
        event_id: aEvent.id,
        goal_rule_id: rule.id,
        impact_type: 'window_created',
        impact_details: {
          waiting_for: eventB.name,
          window_end: windowEndTime.toISOString()
        }
      });
    } else {
      // Window expired
      lastFail = windowEndTime;
      lastFailReason = `${eventB.name} did not occur within ${config.min_hours}-${config.max_hours}h after ${eventA.name}`;
      
      impacts.push({
        event_id: aEvent.id,
        goal_rule_id: rule.id,
        impact_type: 'window_expired',
        impact_details: {
          expected: eventB.name,
          window_end: windowEndTime.toISOString()
        }
      });
    }
  }
  
  // Determine status
  let status: GoalEvaluation['status'];
  if (completions >= rule.required_completions) {
    status = 'completed';
  } else if (pendingWindows.length > 0) {
    // Check if any pending windows are close to expiring (within 1 hour)
    const atRisk = pendingWindows.some(w => {
      const remaining = new Date(w.window_end).getTime() - now.getTime();
      return remaining < 60 * 60 * 1000; // Less than 1 hour remaining
    });
    status = atRisk ? 'at_risk' : 'on_track';
  } else if (completions > 0) {
    status = 'on_track';
  } else {
    status = 'off_track';
  }
  
  return {
    evaluation: {
      status,
      completions_in_window: completions,
      pending_windows: pendingWindows,
      last_success_at: lastSuccess?.toISOString() || null,
      last_fail_at: lastFail?.toISOString() || null,
      last_fail_reason: lastFailReason,
    },
    impacts
  };
}

// Evaluate a count rule
function evaluateCountRule(
  rule: GoalRule,
  events: NormalizedEvent[],
  now: Date
): { evaluation: Partial<GoalEvaluation>; impacts: DecisionImpact[] } {
  const config = rule.rule_config as CountConfig;
  const impacts: DecisionImpact[] = [];
  
  const windowStart = new Date(now.getTime() - (config.rolling_days || rule.rolling_window_days) * 24 * 60 * 60 * 1000);
  
  const matchingEvents = events.filter(e => 
    new Date(e.occurred_at) >= windowStart &&
    e.event_name.toLowerCase() === config.event_pattern.name.toLowerCase() &&
    (!config.event_pattern.type || e.event_type === config.event_pattern.type)
  );
  
  const count = matchingEvents.length;
  const required = config.required_count || rule.required_completions;
  
  let status: GoalEvaluation['status'];
  if (count >= required) {
    status = 'completed';
  } else if (count >= required * 0.7) {
    status = 'on_track';
  } else if (count >= required * 0.3) {
    status = 'at_risk';
  } else {
    status = 'off_track';
  }
  
  return {
    evaluation: {
      status,
      completions_in_window: count,
      pending_windows: [],
      last_success_at: matchingEvents.length > 0 ? matchingEvents[matchingEvents.length - 1].occurred_at : null,
    },
    impacts
  };
}

// Main evaluation function
async function evaluateAllGoals(
  supabase: SupabaseClient,
  triggerEventId?: string
): Promise<{ evaluations: GoalEvaluation[]; impacts: DecisionImpact[] }> {
  const now = new Date();
  
  // Fetch active goal rules
  const { data: rulesData, error: rulesError } = await supabase
    .from('goal_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });
    
  if (rulesError) throw new Error(`Failed to fetch rules: ${rulesError.message}`);
  
  const rules = (rulesData || []) as GoalRule[];
  if (rules.length === 0) {
    return { evaluations: [], impacts: [] };
  }
  
  // Get max window needed
  const maxDays = Math.max(...rules.map(r => r.rolling_window_days || 7));
  const windowStart = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);
  
  // Fetch events in window
  const { data: eventsData, error: eventsError } = await supabase
    .from('normalized_events')
    .select('*')
    .gte('occurred_at', windowStart.toISOString())
    .order('occurred_at', { ascending: true });
    
  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`);
  
  const events = (eventsData || []) as NormalizedEvent[];
  
  const allEvaluations: GoalEvaluation[] = [];
  const allImpacts: DecisionImpact[] = [];
  
  for (const rule of rules) {
    let result: { evaluation: Partial<GoalEvaluation>; impacts: DecisionImpact[] };
    
    switch (rule.rule_type) {
      case 'sequence':
        result = evaluateSequenceRule(rule, events, now);
        break;
      case 'count':
        result = evaluateCountRule(rule, events, now);
        break;
      default:
        result = { 
          evaluation: { 
            status: 'off_track', 
            completions_in_window: 0, 
            pending_windows: [],
            last_fail_reason: `Unsupported rule type: ${rule.rule_type}`
          }, 
          impacts: [] 
        };
    }
    
    // Calculate average confidence from relevant events
    const relevantEvents = events.filter(e => 
      result.impacts.some(i => i.event_id === e.id)
    );
    const avgConfidence = relevantEvents.length > 0 
      ? relevantEvents.reduce((sum, e) => sum + (e.confidence || 1), 0) / relevantEvents.length
      : 1;
    
    const evaluation: GoalEvaluation = {
      goal_rule_id: rule.id,
      status: result.evaluation.status || 'off_track',
      completions_in_window: result.evaluation.completions_in_window || 0,
      required_in_window: rule.required_completions || 1,
      pending_windows: result.evaluation.pending_windows || [],
      last_success_at: result.evaluation.last_success_at || null,
      last_fail_at: result.evaluation.last_fail_at || null,
      last_fail_reason: result.evaluation.last_fail_reason || null,
      confidence: avgConfidence,
      details: {}
    };
    
    allEvaluations.push(evaluation);
    allImpacts.push(...result.impacts);
  }
  
  // Store evaluations
  for (const evaluation of allEvaluations) {
    await supabase.from('goal_evaluations').insert({
      goal_rule_id: evaluation.goal_rule_id,
      evaluated_at: now.toISOString(),
      status: evaluation.status,
      completions_in_window: evaluation.completions_in_window,
      required_in_window: evaluation.required_in_window,
      pending_windows: evaluation.pending_windows,
      last_success_at: evaluation.last_success_at,
      last_fail_at: evaluation.last_fail_at,
      last_fail_reason: evaluation.last_fail_reason,
      confidence: evaluation.confidence,
      details: evaluation.details
    });
  }
  
  // Store impacts for the trigger event only
  if (triggerEventId) {
    const relevantImpacts = allImpacts.filter(i => i.event_id === triggerEventId);
    for (const impact of relevantImpacts) {
      await supabase.from('decision_impacts').insert({
        event_id: impact.event_id,
        goal_rule_id: impact.goal_rule_id,
        impact_type: impact.impact_type,
        impact_details: impact.impact_details
      });
    }
  }
  
  return { evaluations: allEvaluations, impacts: allImpacts };
}

// What-if simulation
async function simulateWhatIf(
  supabase: SupabaseClient,
  hypotheticalEvents: Omit<NormalizedEvent, 'id' | 'created_at'>[]
): Promise<{ 
  baseline: GoalEvaluation[]; 
  simulated: GoalEvaluation[]; 
  diff: Array<{ goal_id: string; baseline_status: string; simulated_status: string; completions_delta: number }> 
}> {
  const now = new Date();
  
  // Get current state
  const baselineResult = await evaluateAllGoals(supabase);
  
  // Fetch existing events
  const { data: rulesData } = await supabase
    .from('goal_rules')
    .select('*')
    .eq('is_active', true);
    
  const rules = (rulesData || []) as GoalRule[];
  const maxDays = Math.max(...rules.map(r => r.rolling_window_days || 7), 7);
  const windowStart = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);
  
  const { data: existingEventsData } = await supabase
    .from('normalized_events')
    .select('*')
    .gte('occurred_at', windowStart.toISOString())
    .order('occurred_at', { ascending: true });
  
  const existingEvents = (existingEventsData || []) as NormalizedEvent[];
  
  // Add hypothetical events
  const simulatedEvents: NormalizedEvent[] = [
    ...existingEvents,
    ...hypotheticalEvents.map((e, i) => ({
      ...e,
      id: `hypothetical-${i}`,
      created_at: now.toISOString()
    } as NormalizedEvent))
  ].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  
  // Re-evaluate with hypothetical events
  const simulatedEvaluations: GoalEvaluation[] = [];
  for (const rule of rules) {
    let result: { evaluation: Partial<GoalEvaluation>; impacts: DecisionImpact[] };
    
    switch (rule.rule_type) {
      case 'sequence':
        result = evaluateSequenceRule(rule, simulatedEvents, now);
        break;
      case 'count':
        result = evaluateCountRule(rule, simulatedEvents, now);
        break;
      default:
        result = { evaluation: { status: 'off_track', completions_in_window: 0, pending_windows: [] }, impacts: [] };
    }
    
    simulatedEvaluations.push({
      goal_rule_id: rule.id,
      status: result.evaluation.status || 'off_track',
      completions_in_window: result.evaluation.completions_in_window || 0,
      required_in_window: rule.required_completions || 1,
      pending_windows: result.evaluation.pending_windows || [],
      last_success_at: result.evaluation.last_success_at || null,
      last_fail_at: result.evaluation.last_fail_at || null,
      last_fail_reason: result.evaluation.last_fail_reason || null,
      confidence: 1,
      details: {}
    });
  }
  
  // Calculate diff
  const diff = simulatedEvaluations.map(sim => {
    const baseline = baselineResult.evaluations.find(b => b.goal_rule_id === sim.goal_rule_id);
    return {
      goal_id: sim.goal_rule_id,
      baseline_status: baseline?.status || 'unknown',
      simulated_status: sim.status,
      completions_delta: sim.completions_in_window - (baseline?.completions_in_window || 0)
    };
  });
  
  return {
    baseline: baselineResult.evaluations,
    simulated: simulatedEvaluations,
    diff
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, triggerEventId, hypotheticalEvents } = await req.json();
    
    console.log("Goal evaluator action:", action);

    let result: unknown;
    
    switch (action) {
      case 'evaluate':
        result = await evaluateAllGoals(supabase, triggerEventId);
        break;
        
      case 'what_if':
        if (!hypotheticalEvents || hypotheticalEvents.length === 0) {
          throw new Error('hypotheticalEvents required for what_if action');
        }
        result = await simulateWhatIf(supabase, hypotheticalEvents);
        break;
        
      case 'get_status': {
        // Get latest evaluations for all active goals
        const { data: rules } = await supabase
          .from('goal_rules')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false });
          
        const latestEvaluations = [];
        for (const rule of (rules || []) as GoalRule[]) {
          const { data: evalData } = await supabase
            .from('goal_evaluations')
            .select('*')
            .eq('goal_rule_id', rule.id)
            .order('evaluated_at', { ascending: false })
            .limit(1)
            .single();
            
          latestEvaluations.push({
            rule,
            evaluation: evalData || null
          });
        }
        result = { goals: latestEvaluations };
        break;
      }
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Goal evaluator error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
