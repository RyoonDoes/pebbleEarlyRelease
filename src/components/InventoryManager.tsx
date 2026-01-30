import { useState } from "react";
import { Package, Plus, Trash2, Edit2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem } from "@/hooks/useTracking";

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onAdd: (item: Omit<InventoryItem, "id" | "created_at" | "updated_at">) => Promise<{ error: unknown }>;
  onUpdate: (id: string, updates: Partial<InventoryItem>) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
}

const CATEGORIES = ["protein", "dairy", "vegetables", "fruits", "grains", "supplements", "other"];
const UNITS = ["g", "kg", "ml", "L", "units", "servings"];

export function InventoryManager({ inventory, onAdd, onUpdate, onDelete }: InventoryManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 0,
    unit: "g",
    category: "",
    expiry_date: "",
    notes: "",
  });

  const handleAdd = async () => {
    if (!newItem.name || newItem.quantity <= 0) return;
    
    await onAdd({
      name: newItem.name,
      quantity: newItem.quantity,
      unit: newItem.unit,
      category: newItem.category || null,
      expiry_date: newItem.expiry_date || null,
      notes: newItem.notes || null,
    });
    
    setNewItem({ name: "", quantity: 0, unit: "g", category: "", expiry_date: "", notes: "" });
    setIsAddOpen(false);
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const groupedInventory = inventory.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Food Inventory
        </p>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  placeholder="e.g., Beef mince"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={newItem.quantity || ""}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newItem.unit} onValueChange={(v) => setNewItem(prev => ({ ...prev, unit: v }))}>
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
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={(v) => setNewItem(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input 
                  type="date"
                  value={newItem.expiry_date}
                  onChange={(e) => setNewItem(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add to Inventory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {inventory.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No items in inventory</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add food items to track what's available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedInventory).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">{category}</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`
                      ${isExpired(item.expiry_date) ? "border-destructive/50 bg-destructive/5" : ""}
                      ${isExpiringSoon(item.expiry_date) ? "border-yellow-500/50 bg-yellow-500/5" : ""}
                    `}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit}
                              {item.expiry_date && (
                                <span className={`ml-2 ${isExpired(item.expiry_date) ? "text-destructive" : isExpiringSoon(item.expiry_date) ? "text-yellow-600" : ""}`}>
                                  {isExpired(item.expiry_date) && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                  Exp: {new Date(item.expiry_date).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {editingId === item.id ? (
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              defaultValue={item.quantity}
                              onBlur={(e) => {
                                onUpdate(item.id, { quantity: Number(e.target.value) });
                                setEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  onUpdate(item.id, { quantity: Number(e.currentTarget.value) });
                                  setEditingId(null);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingId(item.id)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
