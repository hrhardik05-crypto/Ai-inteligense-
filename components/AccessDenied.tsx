import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  /** The page/module the user tried to access */
  module?: string;
  /** Called when user clicks "Go Back" */
  onGoBack?: () => void;
}

/**
 * AccessDenied — shown when a user navigates to a module they don't have permission for.
 * Rules:
 * - Recruiter trying to open Reports → sees this screen.
 * - Any role trying to open Admin → sees this screen.
 */
export function AccessDenied({ module, onGoBack }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
      {/* Icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        {/* Outer glow ring */}
        <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-destructive/20 animate-ping" />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">Access Denied</h2>
        {module && (
          <p className="text-sm text-muted-foreground">
            You don't have permission to access{" "}
            <span className="font-semibold text-foreground">{module}</span>.
          </p>
        )}
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your current role does not include access to this module. Please contact your
          Administrator if you believe this is a mistake.
        </p>
      </div>

      {/* Role tag */}
      <div className="px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
        403 — Forbidden
      </div>

      {/* Action */}
      {onGoBack && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onGoBack}
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      )}
    </div>
  );
}
