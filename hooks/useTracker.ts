import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface TrackerRow {
  id: string;
  positionName: string;
  clientName: string;
  recruiterName: string;
  openings: number;
  shared: number;
  r1Conducted: number;
  r1Rejected: number;
  r2Conducted: number;
  r2Rejected: number;
  rFinalConducted: number;
  rFinalRejected: number;
  selected: number;
  offered: number;
  accepted: number;
  joined: number;
  status: "Open" | "Closed" | "On Hold" | "Paused";
  remarks: string;
  date: string;
}

// Helper to map DB snake_case to UI camelCase
function mapDbToRow(row: any): TrackerRow {
  return {
    id: row.id,
    positionName: row.position_name,
    clientName: row.client_name,
    recruiterName: row.recruiter_name,
    openings: row.openings || 0,
    shared: row.shared || 0,
    r1Conducted: row.r1_conducted || 0,
    r1Rejected: row.r1_rejected || 0,
    r2Conducted: row.r2_conducted || 0,
    r2Rejected: row.r2_rejected || 0,
    rFinalConducted: row.r_final_conducted || 0,
    rFinalRejected: row.r_final_rejected || 0,
    selected: row.selected || 0,
    offered: row.offered || 0,
    accepted: row.accepted || 0,
    joined: row.joined || 0,
    status: row.status as TrackerRow["status"],
    remarks: row.remarks || "",
    date: row.date,
  };
}

// Helper to map UI camelCase to DB snake_case
function mapRowToDb(row: Partial<TrackerRow>): any {
  const dbRow: any = {};
  if (row.id !== undefined) dbRow.id = row.id;
  if (row.positionName !== undefined) dbRow.position_name = row.positionName;
  if (row.clientName !== undefined) dbRow.client_name = row.clientName;
  if (row.recruiterName !== undefined) dbRow.recruiter_name = row.recruiterName;
  if (row.openings !== undefined) dbRow.openings = row.openings;
  if (row.shared !== undefined) dbRow.shared = row.shared;
  if (row.r1Conducted !== undefined) dbRow.r1_conducted = row.r1Conducted;
  if (row.r1Rejected !== undefined) dbRow.r1_rejected = row.r1Rejected;
  if (row.r2Conducted !== undefined) dbRow.r2_conducted = row.r2Conducted;
  if (row.r2Rejected !== undefined) dbRow.r2_rejected = row.r2Rejected;
  if (row.rFinalConducted !== undefined) dbRow.r_final_conducted = row.rFinalConducted;
  if (row.rFinalRejected !== undefined) dbRow.r_final_rejected = row.rFinalRejected;
  if (row.selected !== undefined) dbRow.selected = row.selected;
  if (row.offered !== undefined) dbRow.offered = row.offered;
  if (row.accepted !== undefined) dbRow.accepted = row.accepted;
  if (row.joined !== undefined) dbRow.joined = row.joined;
  if (row.status !== undefined) dbRow.status = row.status;
  if (row.remarks !== undefined) dbRow.remarks = row.remarks;
  if (row.date !== undefined) dbRow.date = row.date;
  
  return dbRow;
}

export function useTracker() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("recruitment-tracker-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recruitment_tracker" },
        (payload) => {
          console.log("Realtime tracker change received:", payload);
          queryClient.invalidateQueries({ queryKey: ["recruitment_tracker"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["recruitment_tracker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_tracker")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching tracker data:", error);
        throw error;
      }

      return (data || []).map(mapDbToRow);
    },
  });
}

export function useAddTrackerRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<TrackerRow, "id">) => {
      const dbRow = mapRowToDb(row);
      const { data, error } = await supabase
        .from("recruitment_tracker")
        .insert(dbRow)
        .select()
        .single();
        
      if (error) throw error;
      return mapDbToRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment_tracker"] });
    },
    onError: (error) => {
      toast.error(`Failed to add row: ${error.message}`);
    },
  });
}

export function useUpdateTrackerRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TrackerRow> }) => {
      const dbRow = mapRowToDb(updates);
      const { data, error } = await supabase
        .from("recruitment_tracker")
        .update(dbRow)
        .eq("id", id)
        .select()
        .single();
        
      if (error) throw error;
      return mapDbToRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment_tracker"] });
    },
    onError: (error) => {
      toast.error(`Failed to update row: ${error.message}`);
    },
  });
}

export function useDeleteTrackerRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recruitment_tracker")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment_tracker"] });
      toast.success("Row deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete row: ${error.message}`);
    },
  });
}
