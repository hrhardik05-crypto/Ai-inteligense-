import { useState, useEffect } from "react";
import { getModelWeights, saveModelWeights, ModelWeights } from "@/lib/modelWeights";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sliders, RotateCcw, BrainCircuit } from "lucide-react";
import { toast } from "sonner";

export function ModelWeightTuner() {
  const [weights, setWeights] = useState<ModelWeights>({ rf: 40, xgb: 40, lr: 20 });

  useEffect(() => {
    setWeights(getModelWeights());
  }, []);

  const handleSliderChange = (key: keyof ModelWeights, val: number) => {
    const otherKeys = (Object.keys(weights) as Array<keyof ModelWeights>).filter(k => k !== key);
    const otherKey1 = otherKeys[0];
    const otherKey2 = otherKeys[1];

    const currentOthersSum = weights[otherKey1] + weights[otherKey2];
    const remaining = 100 - val;

    let updated = { ...weights };
    updated[key] = val;

    if (currentOthersSum > 0) {
      // Proportional redistribution of the remaining weight
      const share1 = Math.round((weights[otherKey1] / currentOthersSum) * remaining);
      updated[otherKey1] = share1;
      updated[otherKey2] = 100 - val - share1;
    } else {
      // Equal split fallback
      const share1 = Math.round(remaining / 2);
      updated[otherKey1] = share1;
      updated[otherKey2] = remaining - share1;
    }

    setWeights(updated);
    saveModelWeights(updated);
  };

  const handleReset = () => {
    const defaults = { rf: 40, xgb: 40, lr: 20 };
    setWeights(defaults);
    saveModelWeights(defaults);
    toast.success("Ensemble model weights reset to factory default (40% RF, 40% XGB, 20% LR)!");
  };

  return (
    <Card className="border-border/40 bg-card/60 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base font-display">Multi-Model Ensemble Weight Tuner</CardTitle>
            <CardDescription className="text-xs">Adjust predictions bias across XGBoost, Random Forest, & LR</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Visual weight breakdown meter */}
        <div className="space-y-1">
          <div className="flex text-[10px] uppercase font-mono text-muted-foreground justify-between">
            <span>Ensemble Configuration</span>
            <span>Total: 100%</span>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden border border-border/20">
            <div 
              style={{ width: `${weights.rf}%` }} 
              className="bg-primary/80 transition-all duration-300 flex items-center justify-center text-[8px] text-primary-foreground font-mono font-bold"
              title={`Random Forest: ${weights.rf}%`}
            >
              {weights.rf > 10 && `RF:${weights.rf}%`}
            </div>
            <div 
              style={{ width: `${weights.xgb}%` }} 
              className="bg-sky-500/80 transition-all duration-300 flex items-center justify-center text-[8px] text-white font-mono font-bold"
              title={`XGBoost: ${weights.xgb}%`}
            >
              {weights.xgb > 10 && `XGB:${weights.xgb}%`}
            </div>
            <div 
              style={{ width: `${weights.lr}%` }} 
              className="bg-violet-600/80 transition-all duration-300 flex items-center justify-center text-[8px] text-white font-mono font-bold"
              title={`Logistic Regression: ${weights.lr}%`}
            >
              {weights.lr > 10 && `LR:${weights.lr}%`}
            </div>
          </div>
        </div>

        {/* Sliders list */}
        <div className="space-y-4 pt-1">
          {/* Random Forest */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <Label className="text-muted-foreground font-medium">Random Forest Classifier Weight</Label>
              <span className="font-mono font-bold text-primary">{weights.rf}%</span>
            </div>
            <Slider
              value={[weights.rf]}
              onValueChange={([v]) => handleSliderChange("rf", v)}
              min={0}
              max={100}
              step={5}
              className="py-1"
            />
          </div>

          {/* XGBoost */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <Label className="text-muted-foreground font-medium">XGBoost Classifier Weight</Label>
              <span className="font-mono font-bold text-sky-500">{weights.xgb}%</span>
            </div>
            <Slider
              value={[weights.xgb]}
              onValueChange={([v]) => handleSliderChange("xgb", v)}
              min={0}
              max={100}
              step={5}
              className="py-1"
            />
          </div>

          {/* Logistic Regression */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <Label className="text-muted-foreground font-medium">Logistic Regression Weight</Label>
              <span className="font-mono font-bold text-violet-500">{weights.lr}%</span>
            </div>
            <Slider
              value={[weights.lr]}
              onValueChange={([v]) => handleSliderChange("lr", v)}
              min={0}
              max={100}
              step={5}
              className="py-1"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-0 pb-4 pr-6">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleReset}>
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Defaults
        </Button>
      </CardFooter>
    </Card>
  );
}
