import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CausalNode {
  id: string;
  name: string;
  type: "input" | "intermediate" | "output" | "goal";
  description?: string;
}

interface CausalEdge {
  from: string;
  to: string;
  relationship: "amplifies" | "inhibits" | "modulates";
  strength?: "weak" | "moderate" | "strong";
  condition?: string;
}

export interface CausalModel {
  name: string;
  version: string;
  lastUpdated: Date;
  nodes: CausalNode[];
  edges: CausalEdge[];
  rawContent: string;
}

interface CausalModelImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (model: CausalModel) => void;
}

// Parse a simple text-based causal model format
function parseCausalModel(content: string, fileName: string): CausalModel {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];
  
  let currentSection = "";
  
  for (const line of lines) {
    // Section headers
    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).toLowerCase();
      continue;
    }
    
    // Skip comments
    if (line.startsWith("#") || line.startsWith("//")) continue;
    
    // Parse nodes: NODE: id | name | type | description
    if (currentSection === "nodes" && line.includes("|")) {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length >= 3) {
        nodes.push({
          id: parts[0],
          name: parts[1],
          type: (parts[2] as CausalNode["type"]) || "intermediate",
          description: parts[3] || undefined,
        });
      }
    }
    
    // Parse edges: from -> to : relationship : strength : condition
    if (currentSection === "edges" && line.includes("->")) {
      const [fromPart, rest] = line.split("->");
      if (rest) {
        const [toPart, ...attrs] = rest.split(":");
        const relationship = attrs[0]?.trim() || "amplifies";
        const strength = attrs[1]?.trim() || "moderate";
        const condition = attrs[2]?.trim();
        
        edges.push({
          from: fromPart.trim(),
          to: toPart.trim(),
          relationship: relationship as CausalEdge["relationship"],
          strength: strength as CausalEdge["strength"],
          condition,
        });
      }
    }
  }
  
  // If no structured format found, create a basic model from the content
  if (nodes.length === 0) {
    // Extract potential nodes from the text (words that look like variables)
    const potentialNodes = content.match(/\b[a-z_]+(?:_[a-z]+)*\b/gi) || [];
    const uniqueNodes = [...new Set(potentialNodes)]
      .filter(n => n.length > 3 && !["this", "that", "with", "from"].includes(n.toLowerCase()))
      .slice(0, 20);
    
    uniqueNodes.forEach((name, i) => {
      nodes.push({
        id: name.toLowerCase().replace(/\s+/g, "_"),
        name: name.replace(/_/g, " "),
        type: i < 5 ? "input" : i > uniqueNodes.length - 3 ? "output" : "intermediate",
      });
    });
  }
  
  return {
    name: fileName.replace(/\.[^.]+$/, ""),
    version: "1.0",
    lastUpdated: new Date(),
    nodes,
    edges,
    rawContent: content,
  };
}

export function CausalModelImport({ isOpen, onClose, onImport }: CausalModelImportProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CausalModel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setParsing(true);
    
    try {
      const content = await file.text();
      const model = parseCausalModel(content, file.name);
      setPreview(model);
    } catch (err) {
      setError("Failed to parse causal model file");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = () => {
    if (preview) {
      onImport(preview);
      setPreview(null);
      onClose();
    }
  };

  const handleReset = () => {
    setPreview(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">Import Causal Model</DialogTitle>
          <DialogDescription>
            Upload a text-based causal model file to define your biological framework
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-smooth
                ${dragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-medium">
                {parsing ? "Parsing..." : "Drop causal model file here"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse (.txt, .cm, .causal)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.cm,.causal"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Format hint */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs font-mono text-muted-foreground mb-2">Expected format:</p>
              <pre className="text-xs text-muted-foreground/80 overflow-x-auto">
{`[NODES]
protein_intake | Protein Intake | input
iron_absorption | Iron Absorption | intermediate
energy_level | Energy Level | output

[EDGES]
protein_intake -> iron_absorption : amplifies : strong
iron_absorption -> energy_level : amplifies : moderate`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                <div className="flex-1">
                  <p className="font-mono font-medium">{preview.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {preview.nodes.length} nodes • {preview.edges.length} edges
                  </p>
                </div>
              </div>
            </div>

            {/* Node preview */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Detected Nodes
              </p>
              {preview.nodes.slice(0, 10).map((node) => (
                <div key={node.id} className="flex items-center gap-2 text-sm">
                  <span className={`
                    w-2 h-2 rounded-full
                    ${node.type === "input" ? "bg-primary" : 
                      node.type === "output" ? "bg-success" : 
                      node.type === "goal" ? "bg-warning" : "bg-muted-foreground"}
                  `} />
                  <span className="font-mono text-xs">{node.name}</span>
                  <span className="text-xs text-muted-foreground">({node.type})</span>
                </div>
              ))}
              {preview.nodes.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  +{preview.nodes.length - 10} more nodes
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Choose Different File
              </Button>
              <Button onClick={handleConfirmImport} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Import Model
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
