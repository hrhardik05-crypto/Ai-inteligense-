export interface ModelWeights {
  rf: number;  // Random Forest Weight
  xgb: number; // XGBoost Weight
  lr: number;  // Logistic Regression Weight
}

const DEFAULT_WEIGHTS: ModelWeights = {
  rf: 40,
  xgb: 40,
  lr: 20,
};

export function getModelWeights(): ModelWeights {
  const cached = localStorage.getItem("model_weights_config");
  if (cached) {
    try {
      return JSON.parse(cached) as ModelWeights;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  }
  return DEFAULT_WEIGHTS;
}

export function saveModelWeights(weights: ModelWeights): void {
  localStorage.setItem("model_weights_config", JSON.stringify(weights));
  window.dispatchEvent(new Event("model_weights_updated"));
}

export function computeEnsembleProbability(rfProb: number, xgbProb: number, lrProb: number): number {
  const { rf, xgb, lr } = getModelWeights();
  const sum = rf + xgb + lr;
  if (sum === 0) return rfProb; // fallback
  return Math.round((rf * rfProb + xgb * xgbProb + lr * lrProb) / sum);
}

export function computeEnsembleRisk(prob: number): "Low" | "Medium" | "High" {
  if (prob >= 70) return "Low";
  if (prob >= 50) return "Medium";
  return "High";
}
