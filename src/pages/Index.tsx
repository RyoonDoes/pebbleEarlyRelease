import { useState } from "react";
import { Header } from "@/components/Header";
import { ViewToggle } from "@/components/ViewToggle";
import { CommandCard } from "@/components/CommandCard";
import { TimetableSlot } from "@/components/TimetableSlot";
import { CausalModelStatus } from "@/components/CausalModelStatus";
import { WhatIfQuery } from "@/components/WhatIfQuery";
import { CausalModelImport } from "@/components/CausalModelImport";
import { CausalModelView } from "@/components/CausalModelView";
import { InventoryManager } from "@/components/InventoryManager";
import { TrackablesList } from "@/components/TrackablesList";
import { ActivityLogList } from "@/components/ActivityLogList";
import { ActivityInput } from "@/components/ActivityInput";
import { GoalTrackingView } from "@/components/GoalTrackingView";
import { usePebbleState } from "@/hooks/usePebbleState";
import { useTracking } from "@/hooks/useTracking";

type ViewType = "command" | "timetable" | "model" | "inventory" | "trackables" | "activity" | "goals";

export default function Index() {
  const [activeView, setActiveView] = useState<ViewType>("command");
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const {
    commands,
    timetable,
    causalModel,
    executeCommand,
    dismissCommand,
    logFood,
    markTimetableComplete,
    setCausalModel,
  } = usePebbleState();

  const {
    inventory,
    trackables,
    activityLogs,
    isLoading: isTrackingLoading,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addTrackable,
    updateTrackable,
    deleteTrackable,
    getTodayTotal,
    logActivity,
  } = useTracking();

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <ViewToggle activeView={activeView} onViewChange={handleViewChange} />
          <span className="text-xs font-mono text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Command View */}
        {activeView === "command" && (
          <div className="space-y-6 animate-fade-in">
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
                    onExecute={() => executeCommand(command.id)}
                    onDismiss={() => dismissCommand(command.id)}
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

            {/* Activity input */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
                Quick Log
              </p>
              <ActivityInput trackables={trackables} inventory={inventory} onLogActivity={logActivity} />
            </div>
          </div>
        )}

        {/* Timetable View */}
        {activeView === "timetable" && (
          <div className="space-y-1 animate-fade-in">
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">
              Today's Schedule
            </p>
            {timetable.map((slot) => (
              <TimetableSlot
                key={slot.id}
                time={slot.time}
                action={slot.action}
                status={slot.status}
                causalImpact={slot.causalImpact}
                onComplete={slot.status !== "completed" ? () => markTimetableComplete(slot.id) : undefined}
              />
            ))}
          </div>
        )}

        {/* Inventory View */}
        {activeView === "inventory" && (
          <InventoryManager
            inventory={inventory}
            onAdd={addInventoryItem}
            onUpdate={updateInventoryItem}
            onDelete={deleteInventoryItem}
          />
        )}

        {/* Trackables View */}
        {activeView === "trackables" && (
          <TrackablesList
            trackables={trackables}
            getTodayTotal={getTodayTotal}
            onAdd={addTrackable}
            onUpdate={updateTrackable}
            onDelete={deleteTrackable}
          />
        )}

        {/* Activity Log View */}
        {activeView === "activity" && (
          <div className="space-y-6">
            <ActivityInput trackables={trackables} inventory={inventory} onLogActivity={logActivity} />
            <ActivityLogList activityLogs={activityLogs} />
          </div>
        )}

        {/* Goals View */}
        {activeView === "goals" && (
          <GoalTrackingView />
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
      <WhatIfQuery 
        isOpen={isWhatIfOpen} 
        onClose={() => setIsWhatIfOpen(false)} 
        causalModel={causalModel}
      />
      
      {/* Import modal */}
      <CausalModelImport 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)}
        onImport={setCausalModel}
      />
    </div>
  );
}
