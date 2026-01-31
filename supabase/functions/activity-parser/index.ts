import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackableInfo {
  name: string;
  category: string | null;
  unit: string | null;
}

interface InventoryItem {
  name: string;
  quantity: number;
  unit: string;
}

interface ParseRequest {
  input: string;
  activityType: string;
  trackables: TrackableInfo[];
  inventory: InventoryItem[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { input, activityType, trackables, inventory }: ParseRequest = await req.json();
    
    console.log("Parsing activity:", { input, activityType, trackablesCount: trackables.length, inventoryCount: inventory?.length || 0 });

    const trackablesList = trackables.map(t => `- ${t.name} (${t.category || 'custom'}, measured in ${t.unit || 'units'})`).join('\n');
    
    const inventoryList = inventory?.length 
      ? inventory.map(i => `- ${i.name}: ${i.quantity} ${i.unit}`).join('\n')
      : 'No inventory items';

    const systemPrompt = `You are a nutrition and activity analysis AI. Your job is to parse user activity descriptions and infer trackable nutrient/compound values.

Given an activity description, extract:
1. A clean description of the activity
2. Structured data about the activity (food type, weight, cooking method for food; duration, intensity for exercise, etc.)
3. Inferred values for tracked nutrients/compounds based on standard nutritional databases
4. For food activities: identify which inventory items were consumed and in what amounts

The user is currently tracking these items:
${trackablesList}

The user's current food inventory:
${inventoryList}

IMPORTANT: 
- Only infer values for trackables that are actually in the list above. Be conservative with estimates.
- For inventory deductions: match food items mentioned to inventory by name (fuzzy match - e.g., "beef" matches "Beef Mince", "Ground Beef", etc.)
- Only include inventory deductions for FOOD activities

For food activities, consider:
- Cooking methods affect nutrient availability (e.g., boiling reduces some vitamins, pan-frying retains more fat)
- Weight/portion size affects absolute amounts
- Different cuts/types of food have different nutrient profiles

Respond ONLY with valid JSON in this exact format:
{
  "description": "Clean, concise description of the activity",
  "parsed_data": {
    "type": "food|exercise|supplement|other",
    "details": {} // activity-specific structured data
  },
  "inferred_trackables": {
    // Only include trackables from the provided list
    // Use the exact trackable name as key, numeric value as value
    // e.g., "Protein": 25, "Iron": 3.5
  },
  "inventory_deductions": {
    // For food activities only: map inventory item names to amounts consumed
    // Use the EXACT inventory item name as the key
    // e.g., "Beef Mince": 300, "Whole Milk": 250
  }
}`;

    const userPrompt = `Parse this ${activityType} activity: "${input}"

Remember to only include trackables from the provided list, match inventory items by name, and be conservative with estimates.`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response:", content);

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate that inferred_trackables only contains tracked items
    const validTrackables: Record<string, number> = {};
    if (parsed.inferred_trackables) {
      for (const [name, value] of Object.entries(parsed.inferred_trackables)) {
        const isTracked = trackables.some(t => 
          t.name.toLowerCase() === name.toLowerCase()
        );
        if (isTracked && typeof value === 'number') {
          validTrackables[name] = value;
        }
      }
    }

    // Validate inventory deductions against actual inventory
    const validDeductions: Record<string, number> = {};
    if (parsed.inventory_deductions && inventory?.length) {
      for (const [name, amount] of Object.entries(parsed.inventory_deductions)) {
        const inventoryItem = inventory.find(i => 
          i.name.toLowerCase() === name.toLowerCase()
        );
        if (inventoryItem && typeof amount === 'number' && amount > 0) {
          validDeductions[inventoryItem.name] = amount; // Use exact inventory name
        }
      }
    }

    const result = {
      description: parsed.description || input,
      parsed_data: parsed.parsed_data || { type: activityType },
      inferred_trackables: validTrackables,
      inventory_deductions: validDeductions,
    };

    console.log("Parsed result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error parsing activity:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      description: null,
      parsed_data: null,
      inferred_trackables: {},
      inventory_deductions: {},
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
