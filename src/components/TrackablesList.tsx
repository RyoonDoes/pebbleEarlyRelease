import { useState } from "react";
import { Target, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { Trackable } from "@/hooks/useTracking";

interface TrackablesListProps {
  trackables: Trackable[];
  getTodayTotal: (trackableId: string) => number;
  onAdd: (trackable: Omit<Trackable, "id" | "created_at">) => Promise<{ error: unknown }>;
  onUpdate: (id: string, updates: Partial<Trackable>) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
}

const CATEGORIES = ["micronutrient", "macronutrient", "amino_acid", "fatty_acid", "hormone", "stimulant", "custom"];
const UNITS = ["mg", "g", "mcg", "IU", "ml", "units"];

export function TrackablesList({ trackables, getTodayTotal, onAdd, onUpdate, onDelete }: TrackablesListProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTrackable, setNewTrackable] = useState({
    name: "",
    category: "custom",
    unit: "mg",
    daily_target: null as number | null,
    description: "",
    is_active: true,
  });

  const handleAdd = async () => {
    if (!newTrackable.name) return;
    
    await onAdd({
      name: newTrackable.name,
      category: newTrackable.category,
      unit: newTrackable.unit,
      daily_target: newTrackable.daily_target,
      description: newTrackable.description || null,
      is_active: true,
    });
    
    setNewTrackable({ name: "", category: "custom", unit: "mg", daily_target: null, description: "", is_active: true });
    setIsAddOpen(false);
  };

  const activeTrackables = trackables.filter(t => t.is_active);
  const groupedTrackables = activeTrackables.reduce((acc, t) => {
    const cat = t.category || "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Trackable[]>);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Trackables
        </p>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Trackable
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Trackable</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  placeholder="e.g., Xenoestrogens"
                  value={newTrackable.name}
                  onChange={(e) => setNewTrackable(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newTrackable.category} onValueChange={(v) => setNewTrackable(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newTrackable.unit} onValueChange={(v) => setNewTrackable(prev => ({ ...prev, unit: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Target (optional)</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 100"
                  value={newTrackable.daily_target ?? ""}
                  onChange={(e) => setNewTrackable(prev => ({ 
                    ...prev, 
                    daily_target: e.target.value ? Number(e.target.value) : null 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input 
                  placeholder="Brief description"
                  value={newTrackable.description}
                  onChange={(e) => setNewTrackable(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Start Tracking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeTrackables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No active trackables</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add nutrients or custom items to track</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTrackables).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                {category.replace("_", " ")}
              </p>
              <div className="grid gap-2">
                {items.map((trackable) => {
                  const todayTotal = getTodayTotal(trackable.id);
                  const hasTarget = trackable.daily_target !== null && trackable.daily_target > 0;
                  const progress = hasTarget ? (todayTotal / trackable.daily_target!) * 100 : 0;
                  
                  return (
                    <Card key={trackable.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{trackable.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                              {todayTotal.toFixed(1)} {trackable.unit}
                              {hasTarget && (
                                <span className="text-muted-foreground">
                                  {" "}/ {trackable.daily_target} {trackable.unit}
                                </span>
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => onUpdate(trackable.id, { is_active: false })}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {hasTarget && (
                          <Progress 
                            value={Math.min(progress, 100)} 
                            className="h-1.5"
                          />
                        )}
                        {trackable.description && (
                          <p className="text-xs text-muted-foreground mt-2">{trackable.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
