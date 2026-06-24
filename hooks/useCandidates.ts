import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Candidate = Tables<"candidates">;
export type CandidateInsert = TablesInsert<"candidates">;

import { useEffect } from "react";
import { runModelComparison } from "@/lib/scoring";
import { computeEnsembleProbability, computeEnsembleRisk } from "@/lib/modelWeights";

export function useCandidates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleWeightsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    };
    window.addEventListener("model_weights_updated", handleWeightsUpdate);
    return () => {
      window.removeEventListener("model_weights_updated", handleWeightsUpdate);
    };
  }, [queryClient]);

  useEffect(() => {
    const cachedMockRole = localStorage.getItem("mock_auth_role");
    if (cachedMockRole) return;

    const channel = supabase
      .channel("candidates-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        (payload) => {
          console.log("Realtime candidate change broadcast received:", payload);
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const cachedMockRole = localStorage.getItem("mock_auth_role");
      if (cachedMockRole) {
        // Mock mode: fetch from local storage or seed candidates
        const local = localStorage.getItem("mock_candidates");
        let list: Candidate[] = [];
        if (local) {
          list = JSON.parse(local);
        } else {
          // Seed with some mock candidates
          list = [
            {
              id: "mock-candidate-1",
              candidate_id: "C001",
              name: "Alice Johnson",
              notice_period: 30,
              notice_negotiated: true,
              reduced_notice_period: 15,
              current_ctc: 1200000,
              offered_ctc: 1600000,
              hike_percentage: 33,
              counter_offer_history: false,
              company_type: "MNC",
              years_in_current_org: 3,
              total_experience: 6,
              job_changes: 2,
              location_change: false,
              work_mode: "Remote",
              joining_probability: 85,
              offer_drop_risk: "Low",
              notice_negotiation_success: 80,
              joined: false,
              resume_url: null,
              resume_analysis: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "mock-candidate-2",
              candidate_id: "C002",
              name: "Bob Smith",
              notice_period: 90,
              notice_negotiated: false,
              reduced_notice_period: 90,
              current_ctc: 1800000,
              offered_ctc: 2100000,
              hike_percentage: 16,
              counter_offer_history: true,
              company_type: "Startup",
              years_in_current_org: 1,
              total_experience: 4,
              job_changes: 3,
              location_change: true,
              work_mode: "Onsite",
              joining_probability: 45,
              offer_drop_risk: "High",
              notice_negotiation_success: 20,
              joined: false,
              resume_url: null,
              resume_analysis: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          localStorage.setItem("mock_candidates", JSON.stringify(list));
        }
        return list.map(c => {
          const models = runModelComparison(c);
          const rfProb = models.find(m => m.name === "Random Forest")?.predictedProb ?? c.joining_probability;
          const lrProb = models.find(m => m.name === "Logistic Regression")?.predictedProb ?? c.joining_probability;
          const xgbProb = models.find(m => m.name === "XGBoost")?.predictedProb ?? c.joining_probability;
          const ensembledProb = computeEnsembleProbability(rfProb, xgbProb, lrProb);
          const ensembledRisk = computeEnsembleRisk(ensembledProb);
          return {
            ...c,
            joining_probability: ensembledProb,
            offer_drop_risk: ensembledRisk,
          };
        });
      }

      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data as Candidate[]).map(c => {
        // Compute ensembled predictions dynamically using configured model weights
        const models = runModelComparison(c);
        const rfProb = models.find(m => m.name === "Random Forest")?.predictedProb ?? c.joining_probability;
        const lrProb = models.find(m => m.name === "Logistic Regression")?.predictedProb ?? c.joining_probability;
        const xgbProb = models.find(m => m.name === "XGBoost")?.predictedProb ?? c.joining_probability;

        const ensembledProb = computeEnsembleProbability(rfProb, xgbProb, lrProb);
        const ensembledRisk = computeEnsembleRisk(ensembledProb);

        return {
          ...c,
          joining_probability: ensembledProb,
          offer_drop_risk: ensembledRisk,
        };
      });
    },
  });
}

export function useAddCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidate: CandidateInsert) => {
      const cachedMockRole = localStorage.getItem("mock_auth_role");
      if (cachedMockRole) {
        const local = localStorage.getItem("mock_candidates");
        const list = local ? JSON.parse(local) : [];
        const newCandidate = {
          ...candidate,
          id: candidate.id || `mock-cand-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Candidate;
        list.unshift(newCandidate);
        localStorage.setItem("mock_candidates", JSON.stringify(list));
        return newCandidate;
      }

      const { data, error } = await supabase
        .from("candidates")
        .insert(candidate)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add candidate: ${error.message}`);
    },
  });
}

export function useBulkAddCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidates: CandidateInsert[]) => {
      const cachedMockRole = localStorage.getItem("mock_auth_role");
      if (cachedMockRole) {
        const local = localStorage.getItem("mock_candidates");
        const list = local ? JSON.parse(local) : [];
        const newCandidates = candidates.map(c => ({
          ...c,
          id: c.id || `mock-cand-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })) as Candidate[];
        const updatedList = [...newCandidates, ...list];
        localStorage.setItem("mock_candidates", JSON.stringify(updatedList));
        return newCandidates;
      }

      const { data, error } = await supabase
        .from("candidates")
        .insert(candidates)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(`${data.length} candidates imported successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to import candidates: ${error.message}`);
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CandidateInsert> }) => {
      const cachedMockRole = localStorage.getItem("mock_auth_role");
      if (cachedMockRole) {
        const local = localStorage.getItem("mock_candidates");
        const list = local ? JSON.parse(local) : [];
        const index = list.findIndex((c: Candidate) => c.id === id);
        if (index === -1) throw new Error("Candidate not found");
        const updated = {
          ...list[index],
          ...updates,
          updated_at: new Date().toISOString()
        };
        list[index] = updated;
        localStorage.setItem("mock_candidates", JSON.stringify(list));
        return updated;
      }

      const { data, error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update candidate: ${error.message}`);
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const cachedMockRole = localStorage.getItem("mock_auth_role");
      if (cachedMockRole) {
        const local = localStorage.getItem("mock_candidates");
        const list = local ? JSON.parse(local) : [];
        const filtered = list.filter((c: Candidate) => c.id !== id);
        localStorage.setItem("mock_candidates", JSON.stringify(filtered));
        return;
      }

      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
