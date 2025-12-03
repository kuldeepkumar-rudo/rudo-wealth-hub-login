import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import InstitutionResultCard from "@/components/common/InstitutionResultCard";
import { WizardStepProps } from "@/components/common/WizardContainer";
import { useToast } from "@/hooks/use-toast";

interface Institution {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

export default function SearchAMCStep({ onNext }: WizardStepProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAMC, setSelectedAMC] = useState<Institution | null>(null);

  // Fetch AMCs based on search query
  const { data: amcs, isLoading } = useQuery<Institution[]>({
    queryKey: [`/api/account-aggregator/institutions?type=AMC&query=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2,
    placeholderData: [], // Prevents initial fetch attempt
  });

  const handleSelectAMC = (amc: Institution) => {
    setSelectedAMC(amc);
  };

  const handleNext = () => {
    if (!selectedAMC) {
      toast({
        title: "Selection Required",
        description: "Please select an AMC to continue",
        variant: "destructive",
      });
      return;
    }

    onNext({ amc: selectedAMC });
  };

  return (
    <div className="space-y-6" data-testid="search-amc-step">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for your AMC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-amc"
          />
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground" data-testid="text-search-hint">
            Type at least 2 characters to search
          </p>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8" data-testid="loader-search">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && amcs && amcs.length === 0 && searchQuery.length >= 2 && (
          <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-results">
            No AMCs found. Try a different search term.
          </p>
        )}

        {!isLoading && amcs && amcs.length > 0 && (
          <div className="space-y-3" data-testid="list-amc-results">
            {amcs.map((amc) => (
              <InstitutionResultCard
                key={amc.id}
                id={amc.id}
                name={amc.name}
                code={amc.code}
                type={amc.type}
                isSelected={selectedAMC?.id === amc.id}
                onSelect={() => handleSelectAMC(amc)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!selectedAMC}
          data-testid="button-next-step"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
