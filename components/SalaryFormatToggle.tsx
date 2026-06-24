import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SalaryFormat = "annual" | "monthly";

interface SalaryFormatToggleProps {
  label: string;
  value: number; // always stored as annual
  onChange: (annual: number) => void;
  className?: string;
}

export function SalaryFormatToggle({ label, value, onChange, className }: SalaryFormatToggleProps) {
  const [format, setFormat] = useState<SalaryFormat>("annual");

  const displayValue = format === "annual" ? value : Math.round(value / 12);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = +e.target.value;
    onChange(format === "annual" ? raw : raw * 12);
  }, [format, onChange]);

  const formatLabel = format === "annual" ? "LPA" : "/mo";
  const formatHint = format === "annual"
    ? `₹${(value / 12).toLocaleString("en-IN")}/mo`
    : `₹${value.toLocaleString("en-IN")}/yr`;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs">{label}</Label>
        <div className="flex rounded-md overflow-hidden border border-border/50">
          <button
            type="button"
            onClick={() => setFormat("annual")}
            className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${format === "annual" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => setFormat("monthly")}
            className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${format === "monthly" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="relative">
        <Input
          type="number"
          value={displayValue}
          onChange={handleChange}
          className="bg-secondary/50 border-border/50 h-9 text-sm pr-14"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
          {formatLabel}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">≈ {formatHint}</p>
    </div>
  );
}
