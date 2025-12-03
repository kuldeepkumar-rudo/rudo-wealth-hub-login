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

export default function SearchBankStep({ onNext }: WizardStepProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<Institution | null>(null);

  const { data: banks, isLoading } = useQuery<Institution[]>({
    queryKey: [`/api/account-aggregator/institutions?type=BANK&query=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2,
    placeholderData: [],
  });

  const handleSelectBank = (id: string) => {
    const bank = banks?.find((b) => b.id === id);
    if (bank) {
      setSelectedBank(bank);
    }
  };

  const handleNext = () => {
    if (!selectedBank) {
      toast({
        title: "Selection Required",
        description: "Please select a bank to continue",
        variant: "destructive",
      });
      return;
    }

    onNext({ bank: selectedBank });
  };

  return (
    <div className="space-y-6" data-testid="search-bank-step">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for your bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-bank"
          />
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground" data-testid="text-search-hint">
            Type at least 2 characters to search
          </p>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8" data-testid="loading-banks">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && banks && banks.length === 0 && searchQuery.length >= 2 && (
          <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-results">
            No banks found. Try a different search term.
          </p>
        )}

        {!isLoading && banks && banks.length > 0 && (
          <div className="space-y-3" data-testid="bank-results">
            {banks.map((bank) => (
              <InstitutionResultCard
                key={bank.id}
                id={bank.id}
                name={bank.name}
                code={bank.code}
                type={bank.type}
                isSelected={selectedBank?.id === bank.id}
                onSelect={handleSelectBank}
                data-testid={`card-bank-${bank.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedBank}
          data-testid="button-next"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
