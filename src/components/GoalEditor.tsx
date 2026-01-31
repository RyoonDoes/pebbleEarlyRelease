import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { GoalRule, SequenceConfig, CountConfig } from "@/hooks/useGoalTracking";

interface GoalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Omit<GoalRule, 'id' | 'created_at' | 'updated_at'>) => Promise<unknown>;
  existingRule?: GoalRule;
}

export function GoalEditor({ isOpen, onClose, onSave, existingRule }: GoalEditorProps) {
  const [name, setName] = useState(existingRule?.name || '');
  const [description, setDescription] = useState(existingRule?.description || '');
  const [ruleType, setRuleType] = useState<'sequence' | 'count'>(
    (existingRule?.rule_type as 'sequence' | 'count') || 'sequence'
  );
  const [rollingDays, setRollingDays] = useState(existingRule?.rolling_window_days || 7);
  const [requiredCompletions, setRequiredCompletions] = useState(existingRule?.required_completions || 1);
  
  // Sequence-specific state
  const [sequenceEvents, setSequenceEvents] = useState<{ name: string; type?: string }[]>(
    (existingRule?.rule_config as SequenceConfig)?.events || [{ name: '' }, { name: '' }]
  );
  const [minHours, setMinHours] = useState(
    (existingRule?.rule_config as SequenceConfig)?.min_hours || 0
  );
  const [maxHours, setMaxHours] = useState(
    (existingRule?.rule_config as SequenceConfig)?.max_hours || 12
  );
  
  // Count-specific state
  const [countEventName, setCountEventName] = useState(
    (existingRule?.rule_config as CountConfig)?.event_pattern?.name || ''
  );
  const [requiredCount, setRequiredCount] = useState(
    (existingRule?.rule_config as CountConfig)?.required_count || 1
  );
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    
    let ruleConfig: SequenceConfig | CountConfig;
    
    if (ruleType === 'sequence') {
      ruleConfig = {
        events: sequenceEvents.filter(e => e.name.trim()),
        min_hours: minHours,
        max_hours: maxHours
      };
    } else {
      ruleConfig = {
        event_pattern: { name: countEventName },
        required_count: requiredCount,
        rolling_days: rollingDays
      };
    }
    
    try {
      await onSave({
        name,
        description: description || null,
        rule_type: ruleType,
        rule_config: ruleConfig,
        rolling_window_days: rollingDays,
        required_completions: requiredCompletions,
        is_active: true,
        priority: 0
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const addSequenceEvent = () => {
    setSequenceEvents([...sequenceEvents, { name: '' }]);
  };

  const updateSequenceEvent = (index: number, name: string) => {
    const updated = [...sequenceEvents];
    updated[index] = { name };
    setSequenceEvents(updated);
  };

  const removeSequenceEvent = (index: number) => {
    if (sequenceEvents.length <= 2) return;
    setSequenceEvents(sequenceEvents.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingRule ? 'Edit Goal' : 'Create Goal'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GH to IGF-1 Response"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this goal track?"
              rows={2}
            />
          </div>
          
          {/* Rule Type */}
          <div className="space-y-2">
            <Label>Rule Type</Label>
            <Select value={ruleType} onValueChange={(v) => setRuleType(v as 'sequence' | 'count')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequence">
                  Sequence (A → B within time window)
                </SelectItem>
                <SelectItem value="count">
                  Count (N occurrences in rolling window)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sequence Configuration */}
          {ruleType === 'sequence' && (
            <>
              <div className="space-y-2">
                <Label>Event Sequence</Label>
                <div className="space-y-2">
                  {sequenceEvents.map((event, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">
                        {i + 1}.
                      </span>
                      <Input
                        value={event.name}
                        onChange={(e) => updateSequenceEvent(i, e.target.value)}
                        placeholder={`Event ${i + 1} name (e.g., GH_peak)`}
                        className="flex-1"
                      />
                      {sequenceEvents.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSequenceEvent(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSequenceEvent}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minHours">Min Hours</Label>
                  <Input
                    id="minHours"
                    type="number"
                    value={minHours}
                    onChange={(e) => setMinHours(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxHours">Max Hours</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    value={maxHours}
                    onChange={(e) => setMaxHours(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
            </>
          )}
          
          {/* Count Configuration */}
          {ruleType === 'count' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={countEventName}
                  onChange={(e) => setCountEventName(e.target.value)}
                  placeholder="e.g., training_session"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requiredCount">Required Count</Label>
                <Input
                  id="requiredCount"
                  type="number"
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(Number(e.target.value))}
                  min={1}
                />
              </div>
            </>
          )}
          
          {/* Common fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rollingDays">Rolling Window (days)</Label>
              <Input
                id="rollingDays"
                type="number"
                value={rollingDays}
                onChange={(e) => setRollingDays(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredCompletions">Required Completions</Label>
              <Input
                id="requiredCompletions"
                type="number"
                value={requiredCompletions}
                onChange={(e) => setRequiredCompletions(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving...' : (existingRule ? 'Save Changes' : 'Create Goal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
