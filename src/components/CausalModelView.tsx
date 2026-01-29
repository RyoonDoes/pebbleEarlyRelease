import { useState } from "react";
import { 
  Circle, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight,
  Target,
  Zap,
  Activity,
  Filter,
  Network,
  List
} from "lucide-react";
import { CausalGraphView } from "./CausalGraphView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CausalModel } from "./CausalModelImport";

interface CausalModelViewProps {
  model: CausalModel | null;
  onImportClick: () => void;
}

type NodeFilter = "all" | "input" | "intermediate" | "output" | "goal";
type ViewMode = "list" | "graph";

export function CausalModelView({ model, onImportClick }: CausalModelViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NodeFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-mono font-medium mb-2">No Causal Model Loaded</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Import a causal model to define your biological framework and enable reasoning
        </p>
        <Button onClick={onImportClick}>
          Import Model
        </Button>
      </div>
    );
  }

  const toggleNode = (nodeId: string) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    setExpandedNodes(next);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "input": return <Zap className="w-3.5 h-3.5 text-primary" />;
      case "output": return <Target className="w-3.5 h-3.5 text-success" />;
      case "goal": return <Target className="w-3.5 h-3.5 text-warning" />;
      default: return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getRelationshipStyle = (rel: string) => {
    switch (rel) {
      case "amplifies": return "text-success";
      case "inhibits": return "text-destructive";
      case "modulates": return "text-warning";
      default: return "text-muted-foreground";
    }
  };

  const getStrengthOpacity = (strength?: string) => {
    switch (strength) {
      case "strong": return "opacity-100";
      case "weak": return "opacity-50";
      default: return "opacity-75";
    }
  };

  // Filter and search nodes
  const filteredNodes = model.nodes.filter((node) => {
    const matchesFilter = filter === "all" || node.type === filter;
    const matchesSearch = !search || 
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get edges for a node
  const getOutgoingEdges = (nodeId: string) => 
    model.edges.filter(e => e.from === nodeId);
  
  const getIncomingEdges = (nodeId: string) => 
    model.edges.filter(e => e.to === nodeId);

  // Group nodes by type
  const groupedNodes = {
    input: filteredNodes.filter(n => n.type === "input"),
    intermediate: filteredNodes.filter(n => n.type === "intermediate"),
    output: filteredNodes.filter(n => n.type === "output"),
    goal: filteredNodes.filter(n => n.type === "goal"),
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Model info header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono font-medium">{model.name}</h3>
          <p className="text-xs text-muted-foreground">
            {model.nodes.length} nodes • {model.edges.length} edges
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("graph")}
              className={`
                p-1.5 rounded transition-smooth
                ${viewMode === "graph" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
              title="Graph View"
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`
                p-1.5 rounded transition-smooth
                ${viewMode === "list" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onImportClick}>
            Replace
          </Button>
        </div>
      </div>

      {/* Graph View */}
      {viewMode === "graph" && (
        <div className="h-[400px] border border-border rounded-lg overflow-hidden">
          <CausalGraphView model={model} />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>

      {/* Search and filter */}
      <div className="flex gap-2">
        <Input
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-9 text-sm font-mono"
        />
        <div className="flex items-center bg-muted rounded-lg p-1">
          {(["all", "input", "intermediate", "output"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-2 py-1 text-xs font-mono rounded transition-smooth capitalize
                ${filter === f 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {f === "all" ? <Filter className="w-3.5 h-3.5" /> : f.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Node groups */}
      <div className="space-y-6">
        {/* Inputs */}
        {groupedNodes.input.length > 0 && (
          <NodeGroup
            title="Inputs"
            subtitle="External factors you control"
            nodes={groupedNodes.input}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            getNodeIcon={getNodeIcon}
            getOutgoingEdges={getOutgoingEdges}
            getIncomingEdges={getIncomingEdges}
            getRelationshipStyle={getRelationshipStyle}
            getStrengthOpacity={getStrengthOpacity}
            allNodes={model.nodes}
          />
        )}

        {/* Intermediates */}
        {groupedNodes.intermediate.length > 0 && (
          <NodeGroup
            title="Intermediate"
            subtitle="Internal biological processes"
            nodes={groupedNodes.intermediate}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            getNodeIcon={getNodeIcon}
            getOutgoingEdges={getOutgoingEdges}
            getIncomingEdges={getIncomingEdges}
            getRelationshipStyle={getRelationshipStyle}
            getStrengthOpacity={getStrengthOpacity}
            allNodes={model.nodes}
          />
        )}

        {/* Outputs */}
        {groupedNodes.output.length > 0 && (
          <NodeGroup
            title="Outputs"
            subtitle="Observable outcomes"
            nodes={groupedNodes.output}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            getNodeIcon={getNodeIcon}
            getOutgoingEdges={getOutgoingEdges}
            getIncomingEdges={getIncomingEdges}
            getRelationshipStyle={getRelationshipStyle}
            getStrengthOpacity={getStrengthOpacity}
            allNodes={model.nodes}
          />
        )}

        {/* Goals */}
        {groupedNodes.goal.length > 0 && (
          <NodeGroup
            title="Goals"
            subtitle="Target outcomes"
            nodes={groupedNodes.goal}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            getNodeIcon={getNodeIcon}
            getOutgoingEdges={getOutgoingEdges}
            getIncomingEdges={getIncomingEdges}
            getRelationshipStyle={getRelationshipStyle}
            getStrengthOpacity={getStrengthOpacity}
            allNodes={model.nodes}
          />
        )}
      </div>

      {filteredNodes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No nodes match your search
        </div>
      )}
        </>
      )}
    </div>
  );
}

interface NodeGroupProps {
  title: string;
  subtitle: string;
  nodes: Array<{ id: string; name: string; type: string; description?: string }>;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  getNodeIcon: (type: string) => React.ReactNode;
  getOutgoingEdges: (id: string) => Array<{ from: string; to: string; relationship: string; strength?: string; condition?: string }>;
  getIncomingEdges: (id: string) => Array<{ from: string; to: string; relationship: string; strength?: string; condition?: string }>;
  getRelationshipStyle: (rel: string) => string;
  getStrengthOpacity: (strength?: string) => string;
  allNodes: Array<{ id: string; name: string }>;
}

function NodeGroup({
  title,
  subtitle,
  nodes,
  expandedNodes,
  onToggle,
  getNodeIcon,
  getOutgoingEdges,
  getIncomingEdges,
  getRelationshipStyle,
  getStrengthOpacity,
  allNodes,
}: NodeGroupProps) {
  const getNodeName = (id: string) => 
    allNodes.find(n => n.id === id)?.name || id;

  return (
    <div>
      <div className="mb-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground/70">{subtitle}</p>
      </div>
      
      <div className="space-y-1">
        {nodes.map((node) => {
          const isExpanded = expandedNodes.has(node.id);
          const outgoing = getOutgoingEdges(node.id);
          const incoming = getIncomingEdges(node.id);
          const hasConnections = outgoing.length > 0 || incoming.length > 0;

          return (
            <div key={node.id} className="group">
              <button
                onClick={() => hasConnections && onToggle(node.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                  transition-smooth
                  ${hasConnections ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"}
                  ${isExpanded ? "bg-muted/50" : ""}
                `}
              >
                {hasConnections ? (
                  isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )
                ) : (
                  <div className="w-3.5" />
                )}
                
                {getNodeIcon(node.type)}
                
                <span className="font-mono text-sm flex-1">{node.name}</span>
                
                {hasConnections && (
                  <span className="text-xs text-muted-foreground">
                    {incoming.length}→ {outgoing.length}→
                  </span>
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="ml-10 mt-1 mb-3 space-y-2">
                  {node.description && (
                    <p className="text-xs text-muted-foreground">{node.description}</p>
                  )}
                  
                  {/* Incoming edges */}
                  {incoming.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground/70">Affected by:</p>
                      {incoming.map((edge, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${getStrengthOpacity(edge.strength)}`}>
                          <span className="font-mono">{getNodeName(edge.from)}</span>
                          <ArrowRight className={`w-3 h-3 ${getRelationshipStyle(edge.relationship)}`} />
                          <span className={`${getRelationshipStyle(edge.relationship)}`}>
                            {edge.relationship}
                          </span>
                          {edge.condition && (
                            <span className="text-muted-foreground">({edge.condition})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Outgoing edges */}
                  {outgoing.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground/70">Affects:</p>
                      {outgoing.map((edge, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${getStrengthOpacity(edge.strength)}`}>
                          <ArrowRight className={`w-3 h-3 ${getRelationshipStyle(edge.relationship)}`} />
                          <span className="font-mono">{getNodeName(edge.to)}</span>
                          <span className={`${getRelationshipStyle(edge.relationship)}`}>
                            ({edge.relationship})
                          </span>
                          {edge.condition && (
                            <span className="text-muted-foreground">if {edge.condition}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
