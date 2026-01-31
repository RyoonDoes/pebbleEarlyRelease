-- Normalized events table (all logs become events)
CREATE TABLE public.normalized_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,  -- e.g. 'training_session', 'meal', 'hormone_peak', 'sleep_episode'
  event_name TEXT NOT NULL,  -- e.g. 'GH_peak', 'protein_meal', 'heavy_lifting'
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  magnitude NUMERIC,  -- optional numeric value (e.g. peak magnitude, intensity)
  confidence NUMERIC DEFAULT 1.0,  -- data quality 0-1
  metadata JSONB DEFAULT '{}',  -- flexible additional data
  source_type TEXT,  -- 'activity_log', 'derived', 'manual'
  source_id UUID,  -- reference to source activity_log if applicable
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal rules table (stores the temporal dependency rules)
CREATE TABLE public.goal_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,  -- 'sequence', 'count', 'gate', 'compound'
  rule_config JSONB NOT NULL,  -- the rule definition
  -- For sequence: {events: [{name, type}], min_hours, max_hours}
  -- For count: {event_pattern: {name, type}, required_count, rolling_days}
  -- For gate: {condition: {...}, gated_rule_id: uuid}
  -- For compound: {operator: 'AND'|'OR', child_rule_ids: [uuid]}
  rolling_window_days INTEGER DEFAULT 7,  -- evaluation window
  required_completions INTEGER DEFAULT 1,  -- how many times to complete in window
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 0,  -- for ordering/display
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal evaluations table (stores computed state, recomputable)
CREATE TABLE public.goal_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_rule_id UUID NOT NULL REFERENCES public.goal_rules(id) ON DELETE CASCADE,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL,  -- 'on_track', 'at_risk', 'off_track', 'completed'
  completions_in_window INTEGER NOT NULL DEFAULT 0,
  required_in_window INTEGER NOT NULL DEFAULT 1,
  pending_windows JSONB DEFAULT '[]',  -- [{event_a_time, window_start, window_end, event_a_name}]
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_fail_at TIMESTAMP WITH TIME ZONE,
  last_fail_reason TEXT,
  confidence NUMERIC DEFAULT 1.0,  -- average of event confidences
  details JSONB DEFAULT '{}'  -- additional evaluation details
);

-- Decision impact records (how each event affected goals)
CREATE TABLE public.decision_impacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.normalized_events(id) ON DELETE CASCADE,
  goal_rule_id UUID NOT NULL REFERENCES public.goal_rules(id) ON DELETE CASCADE,
  impact_type TEXT NOT NULL,  -- 'window_created', 'window_completed', 'window_expired', 'gate_opened', 'gate_closed'
  impact_details JSONB DEFAULT '{}',  -- specifics of the impact
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_normalized_events_type_time ON public.normalized_events(event_type, occurred_at DESC);
CREATE INDEX idx_normalized_events_name_time ON public.normalized_events(event_name, occurred_at DESC);
CREATE INDEX idx_normalized_events_source ON public.normalized_events(source_type, source_id);
CREATE INDEX idx_goal_evaluations_rule ON public.goal_evaluations(goal_rule_id, evaluated_at DESC);
CREATE INDEX idx_decision_impacts_event ON public.decision_impacts(event_id);
CREATE INDEX idx_decision_impacts_goal ON public.decision_impacts(goal_rule_id);

-- Enable RLS
ALTER TABLE public.normalized_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_impacts ENABLE ROW LEVEL SECURITY;

-- Public access policies (same pattern as existing tables)
CREATE POLICY "Public read access for normalized_events" ON public.normalized_events FOR SELECT USING (true);
CREATE POLICY "Public insert access for normalized_events" ON public.normalized_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for normalized_events" ON public.normalized_events FOR UPDATE USING (true);
CREATE POLICY "Public delete access for normalized_events" ON public.normalized_events FOR DELETE USING (true);

CREATE POLICY "Public read access for goal_rules" ON public.goal_rules FOR SELECT USING (true);
CREATE POLICY "Public insert access for goal_rules" ON public.goal_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for goal_rules" ON public.goal_rules FOR UPDATE USING (true);
CREATE POLICY "Public delete access for goal_rules" ON public.goal_rules FOR DELETE USING (true);

CREATE POLICY "Public read access for goal_evaluations" ON public.goal_evaluations FOR SELECT USING (true);
CREATE POLICY "Public insert access for goal_evaluations" ON public.goal_evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for goal_evaluations" ON public.goal_evaluations FOR UPDATE USING (true);
CREATE POLICY "Public delete access for goal_evaluations" ON public.goal_evaluations FOR DELETE USING (true);

CREATE POLICY "Public read access for decision_impacts" ON public.decision_impacts FOR SELECT USING (true);
CREATE POLICY "Public insert access for decision_impacts" ON public.decision_impacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for decision_impacts" ON public.decision_impacts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for decision_impacts" ON public.decision_impacts FOR DELETE USING (true);

-- Trigger for updated_at on goal_rules
CREATE TRIGGER update_goal_rules_updated_at
BEFORE UPDATE ON public.goal_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();