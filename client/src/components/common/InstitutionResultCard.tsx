import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Check } from "lucide-react";

interface InstitutionResultCardProps {
  id: string;
  name: string;
  code?: string;
  type?: string;
  description?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  showSelectButton?: boolean;
}

export default function InstitutionResultCard({
  id,
  name,
  code,
  type,
  description,
  isSelected = false,
  onSelect,
  showSelectButton = true,
}: InstitutionResultCardProps) {
  return (
    <Card
      className={`hover-elevate transition-all ${
        isSelected ? "border-primary" : ""
      }`}
      data-testid={`institution-card-${id}`}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 h-12 w-12 rounded-md bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base" data-testid={`text-institution-name-${id}`}>
                  {name}
                </CardTitle>
                {code && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-code-${id}`}>
                    {code}
                  </Badge>
                )}
                {type && (
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${id}`}>
                    {type}
                  </Badge>
                )}
              </div>

              {description && (
                <CardDescription className="text-xs line-clamp-2">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>

          {showSelectButton && (
            <Button
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect?.(id)}
              data-testid={`button-select-${id}`}
              className="flex-shrink-0 gap-2"
            >
              {isSelected && <Check className="h-4 w-4" />}
              {isSelected ? "Selected" : "Select"}
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
