import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Holding } from "@shared/schema";

const transactionFormSchema = z.object({
  holdingId: z.string().min(1, "Please select a holding"),
  transactionType: z.enum(["buy", "sell", "dividend", "interest", "deposit", "withdrawal"]),
  quantity: z.string().min(1, "Quantity is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Quantity must be a positive number"
  ),
  price: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Price must be a non-negative number"
  ),
  fees: z.string().optional().refine(
    (val) => !val || !isNaN(parseFloat(val)),
    "Fees must be a valid number"
  ),
  transactionDate: z.date({
    required_error: "Transaction date is required",
  }),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const transactionTypeOptions = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "dividend", label: "Dividend" },
  { value: "interest", label: "Interest" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
];

interface AddTransactionDialogProps {
  portfolioId: string;
}

export function AddTransactionDialog({ portfolioId }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: holdings } = useQuery<Holding[]>({
    queryKey: ['/api/portfolios', portfolioId, 'holdings'],
    enabled: !!portfolioId && open,
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      holdingId: "",
      transactionType: "buy",
      quantity: "",
      price: "",
      fees: "",
      transactionDate: new Date(),
      notes: "",
    },
  });

  const calculateTotalAmount = (quantity: number, price: number, fees: number, transactionType: string): number => {
    const baseAmount = quantity * price;
    if (['sell', 'withdrawal'].includes(transactionType)) {
      return baseAmount - fees;
    }
    return baseAmount + fees;
  };

  const createTransaction = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const quantity = parseFloat(data.quantity);
      const price = parseFloat(data.price);
      const fees = data.fees ? parseFloat(data.fees) : 0;
      const totalAmount = calculateTotalAmount(quantity, price, fees, data.transactionType);

      return apiRequest('POST', '/api/transactions', {
        holdingId: data.holdingId,
        portfolioId,
        transactionType: data.transactionType,
        quantity: data.quantity,
        price: data.price,
        totalAmount: totalAmount.toString(),
        fees: data.fees || "0",
        transactionDate: data.transactionDate.toISOString(),
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', portfolioId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', portfolioId, 'holdings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', portfolioId] });
      toast({
        title: "Transaction added",
        description: "Your transaction has been recorded successfully.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add transaction",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormValues) => {
    createTransaction.mutate(data);
  };

  const selectedHolding = holdings?.find(h => h.id === form.watch("holdingId"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-transaction">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new transaction for your portfolio. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="holdingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holding *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-holding">
                        <SelectValue placeholder="Select a holding" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {holdings && holdings.length > 0 ? (
                        holdings.map((holding) => (
                          <SelectItem key={holding.id} value={holding.id}>
                            {holding.assetName} ({holding.assetType})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No holdings available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-transaction-type-form">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (INR) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fees (INR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-fees"
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Include any brokerage or transaction fees.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedHolding && form.watch("quantity") && form.watch("price") && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Total Amount: <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat('en-IN', { 
                      style: 'currency', 
                      currency: 'INR' 
                    }).format(
                      calculateTotalAmount(
                        parseFloat(form.watch("quantity") || "0"),
                        parseFloat(form.watch("price") || "0"),
                        parseFloat(form.watch("fees") || "0"),
                        form.watch("transactionType")
                      )
                    )}
                  </span>
                  {['sell', 'withdrawal'].includes(form.watch("transactionType")) && parseFloat(form.watch("fees") || "0") > 0 && (
                    <span className="text-xs ml-1">(after fees deducted)</span>
                  )}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-date-picker"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this transaction..."
                      className="resize-none"
                      {...field}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-transaction"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransaction.isPending}
                data-testid="button-submit-transaction"
              >
                {createTransaction.isPending ? "Adding..." : "Add Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
