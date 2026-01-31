import { useState } from "react";
import { GoalList } from "./GoalList";
import { GoalDetail } from "./GoalDetail";
import { GoalEditor } from "./GoalEditor";
import { useGoalTracking } from "@/hooks/useGoalTracking";

export function GoalTrackingView() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const {
    goals,
    isLoading,
    isEvaluating,
    evaluateGoals,
    addGoalRule,
  } = useGoalTracking();

  const selectedGoal = selectedGoalId 
    ? goals.find(g => g.rule.id === selectedGoalId) 
    : null;

  if (selectedGoal) {
    return (
      <GoalDetail 
        goal={selectedGoal} 
        onBack={() => setSelectedGoalId(null)} 
      />
    );
  }

  return (
    <>
      <GoalList
        goals={goals}
        isLoading={isLoading}
        isEvaluating={isEvaluating}
        onSelectGoal={setSelectedGoalId}
        onRefresh={() => evaluateGoals()}
        onAddGoal={() => setIsEditorOpen(true)}
      />
      
      <GoalEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={addGoalRule}
      />
    </>
  );
}
