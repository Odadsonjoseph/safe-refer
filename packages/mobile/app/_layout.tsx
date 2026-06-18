import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/analytics";
import { useAuth } from "../hooks/useAuth";
import { usePushToken } from "../hooks/usePushToken";
import appJson from "../app.json";

const queryClient = new QueryClient();

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

// Inner component so we can use hooks after providers are mounted
function AppWithNotifications() {
  const { user } = useAuth();
  usePushToken(!!user); // registers push token once user is authenticated
  return <Slot />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      {/* Runable analytics provider — do not remove, required for analytics tracking */}
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AppWithNotifications />
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
