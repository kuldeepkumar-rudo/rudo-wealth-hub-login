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

export default function SearchInsurerStep({ onNext }: WizardStepProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInsurer, setSelectedInsurer] = useState<Institution | null>(null);

  const { data: insurers, isLoading } = useQuery<Institution[]>({
    queryKey: [`/api/account-aggregator/institutions?type=INSURANCE&query=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2,
    placeholderData: [],
  });

  const handleSelectInsurer = (id: string) => {
    const insurer = insurers?.find((i) => i.id === id);
    if (insurer) {
      setSelectedInsurer(insurer);
    }
  };

  const handleNext = () => {
    if (!selectedInsurer) {
      toast({
        title: "Selection Required",
        description: "Please select an insurance provider to continue",
        variant: "destructive",
      });
      return;
    }

    onNext({ insurer: selectedInsurer });
  };

  return (
    <div className="space-y-6" data-testid="search-insurer-step">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for your insurance provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-insurer"
          />
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground" data-testid="text-search-hint">
            Type at least 2 characters to search
          </p>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8" data-testid="loading-insurers">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && insurers && insurers.length === 0 && searchQuery.length >= 2 && (
          <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-results">
            No insurance providers found. Try a different search term.
          </p>
        )}

        {!isLoading && insurers && insurers.length > 0 && (
          <div className="space-y-3" data-testid="insurer-results">
            {insurers.map((insurer) => (
              <InstitutionResultCard
                key={insurer.id}
                id={insurer.id}
                name={insurer.name}
                code={insurer.code}
                type={insurer.type}
                isSelected={selectedInsurer?.id === insurer.id}
                onSelect={handleSelectInsurer}
                data-testid={`card-insurer-${insurer.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedInsurer}
          data-testid="button-next"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
