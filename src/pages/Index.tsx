import { useState } from "react";
import { Header } from "@/components/Header";
import { ViewToggle } from "@/components/ViewToggle";
import { CommandCard } from "@/components/CommandCard";
import { TimetableSlot } from "@/components/TimetableSlot";
import { FoodLogInput } from "@/components/FoodLogInput";
import { CausalModelStatus } from "@/components/CausalModelStatus";
import { WhatIfQuery } from "@/components/WhatIfQuery";
import { CausalModelImport, type CausalModel } from "@/components/CausalModelImport";
import { CausalModelView } from "@/components/CausalModelView";

type ViewType = "command" | "timetable" | "model";

const mockCommands = [
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

const mockTimetable = [
  { time: "07:00", action: "Morning hydration: 500ml water with lemon", status: "completed" as const, causalImpact: "Cortisol modulation" },
  { time: "08:30", action: "Breakfast: Eggs + spinach + avocado", status: "completed" as const },
  { time: "12:00", action: "Lunch: 300g beef mince + milk", status: "active" as const, causalImpact: "Iron absorption window" },
  { time: "15:00", action: "Snack: Handful of nuts + dark chocolate", status: "pending" as const },
  { time: "18:30", action: "Dinner: 200g salmon + vegetables", status: "pending" as const },
  { time: "21:00", action: "Magnesium supplement + chamomile", status: "pending" as const },
];

export default function Index() {
  const [activeView, setActiveView] = useState<ViewType>("command");
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [commands, setCommands] = useState(mockCommands);
  const [causalModel, setCausalModel] = useState<CausalModel | null>(null);

  const handleDismissCommand = (id: string) => {
    setCommands(commands.filter(cmd => cmd.id !== id));
  };

  const handleExecuteCommand = (id: string) => {
    setCommands(commands.filter(cmd => cmd.id !== id));
  };

  const handleFoodLog = (input: string) => {
    console.log("Food logged:", input);
    // In real app, this would process and update state
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onWhatIfClick={() => setIsWhatIfOpen(true)} />
      
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Model status */}
        <CausalModelStatus 
          modelName={causalModel?.name ? `${causalModel.name}.txt` : undefined}
          nodeCount={causalModel?.nodes.length}
          lastUpdated={causalModel ? "just now" : undefined}
          isLoaded={!!causalModel}
          onImportClick={() => setIsImportOpen(true)}
        />

        {/* View toggle */}
        <div className="flex items-center justify-between">
          <ViewToggle activeView={activeView} onViewChange={setActiveView} />
          <span className="text-xs font-mono text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Command View */}
        {activeView === "command" && (
          <div className="space-y-6 animate-fade-in">
            {/* Active commands */}
            {commands.length > 0 ? (
              <div className="space-y-4">
                {commands.map((command) => (
                  <CommandCard
                    key={command.id}
                    title={command.title}
                    description={command.description}
                    timeLabel={command.timeLabel}
                    causalNote={command.causalNote}
                    isPrimary={command.isPrimary}
                    onExecute={() => handleExecuteCommand(command.id)}
                    onDismiss={() => handleDismissCommand(command.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No active commands</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  All actions for now are complete
                </p>
              </div>
            )}

            {/* Food log input */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
                Quick Log
              </p>
              <FoodLogInput onSubmit={handleFoodLog} />
            </div>
          </div>
        )}

        {/* Timetable View */}
        {activeView === "timetable" && (
          <div className="space-y-1 animate-fade-in">
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">
              Today's Schedule
            </p>
            {mockTimetable.map((slot, index) => (
              <TimetableSlot
                key={index}
                time={slot.time}
                action={slot.action}
                status={slot.status}
                causalImpact={slot.causalImpact}
              />
            ))}
          </div>
        )}

        {/* Model View */}
        {activeView === "model" && (
          <CausalModelView 
            model={causalModel} 
            onImportClick={() => setIsImportOpen(true)} 
          />
        )}
      </main>

      {/* What-if query modal */}
      <WhatIfQuery isOpen={isWhatIfOpen} onClose={() => setIsWhatIfOpen(false)} />
      
      {/* Import modal */}
      <CausalModelImport 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)}
        onImport={setCausalModel}
      />
    </div>
  );
}
