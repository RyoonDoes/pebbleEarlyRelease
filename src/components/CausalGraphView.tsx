import { useCallback, useRef, useEffect, useState } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { ZoomIn, ZoomOut, Maximize2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CausalModel } from "./CausalModelImport";

interface CausalGraphViewProps {
  model: CausalModel;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  val: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  strength?: string;
  condition?: string;
}

export function CausalGraphView({ model }: CausalGraphViewProps) {
  const graphRef = useRef<ForceGraphMethods | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Transform model data to graph format
  const graphData = {
    nodes: model.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      description: node.description,
      val: node.type === "input" ? 3 : node.type === "output" || node.type === "goal" ? 4 : 2,
    })),
    links: model.edges.map((edge) => ({
      source: edge.from,
      target: edge.to,
      relationship: edge.relationship,
      strength: edge.strength,
      condition: edge.condition,
    })),
  };

  // Measure container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Center graph on load
  useEffect(() => {
    const timeout = setTimeout(() => {
      graphRef.current?.zoomToFit(400, 50);
    }, 500);
    return () => clearTimeout(timeout);
  }, [model]);

  // Node color based on type
  const getNodeColor = useCallback((node: GraphNode) => {
    const colors: Record<string, string> = {
      input: "hsl(var(--primary))",
      intermediate: "hsl(var(--muted-foreground))",
      output: "hsl(var(--success))",
      goal: "hsl(var(--warning))",
    };
    return colors[node.type] || colors.intermediate;
  }, []);

  // Link color based on relationship
  const getLinkColor = useCallback((link: GraphLink) => {
    const colors: Record<string, string> = {
      amplifies: "hsl(142 71% 45% / 0.6)",
      inhibits: "hsl(0 84% 60% / 0.6)",
      modulates: "hsl(45 93% 47% / 0.6)",
    };
    return colors[link.relationship] || "hsl(var(--border))";
  }, []);

  // Link width based on strength
  const getLinkWidth = useCallback((link: GraphLink) => {
    const widths: Record<string, number> = {
      weak: 1,
      moderate: 2,
      strong: 3,
    };
    return widths[link.strength || "moderate"] || 2;
  }, []);

  // Draw nodes with labels
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x as number;
      const y = node.y as number;
      const label = node.name;
      const fontSize = Math.max(10 / globalScale, 3);
      const nodeSize = (node.val * 2) / globalScale;
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, isHovered || isSelected ? nodeSize * 1.3 : nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = getNodeColor(node);
      ctx.fill();

      // Draw border for selected/hovered
      if (isHovered || isSelected) {
        ctx.strokeStyle = "hsl(var(--foreground))";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Draw label
      if (globalScale > 0.5) {
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "hsl(var(--foreground))";
        ctx.fillText(label, x, y + nodeSize + 2 / globalScale);
      }
    },
    [getNodeColor, hoveredNode, selectedNode]
  );

  // Draw links with arrows
  const linkCanvasObject = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = link.source as unknown as GraphNode;
      const target = link.target as unknown as GraphNode;
      
      if (!source.x || !target.x) return;

      const sx = source.x as number;
      const sy = source.y as number;
      const tx = target.x as number;
      const ty = target.y as number;

      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist === 0) return;

      const targetRadius = ((target.val || 2) * 2) / globalScale;
      const endX = tx - (dx / dist) * targetRadius;
      const endY = ty - (dy / dist) * targetRadius;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = getLinkColor(link);
      ctx.lineWidth = getLinkWidth(link) / globalScale;
      ctx.stroke();

      // Draw arrowhead
      const arrowLength = 6 / globalScale;
      const arrowAngle = Math.PI / 6;
      const angle = Math.atan2(dy, dx);

      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.closePath();
      ctx.fillStyle = getLinkColor(link);
      ctx.fill();
    },
    [getLinkColor, getLinkWidth]
  );

  const handleZoomIn = () => graphRef.current?.zoom(1.5, 400);
  const handleZoomOut = () => graphRef.current?.zoom(0.67, 400);
  const handleFit = () => graphRef.current?.zoomToFit(400, 50);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFit}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded-lg p-2 border border-border text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Input</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span>Intermediate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Output</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>Goal</span>
        </div>
        <div className="border-t border-border my-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-success/60" />
            <span>Amplifies</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-destructive/60" />
            <span>Inhibits</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-warning/60" />
            <span>Modulates</span>
          </div>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute top-2 left-2 z-10 bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border max-w-xs">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-mono font-medium text-sm">{selectedNode.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedNode.type}</p>
              {selectedNode.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedNode.description}</p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-6 text-xs w-full"
            onClick={() => setSelectedNode(null)}
          >
            Close
          </Button>
        </div>
      )}

      {/* Graph */}
      <div ref={containerRef} className="flex-1 min-h-[300px]">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          nodeRelSize={4}
          linkDirectionalArrowLength={0}
          onNodeClick={(node) => setSelectedNode(node as GraphNode)}
          onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
          cooldownTime={2000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          backgroundColor="transparent"
          enableNodeDrag={true}
          enablePanInteraction={true}
          enableZoomInteraction={true}
        />
      </div>
    </div>
  );
}
