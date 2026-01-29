import { useState, useCallback } from "react";
import type { CausalModel } from "@/components/CausalModelImport";

export interface Command {
  id: string;
  title: string;
  description: string;
  timeLabel?: string;
  causalNote?: string;
  isPrimary?: boolean;
}

export interface TimetableEntry {
  id: string;
  time: string;
  action: string;
  status: "pending" | "active" | "completed";
  causalImpact?: string;
}

const initialCommands: Command[] = [
  {
    id: "1",
    title: "EAT THIS NOW",
    description: "300g beef mince + glass of whole milk. Pan-fry the mince with minimal oil.",
    timeLabel: "NOW",
    causalNote: "Protein + iron timing aligned with cortisol trough for optimal absorption",
    isPrimary: true,
  },
  {
    id: "2",
    title: "PREPARE FOR TOMORROW",
    description: "Defrost 400g salmon fillet from freezer. Move to refrigerator section.",
    timeLabel: "Before 10 PM",
    causalNote: "Omega-3 intake scheduled for tomorrow's inflammation window",
    isPrimary: false,
  },
  {
    id: "3",
    title: "HYDRATION CHECK",
    description: "500ml water. You've had 1.2L today, target is 2.5L based on activity level.",
    timeLabel: "Within 2 hours",
    isPrimary: false,
  },
];

const initialTimetable: TimetableEntry[] = [
  { id: "t1", time: "07:00", action: "Morning hydration: 500ml water with lemon", status: "completed", causalImpact: "Cortisol modulation" },
  { id: "t2", time: "08:30", action: "Breakfast: Eggs + spinach + avocado", status: "completed" },
  { id: "t3", time: "12:00", action: "Lunch: 300g beef mince + milk", status: "active", causalImpact: "Iron absorption window" },
  { id: "t4", time: "15:00", action: "Snack: Handful of nuts + dark chocolate", status: "pending" },
  { id: "t5", time: "18:30", action: "Dinner: 200g salmon + vegetables", status: "pending" },
  { id: "t6", time: "21:00", action: "Magnesium supplement + chamomile", status: "pending" },
];

export function usePebbleState() {
  const [commands, setCommands] = useState<Command[]>(initialCommands);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(initialTimetable);
  const [causalModel, setCausalModel] = useState<CausalModel | null>(null);
  const [foodLogs, setFoodLogs] = useState<string[]>([]);

  const executeCommand = useCallback((commandId: string) => {
    const command = commands.find(c => c.id === commandId);
    if (!command) return;

    // Remove from commands
    setCommands(prev => prev.filter(c => c.id !== commandId));

    // Find matching timetable entry and mark as completed
    setTimetable(prev => {
      const updated = prev.map(entry => {
        // Match by checking if command description relates to timetable action
        if (entry.status === "active" && command.description.toLowerCase().includes(entry.action.toLowerCase().split(":")[1]?.trim().split(" ")[0] || "")) {
          return { ...entry, status: "completed" as const };
        }
        return entry;
      });
      
      // Advance next pending to active if current active was completed
      const hasActive = updated.some(e => e.status === "active");
      if (!hasActive) {
        const firstPending = updated.findIndex(e => e.status === "pending");
        if (firstPending !== -1) {
          updated[firstPending] = { ...updated[firstPending], status: "active" as const };
        }
      }
      
      return updated;
    });
  }, [commands]);

  const dismissCommand = useCallback((commandId: string) => {
    setCommands(prev => prev.filter(c => c.id !== commandId));
  }, []);

  const logFood = useCallback((input: string) => {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    
    // Add to food logs
    setFoodLogs(prev => [...prev, input]);

    // Add to timetable as completed entry
    const newEntry: TimetableEntry = {
      id: `log-${Date.now()}`,
      time: timeStr,
      action: `Logged: ${input.slice(0, 50)}${input.length > 50 ? "..." : ""}`,
      status: "completed",
      causalImpact: "Food intake recorded",
    };

    setTimetable(prev => {
      // Insert at appropriate position based on time
      const newList = [...prev, newEntry].sort((a, b) => {
        const timeA = a.time.replace(":", "");
        const timeB = b.time.replace(":", "");
        return parseInt(timeA) - parseInt(timeB);
      });
      return newList;
    });
  }, []);

  const markTimetableComplete = useCallback((entryId: string) => {
    setTimetable(prev => {
      const updated = prev.map(entry => 
        entry.id === entryId ? { ...entry, status: "completed" as const } : entry
      );
      
      // Advance next pending to active
      const hasActive = updated.some(e => e.status === "active");
      if (!hasActive) {
        const firstPending = updated.findIndex(e => e.status === "pending");
        if (firstPending !== -1) {
          updated[firstPending] = { ...updated[firstPending], status: "active" as const };
        }
      }
      
      return updated;
    });
  }, []);

  return {
    commands,
    timetable,
    causalModel,
    foodLogs,
    executeCommand,
    dismissCommand,
    logFood,
    markTimetableComplete,
    setCausalModel,
  };
}
