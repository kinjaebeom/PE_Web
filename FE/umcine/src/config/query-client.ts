import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE = 60 * 1000;

// Keep one cache for the lifetime of the application, across route changes.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE,
    },
  },
});
