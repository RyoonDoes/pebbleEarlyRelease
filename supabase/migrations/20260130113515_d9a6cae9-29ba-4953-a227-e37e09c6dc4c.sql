-- Create trackables table for things being tracked
CREATE TABLE public.trackables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  unit TEXT DEFAULT 'mg',
  daily_target DECIMAL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies for trackables
ALTER TABLE public.trackables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for trackables" ON public.trackables FOR SELECT USING (true);
CREATE POLICY "Public insert access for trackables" ON public.trackables FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for trackables" ON public.trackables FOR UPDATE USING (true);
CREATE POLICY "Public delete access for trackables" ON public.trackables FOR DELETE USING (true);

-- Create trackable_values for logged values over time
CREATE TABLE public.trackable_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trackable_id UUID NOT NULL REFERENCES public.trackables(id) ON DELETE CASCADE,
  value DECIMAL NOT NULL,
  source TEXT,
  source_activity_id UUID,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS and create policies for trackable_values
ALTER TABLE public.trackable_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for trackable_values" ON public.trackable_values FOR SELECT USING (true);
CREATE POLICY "Public insert access for trackable_values" ON public.trackable_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for trackable_values" ON public.trackable_values FOR UPDATE USING (true);
CREATE POLICY "Public delete access for trackable_values" ON public.trackable_values FOR DELETE USING (true);

-- Create indexes for trackable_values
CREATE INDEX idx_trackable_values_trackable_id ON public.trackable_values(trackable_id);
CREATE INDEX idx_trackable_values_logged_at ON public.trackable_values(logged_at);

-- Create activity_logs for all activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  raw_input TEXT,
  parsed_data JSONB,
  inferred_trackables JSONB,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Public insert access for activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for activity_logs" ON public.activity_logs FOR UPDATE USING (true);
CREATE POLICY "Public delete access for activity_logs" ON public.activity_logs FOR DELETE USING (true);

-- Create indexes for activity_logs
CREATE INDEX idx_activity_logs_type ON public.activity_logs(activity_type);
CREATE INDEX idx_activity_logs_logged_at ON public.activity_logs(logged_at);