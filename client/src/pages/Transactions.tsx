import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@shared/schema";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";

const transactionTypeLabels: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  buy: { label: "Buy", variant: "default" },
  sell: { label: "Sell", variant: "destructive" },
  dividend: { label: "Dividend", variant: "secondary" },
  interest: { label: "Interest", variant: "secondary" },
  deposit: { label: "Deposit", variant: "default" },
  withdrawal: { label: "Withdrawal", variant: "destructive" },
  fee: { label: "Fee", variant: "outline" },
  tax: { label: "Tax", variant: "outline" },
};

type GroupBy = 'none' | 'month' | 'type';

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { portfolioId, isLoading: portfolioLoading } = useUserPortfolio();

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/portfolios', portfolioId, 'transactions'],
    enabled: !!portfolioId,
  });

  const isLoading = portfolioLoading || transactionsLoading;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions || [];
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.transactionType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.transactionType === selectedType);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [transactions, searchQuery, selectedType, sortOrder]);

  // Group transactions
  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All': filteredTransactions };
    }

    const grouped: Record<string, Transaction[]> = {};

    filteredTransactions.forEach(t => {
      let key: string;
      
      if (groupBy === 'month') {
        key = format(new Date(t.transactionDate), 'MMMM yyyy');
      } else { // type
        key = transactionTypeLabels[t.transactionType]?.label || t.transactionType;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    return grouped;
  }, [filteredTransactions, groupBy]);

  // Calculate summary statistics
  const totalInflow = filteredTransactions
    .filter(t => ['buy', 'deposit', 'dividend', 'interest'].includes(t.transactionType))
    .reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);

  const totalOutflow = filteredTransactions
    .filter(t => ['sell', 'withdrawal', 'fee', 'tax'].includes(t.transactionType))
    .reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);

  const netAmount = totalInflow - totalOutflow;

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Quantity', 'Price', 'Fees', 'Total Amount', 'Notes'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.transactionDate), 'yyyy-MM-dd'),
      t.transactionType,
      t.quantity,
      t.price,
      t.fees || '0',
      t.totalAmount,
      t.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-transactions-title">Transaction History</h1>
          <p className="text-muted-foreground">Complete record of all your investment transactions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {portfolioId && <AddTransactionDialog portfolioId={portfolioId} />}
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-inflow">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +₹{totalInflow.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {filteredTransactions.filter(t => ['buy', 'deposit', 'dividend', 'interest'].includes(t.transactionType)).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-outflow">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -₹{totalOutflow.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {filteredTransactions.filter(t => ['sell', 'withdrawal', 'fee', 'tax'].includes(t.transactionType)).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-net-amount">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netAmount >= 0 ? '+' : ''}₹{netAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTransactions.length} total transactions
            </p>
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
                placeholder="Search transactions by notes or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-transactions"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-transaction-type">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(transactionTypeLabels).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v: GroupBy) => setGroupBy(v)}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-group-by">
                <SelectValue placeholder="Group By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              data-testid="button-toggle-sort"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([groupName, groupTransactions]) => (
            <Card key={groupName}>
              <CardHeader>
                <CardTitle>{groupName}</CardTitle>
                <CardDescription>
                  {groupTransactions.length} transaction{groupTransactions.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupTransactions.map((transaction) => {
                      const typeConfig = transactionTypeLabels[transaction.transactionType] || { label: transaction.transactionType, variant: "outline" as const };
                      const isPositive = ['buy', 'deposit', 'dividend', 'interest'].includes(transaction.transactionType);
                      
                      return (
                        <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeConfig.variant}>
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{parseFloat(transaction.quantity).toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">
                            ₹{parseFloat(transaction.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.fees && parseFloat(transaction.fees) > 0 
                              ? `₹${parseFloat(transaction.fees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}₹{parseFloat(transaction.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {transaction.notes || '-'}
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
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No transactions found matching your filters.</p>
              {(searchQuery || selectedType !== 'all') && (
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
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
