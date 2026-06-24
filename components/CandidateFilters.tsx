import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";

export interface FilterState {
  search: string;
  riskLevel: string;
  companyType: string;
  minProbability: string;
  sortBy: string;
}

interface CandidateFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function CandidateFilters({ filters, onChange }: CandidateFiltersProps) {
  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or ID..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9 h-9 text-sm bg-secondary/50 border-border/50"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <Select value={filters.riskLevel} onValueChange={(v) => set("riskLevel", v)}>
          <SelectTrigger className="h-8 w-[120px] text-xs bg-secondary/50 border-border/50">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.companyType} onValueChange={(v) => set("companyType", v)}>
          <SelectTrigger className="h-8 w-[130px] text-xs bg-secondary/50 border-border/50">
            <SelectValue placeholder="Company Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="MNC">MNC</SelectItem>
            <SelectItem value="Startup">Startup</SelectItem>
            <SelectItem value="Service-based">Service-based</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.minProbability} onValueChange={(v) => set("minProbability", v)}>
          <SelectTrigger className="h-8 w-[130px] text-xs bg-secondary/50 border-border/50">
            <SelectValue placeholder="Min Probability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any Probability</SelectItem>
            <SelectItem value="30">≥ 30%</SelectItem>
            <SelectItem value="50">≥ 50%</SelectItem>
            <SelectItem value="70">≥ 70%</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={(v) => set("sortBy", v)}>
          <SelectTrigger className="h-8 w-[150px] text-xs bg-secondary/50 border-border/50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default (Newest)</SelectItem>
            <SelectItem value="risk-desc">Highest Risk</SelectItem>
            <SelectItem value="prob-desc">Highest Probability</SelectItem>
            <SelectItem value="prob-asc">Lowest Probability</SelectItem>
            <SelectItem value="notice-desc">Longest Notice</SelectItem>
            <SelectItem value="hike-desc">Highest Hike</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
