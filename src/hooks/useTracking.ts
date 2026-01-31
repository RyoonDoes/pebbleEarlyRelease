import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trackable {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  daily_target: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TrackableValue {
  id: string;
  trackable_id: string;
  value: number;
  source: string | null;
  source_activity_id: string | null;
  logged_at: string;
  notes: string | null;
}

export interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  raw_input: string | null;
  parsed_data: Record<string, unknown> | null;
  inferred_trackables: Record<string, number> | null;
  logged_at: string;
  created_at: string;
}

export function useTracking() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trackables, setTrackables] = useState<Trackable[]>([]);
  const [trackableValues, setTrackableValues] = useState<TrackableValue[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const [inventoryRes, trackablesRes, valuesRes, logsRes] = await Promise.all([
        supabase.from("inventory").select("*").order("name"),
        supabase.from("trackables").select("*").order("name"),
        supabase.from("trackable_values").select("*").order("logged_at", { ascending: false }).limit(100),
        supabase.from("activity_logs").select("*").order("logged_at", { ascending: false }).limit(50),
      ]);

      if (inventoryRes.data) setInventory(inventoryRes.data);
      if (trackablesRes.data) setTrackables(trackablesRes.data);
      if (valuesRes.data) setTrackableValues(valuesRes.data);
      if (logsRes.data) setActivityLogs(logsRes.data as ActivityLog[]);
      
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Inventory operations
  const addInventoryItem = useCallback(async (item: Omit<InventoryItem, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("inventory")
      .insert(item)
      .select()
      .single();
    
    if (data && !error) {
      setInventory(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return { data, error };
  }, []);

  const updateInventoryItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const { data, error } = await supabase
      .from("inventory")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (data && !error) {
      setInventory(prev => prev.map(item => item.id === id ? data : item));
    }
    return { data, error };
  }, []);

  const deleteInventoryItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      setInventory(prev => prev.filter(item => item.id !== id));
    }
    return { error };
  }, []);

  const deductFromInventory = useCallback(async (name: string, amount: number) => {
    const item = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (item) {
      const newQuantity = Math.max(0, item.quantity - amount);
      await updateInventoryItem(item.id, { quantity: newQuantity });
    }
  }, [inventory, updateInventoryItem]);

  // Trackable operations
  const addTrackable = useCallback(async (trackable: Omit<Trackable, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("trackables")
      .insert(trackable)
      .select()
      .single();
    
    if (data && !error) {
      setTrackables(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return { data, error };
  }, []);

  const updateTrackable = useCallback(async (id: string, updates: Partial<Trackable>) => {
    const { data, error } = await supabase
      .from("trackables")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (data && !error) {
      setTrackables(prev => prev.map(t => t.id === id ? data : t));
    }
    return { data, error };
  }, []);

  const deleteTrackable = useCallback(async (id: string) => {
    const { error } = await supabase.from("trackables").delete().eq("id", id);
    if (!error) {
      setTrackables(prev => prev.filter(t => t.id !== id));
    }
    return { error };
  }, []);

  // Log trackable value
  const logTrackableValue = useCallback(async (
    trackableId: string, 
    value: number, 
    source: string = "manual",
    sourceActivityId?: string
  ) => {
    const { data, error } = await supabase
      .from("trackable_values")
      .insert({
        trackable_id: trackableId,
        value,
        source,
        source_activity_id: sourceActivityId,
      })
      .select()
      .single();
    
    if (data && !error) {
      setTrackableValues(prev => [data, ...prev]);
    }
    return { data, error };
  }, []);

  // Activity log operations with optional inventory deductions
  const logActivity = useCallback(async (
    activityType: string,
    description: string,
    rawInput?: string,
    parsedData?: Record<string, unknown>,
    inferredTrackables?: Record<string, number>,
    inventoryDeductions?: Record<string, number>
  ) => {
    const { data, error } = await supabase
      .from("activity_logs")
      .insert([{
        activity_type: activityType,
        description,
        raw_input: rawInput ?? null,
        parsed_data: (parsedData ?? null) as Json,
        inferred_trackables: (inferredTrackables ?? null) as Json,
      }])
      .select()
      .single();
    
    if (data && !error) {
      setActivityLogs(prev => [data as ActivityLog, ...prev]);
      
      // Also log individual trackable values if inferred
      if (inferredTrackables) {
        for (const [trackableName, value] of Object.entries(inferredTrackables)) {
          const trackable = trackables.find(t => 
            t.name.toLowerCase() === trackableName.toLowerCase()
          );
          if (trackable) {
            await logTrackableValue(trackable.id, value, "ai_inferred", data.id);
          }
        }
      }

      // Deduct from inventory if applicable
      if (inventoryDeductions) {
        for (const [itemName, amount] of Object.entries(inventoryDeductions)) {
          await deductFromInventory(itemName, amount);
        }
      }
    }
    return { data: data as ActivityLog | null, error };
  }, [trackables, logTrackableValue, deductFromInventory]);

  // Get today's values for a trackable
  const getTodayTotal = useCallback((trackableId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return trackableValues
      .filter(v => v.trackable_id === trackableId && v.logged_at.startsWith(today))
      .reduce((sum, v) => sum + v.value, 0);
  }, [trackableValues]);

  return {
    inventory,
    trackables,
    trackableValues,
    activityLogs,
    isLoading,
    // Inventory
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    deductFromInventory,
    // Trackables
    addTrackable,
    updateTrackable,
    deleteTrackable,
    logTrackableValue,
    getTodayTotal,
    // Activities
    logActivity,
  };
}
