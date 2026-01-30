-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create inventory table for food items in stock
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g',
  category TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies for inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Public insert access for inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Public delete access for inventory" ON public.inventory FOR DELETE USING (true);

-- Create updated_at trigger for inventory
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for inventory
CREATE INDEX idx_inventory_category ON public.inventory(category);