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

export default function SearchBrokerStep({ onNext }: WizardStepProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<Institution | null>(null);

  // Fetch brokers based on search query
  const { data: brokers, isLoading } = useQuery<Institution[]>({
    queryKey: [`/api/account-aggregator/institutions?type=BROKER&query=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2,
    placeholderData: [],
  });

  const handleSelectBroker = (id: string) => {
    const broker = brokers?.find((b) => b.id === id);
    if (broker) {
      setSelectedBroker(broker);
    }
  };

  const handleNext = () => {
    if (!selectedBroker) {
      toast({
        title: "Selection Required",
        description: "Please select a broker to continue",
        variant: "destructive",
      });
      return;
    }

    onNext({ broker: selectedBroker });
  };

  return (
    <div className="space-y-6" data-testid="search-broker-step">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for your broker or depository..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-broker"
          />
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground" data-testid="text-search-hint">
            Type at least 2 characters to search
          </p>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8" data-testid="loading-brokers">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && brokers && brokers.length === 0 && searchQuery.length >= 2 && (
          <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-results">
            No brokers found. Try a different search term.
          </p>
        )}

        {!isLoading && brokers && brokers.length > 0 && (
          <div className="space-y-3" data-testid="broker-results">
            {brokers.map((broker) => (
              <InstitutionResultCard
                key={broker.id}
                id={broker.id}
                name={broker.name}
                code={broker.code}
                type={broker.type}
                isSelected={selectedBroker?.id === broker.id}
                onSelect={handleSelectBroker}
                data-testid={`card-broker-${broker.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedBroker}
          data-testid="button-next"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
