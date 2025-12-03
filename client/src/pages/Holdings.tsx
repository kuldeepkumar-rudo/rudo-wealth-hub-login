import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LayoutGrid, 
  List, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Target,
  ArrowUpDown,
  Filter,
  Plus
} from "lucide-react";
import type { EnhancedHolding } from "@shared/analyticsTypes";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";

const assetTypeLabels: Record<string, string> = {
  mutual_fund: "Mutual Funds",
  stock: "Stocks",
  fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits",
  insurance: "Insurance",
  bond: "Bonds",
  real_estate: "Real Estate",
  gold: "Gold",
  other: "Other",
};

type ViewMode = 'table' | 'cards';
type SortField = 'name' | 'value' | 'returns' | 'returnsPercent';
type SortOrder = 'asc' | 'desc';

export default function Holdings() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { portfolioId, isLoading: portfolioLoading } = useUserPortfolio();

  const { data: holdings, isLoading: holdingsLoading } = useQuery<EnhancedHolding[]>({
    queryKey: ['/api/portfolios', portfolioId, 'holdings'],
    enabled: !!portfolioId,
  });

  const isLoading = portfolioLoading || holdingsLoading;

  // Helper function to format holding period
  const formatHoldingPeriod = (daysHeld: number): string => {
    if (daysHeld < 30) {
      return `${daysHeld}d`;
    }
    const months = Math.floor(daysHeld / 30);
    const years = Math.floor(months / 12);
    if (years > 0) {
      const remainingMonths = months % 12;
      return remainingMonths === 0 ? `${years}y` : `${years}y ${remainingMonths}m`;
    }
    return `${months}m`;
  };

  // Helper to get tax badge variant
  const getTaxBadgeVariant = (classification: string): "default" | "secondary" | "outline" => {
    switch (classification) {
      case "LTCG":
        return "default";
      case "STCG":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Calculate summary statistics
  const totalValue = holdings?.reduce((sum, h) => sum + parseFloat(h.currentValue), 0) || 0;
  const totalInvested = holdings?.reduce((sum, h) => sum + parseFloat(h.investedAmount), 0) || 0;
  const totalReturns = totalValue - totalInvested;
  const totalReturnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
  const gainers = holdings?.filter(h => parseFloat(h.returns || "0") > 0).length || 0;
  const losers = holdings?.filter(h => parseFloat(h.returns || "0") < 0).length || 0;

  // Filter and sort holdings
  let filteredHoldings = holdings || [];
  
  if (searchQuery) {
    filteredHoldings = filteredHoldings.filter(h => 
      h.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.assetSymbol?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (selectedAssetType !== 'all') {
    filteredHoldings = filteredHoldings.filter(h => h.assetType === selectedAssetType);
  }

  filteredHoldings = [...filteredHoldings].sort((a, b) => {
    let aVal: number, bVal: number;
    
    switch (sortField) {
      case 'name':
        return sortOrder === 'asc' 
          ? a.assetName.localeCompare(b.assetName)
          : b.assetName.localeCompare(a.assetName);
      case 'value':
        aVal = parseFloat(a.currentValue);
        bVal = parseFloat(b.currentValue);
        break;
      case 'returns':
        aVal = parseFloat(a.returns || "0");
        bVal = parseFloat(b.returns || "0");
        break;
      case 'returnsPercent':
        aVal = parseFloat(a.returnsPercentage || "0");
        bVal = parseFloat(b.returnsPercentage || "0");
        break;
      default:
        return 0;
    }
    
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const groupedHoldings = filteredHoldings.reduce((acc, holding) => {
    const type = holding.assetType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(holding);
    return acc;
  }, {} as Record<string, EnhancedHolding[]>);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-holdings-title">Holdings</h1>
          <p className="text-muted-foreground">Detailed view of all your investments</p>
        </div>
        <Link href="/connect">
          <Button data-testid="button-add-holding">
            <Plus className="w-4 h-4 mr-2" />
            Add Holdings
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-value">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Invested: ₹{totalInvested.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-returns">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            {totalReturns >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturns >= 0 ? '+' : ''}₹{totalReturns.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalReturns >= 0 ? '+' : ''}{totalReturnsPercent.toFixed(2)}% overall
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-performance-split">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Split</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Gainers</div>
                <div className="text-xl font-bold text-green-600">{gainers}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Losers</div>
                <div className="text-xl font-bold text-red-600">{losers}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holdings by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-holdings"
              />
            </div>
            <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-asset-type">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Asset Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Types</SelectItem>
                {Object.entries(assetTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('table')}
                data-testid="button-view-table"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('cards')}
                data-testid="button-view-cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Display */}
      {filteredHoldings.length > 0 ? (
        viewMode === 'table' ? (
          <div className="space-y-6">
            {Object.entries(groupedHoldings).map(([assetType, typeHoldings]) => (
              <Card key={assetType}>
                <CardHeader>
                  <CardTitle>{assetTypeLabels[assetType] || assetType}</CardTitle>
                  <CardDescription>
                    {typeHoldings.length} holding{typeHoldings.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleSort('name')}
                              className="hover-elevate"
                            >
                              Asset Name
                              {sortField === 'name' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                            </Button>
                          </TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Holding Period</TableHead>
                        <TableHead>Tax Class</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Current Price</TableHead>
                        <TableHead className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleSort('value')}
                            className="hover-elevate"
                          >
                            Current Value
                            {sortField === 'value' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleSort('returns')}
                            className="hover-elevate"
                          >
                            Returns
                            {sortField === 'returns' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeHoldings.map((holding) => {
                        const returns = parseFloat(holding.returns || "0");
                        const returnsPercent = parseFloat(holding.returnsPercentage || "0");
                        
                        return (
                          <TableRow 
                            key={holding.id} 
                            data-testid={`row-holding-${holding.id}`}
                            className="hover-elevate cursor-pointer"
                            onClick={() => window.location.href = `/holdings/${holding.id}`}
                          >
                            <TableCell className="font-medium">{holding.assetName}</TableCell>
                            <TableCell>{holding.assetSymbol || '-'}</TableCell>
                            <TableCell>
                              <span className="text-sm" data-testid={`text-holding-period-${holding.id}`}>
                                {formatHoldingPeriod(holding.holdingPeriod.daysHeld)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={getTaxBadgeVariant(holding.holdingPeriod.taxClassification)}
                                data-testid={`badge-tax-${holding.id}`}
                              >
                                {holding.holdingPeriod.taxClassification}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{parseFloat(holding.quantity).toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right">₹{parseFloat(holding.averagePrice).toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{parseFloat(holding.currentPrice).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₹{parseFloat(holding.currentValue).toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right">
                              <div className={returns >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="font-semibold">
                                  {returns >= 0 ? '+' : ''}₹{returns.toLocaleString('en-IN')}
                                </div>
                                <Badge variant={returns >= 0 ? "default" : "destructive"} className="mt-1">
                                  {returns >= 0 ? '+' : ''}{returnsPercent.toFixed(2)}%
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHoldings.map((holding) => {
              const returns = parseFloat(holding.returns || "0");
              const returnsPercent = parseFloat(holding.returnsPercentage || "0");
              
              return (
                <Card 
                  key={holding.id} 
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-holding-${holding.id}`}
                  onClick={() => window.location.href = `/holdings/${holding.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{holding.assetName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{assetTypeLabels[holding.assetType]}</Badge>
                          {holding.assetSymbol && (
                            <span className="text-xs">{holding.assetSymbol}</span>
                          )}
                        </CardDescription>
                      </div>
                      {returns >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Value</span>
                      <span className="font-semibold">₹{parseFloat(holding.currentValue).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Holding Period</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" data-testid={`text-holding-period-${holding.id}`}>
                          {formatHoldingPeriod(holding.holdingPeriod.daysHeld)}
                        </span>
                        <Badge 
                          variant={getTaxBadgeVariant(holding.holdingPeriod.taxClassification)}
                          data-testid={`badge-tax-${holding.id}`}
                        >
                          {holding.holdingPeriod.taxClassification}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Quantity</span>
                      <span className="text-sm">{parseFloat(holding.quantity).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Returns</span>
                      <div className={`text-right ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="font-semibold text-sm">
                          {returns >= 0 ? '+' : ''}₹{returns.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs">
                          {returns >= 0 ? '+' : ''}{returnsPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No holdings found matching your filters.</p>
              {(searchQuery || selectedAssetType !== 'all') && (
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAssetType('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
