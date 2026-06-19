import { QueryClient } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(window.location.origin);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
