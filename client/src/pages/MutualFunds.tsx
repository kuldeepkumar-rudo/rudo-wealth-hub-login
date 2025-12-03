import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MutualFundScheme {
  id: string;
  schemeCode: string;
  schemeName: string;
  category?: string;
  subCategory?: string;
  amcName?: string;
  currentNav?: string | number;
  navDate?: string;
  returns?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResponse {
  schemes: MutualFundScheme[];
  source: "cache" | "api";
}

export default function MutualFunds() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Proper debounce using useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    // Cleanup function clears the timer on each searchQuery change
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: [`/api/mutual-funds/search?q=${debouncedQuery}`],
    enabled: debouncedQuery.length >= 2,
  });

  const schemes = data?.schemes || [];
  const source = data?.source || "cache";

  const formatCurrency = (value: string | number | undefined) => {
    if (!value) return "—";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `₹${num.toFixed(2)}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return "—";
    const isPositive = value >= 0;
    return (
      <span className={isPositive ? "text-green-500" : "text-red-500"}>
        {isPositive ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />}
        {Math.abs(value).toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mutual Funds</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search and explore 40,000+ mutual fund schemes
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by fund name, AMC, or scheme code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-mutual-fund-search"
            />
          </div>
          {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
            <p className="text-xs text-muted-foreground mt-2">
              Please enter at least 2 characters to search
            </p>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {debouncedQuery.length >= 2 && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Search Results
              </h2>
              {!isLoading && schemes.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Found {schemes.length} scheme{schemes.length !== 1 ? "s" : ""}
                  {source === "cache" && " (from cache)"}
                </p>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12" data-testid="loading-search">
              <div className="space-y-3 text-center">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-muted-foreground">Searching funds...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive" data-testid="error-search">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-destructive">
                  Failed to search mutual funds. Please try again.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && schemes.length === 0 && (
            <Card data-testid="empty-search">
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No mutual funds found for "{debouncedQuery}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try different keywords or check spelling
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results Grid */}
          {!isLoading && !error && schemes.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schemes.map((scheme) => (
                <Link 
                  key={scheme.id} 
                  href={`/mutual-funds/${scheme.schemeCode}`}
                >
                  <Card className="hover-elevate active-elevate-2 h-full" data-testid={`card-fund-${scheme.schemeCode}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2" data-testid={`text-fund-name-${scheme.schemeCode}`}>
                            {scheme.schemeName}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {scheme.amcName || "—"}
                          </CardDescription>
                        </div>
                        <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Category Badges */}
                      <div className="flex flex-wrap gap-1">
                        {scheme.category && (
                          <Badge variant="secondary" className="text-xs">
                            {scheme.category}
                          </Badge>
                        )}
                        {scheme.subCategory && (
                          <Badge variant="outline" className="text-xs">
                            {scheme.subCategory}
                          </Badge>
                        )}
                      </div>

                      {/* NAV */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Current NAV</span>
                        <span className="text-sm font-semibold" data-testid={`text-nav-${scheme.schemeCode}`}>
                          {formatCurrency(scheme.currentNav)}
                        </span>
                      </div>

                      {/* Returns */}
                      {scheme.returns && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">1Y Return</span>
                            <span className="text-sm font-medium">
                              {formatPercentage(scheme.returns["1y"])}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">3Y Return</span>
                            <span className="text-sm font-medium">
                              {formatPercentage(scheme.returns["3y"])}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* NAV Date */}
                      {scheme.navDate && (
                        <p className="text-xs text-muted-foreground">
                          As of {new Date(scheme.navDate).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {debouncedQuery.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Find Your Perfect Fund</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start typing to search through our comprehensive database of mutual funds. 
              Search by fund name, AMC, category, or scheme code.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
