import { HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onWhatIfClick?: () => void;
}

export function Header({ onWhatIfClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-panel border-b border-border">
      <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-background font-mono font-bold text-sm">P</span>
          </div>
          <span className="font-semibold tracking-tight">Pebble</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onWhatIfClick}
            className="text-muted-foreground"
          >
            <HelpCircle className="w-4 h-4 mr-1.5" />
            What if?
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
