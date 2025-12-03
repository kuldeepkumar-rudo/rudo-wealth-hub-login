import { useAuth as useContextAuth } from "@/lib/auth-context";

export function useAuth() {
  const auth = useContextAuth();
  return {
    ...auth,
    isLoading: auth.isInitializing,
    error: null,
  };
}
