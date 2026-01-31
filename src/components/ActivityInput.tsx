import { useState } from "react";
import { Send, Utensils, Dumbbell, Pill, Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Trackable, InventoryItem } from "@/hooks/useTracking";

interface ActivityInputProps {
  trackables: Trackable[];
  inventory: InventoryItem[];
  onLogActivity: (
    activityType: string,
    description: string,
    rawInput?: string,
    parsedData?: Record<string, unknown>,
    inferredTrackables?: Record<string, number>,
    inventoryDeductions?: Record<string, number>
  ) => Promise<{ data: unknown; error: unknown }>;
}

type ActivityType = "food" | "exercise" | "supplement" | "other";

const ACTIVITY_PLACEHOLDERS: Record<ActivityType, string> = {
  food: "Describe what you ate... e.g., '300g beef mince, pan-fried, with a glass of milk'",
  exercise: "Describe your workout... e.g., '30 min running, 5km at moderate pace'",
  supplement: "What supplements did you take... e.g., '5g creatine, 2000 IU vitamin D'",
  other: "Describe the activity... e.g., 'Sauna for 20 minutes'",
};

export function ActivityInput({ trackables, inventory, onLogActivity }: ActivityInputProps) {
  const [input, setInput] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("food");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Call AI to parse and infer trackable values
      const { data, error } = await supabase.functions.invoke("activity-parser", {
        body: {
          input: input.trim(),
          activityType,
          trackables: trackables.map(t => ({ 
            name: t.name, 
            category: t.category, 
            unit: t.unit 
          })),
          inventory: inventory.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit
          })),
        },
      });

      if (error) {
        console.error("AI parsing error:", error);
        // Log without AI inference
        await onLogActivity(activityType, input.trim(), input.trim());
      } else {
        await onLogActivity(
          activityType,
          data.description || input.trim(),
          input.trim(),
          data.parsed_data,
          data.inferred_trackables,
          data.inventory_deductions
        );
      }
      
      setInput("");
      setIsExpanded(false);
    } catch (err) {
      console.error("Error logging activity:", err);
      // Fallback: log without AI
      await onLogActivity(activityType, input.trim(), input.trim());
      setInput("");
      setIsExpanded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: ActivityType) => {
    switch (type) {
      case "food": return Utensils;
      case "exercise": return Dumbbell;
      case "supplement": return Pill;
      default: return Activity;
    }
  };

  const Icon = getIcon(activityType);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden transition-smooth">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-smooth"
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Log activity...</span>
        </button>
      ) : (
        <div className="p-4 space-y-3 animate-fade-in">
          {/* Activity type tabs */}
          <Tabs value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="food" className="text-xs">
                <Utensils className="w-3 h-3 mr-1" />
                Food
              </TabsTrigger>
              <TabsTrigger value="exercise" className="text-xs">
                <Dumbbell className="w-3 h-3 mr-1" />
                Exercise
              </TabsTrigger>
              <TabsTrigger value="supplement" className="text-xs">
                <Pill className="w-3 h-3 mr-1" />
                Supplement
              </TabsTrigger>
              <TabsTrigger value="other" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Other
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Textarea
            placeholder={ACTIVITY_PLACEHOLDERS[activityType]}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm"
            autoFocus
          />
          
          {/* Hint about AI */}
          <p className="text-xs text-muted-foreground">
            AI will automatically infer nutrient values from your description
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput("");
                setIsExpanded(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Icon className="w-4 h-4 mr-2" />
              )}
              Log
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
