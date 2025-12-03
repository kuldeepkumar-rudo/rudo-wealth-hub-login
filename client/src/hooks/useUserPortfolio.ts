import { useQuery } from "@tanstack/react-query";
import type { Portfolio } from "@shared/schema";
import { useAuth } from "./useAuth";

export function useUserPortfolio() {
  const { user, isAuthenticated } = useAuth();

  const { data: portfolios, isLoading: portfoliosLoading, error } = useQuery<Portfolio[]>({
    queryKey: ["/api/users", user?.id, "portfolios"],
    enabled: isAuthenticated && !!user?.id,
  });

  const primaryPortfolio = portfolios?.[0] || null;

  return {
    user,
    isAuthenticated,
    portfolios: portfolios || [],
    primaryPortfolio,
    portfolioId: primaryPortfolio?.id || null,
    isLoading: portfoliosLoading,
    error,
  };
}
