import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CausalNode {
  id: string;
  label: string;
  type: "input" | "intermediate" | "output" | "goal";
  description?: string;
}

interface CausalEdge {
  from: string;
  to: string;
  type: "amplifies" | "inhibits" | "modulates";
  strength?: "weak" | "moderate" | "strong";
}

interface CausalModel {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, model } = await req.json() as { query: string; model: CausalModel | null };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from causal model
    let modelContext = "";
    if (model && model.nodes.length > 0) {
      const nodesList = model.nodes.map(n => `- ${n.id} (${n.type}): ${n.label}${n.description ? ` - ${n.description}` : ""}`).join("\n");
      const edgesList = model.edges.map(e => `- ${e.from} ${e.type} ${e.to}${e.strength ? ` (${e.strength})` : ""}`).join("\n");
      
      modelContext = `
The user has imported a causal model with the following biological nodes and relationships:

NODES:
${nodesList}

RELATIONSHIPS (edges):
${edgesList}

Use ONLY these nodes and relationships to answer the what-if query. Reference specific node IDs when explaining effects.
`;
    } else {
      modelContext = `
No causal model has been imported yet. Provide a general response and suggest the user imports a causal model for more specific analysis.
`;
    }

    const systemPrompt = `You are Pebble, a causal reasoning assistant for health optimization. You trace downstream effects of actions through biological pathways.

${modelContext}

When answering what-if queries:
1. Identify which nodes in the model are affected by the action
2. Trace the causal chain through edges (amplifies increases, inhibits decreases, modulates changes)
3. Explain each step in the causal pathway
4. Be specific about direction (↑ increase, ↓ decrease) and magnitude (low/medium/high)
5. Keep explanations concise and actionable
6. If no model is loaded, give general guidance and suggest importing a model

Format your response as a structured analysis with clear causal pathways.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("causal-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
