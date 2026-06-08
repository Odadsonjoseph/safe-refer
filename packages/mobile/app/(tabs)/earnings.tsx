import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";

export default function EarningsTab() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await (api.users.earnings.$get() as Promise<Response>);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<any>;
    },
  });

  const stats = data?.stats ?? {};
  const history = data?.history ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38BDF8" />
        }
      >
        <Text style={styles.title}>Earnings</Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#38BDF8" />
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <Text style={styles.statLabelLight}>Total Earned</Text>
                <Text style={styles.statValueLight}>
                  ${((stats.totalEarned ?? 0) / 100).toFixed(2)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>
                  ${((stats.pendingPayout ?? 0) / 100).toFixed(2)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Closed Deals</Text>
                <Text style={styles.statValue}>{stats.closedDeals ?? 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Approved</Text>
                <Text style={styles.statValue}>{stats.approvedLeads ?? 0}</Text>
              </View>
            </View>

            {/* Payout status */}
            {data?.payoutEnabled === false && (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>
                  Connect your bank account to receive payouts. Visit the web dashboard to set up Stripe.
                </Text>
              </View>
            )}

            {/* History */}
            <Text style={styles.sectionTitle}>Payout History</Text>
            {history.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No payouts yet</Text>
              </View>
            ) : (
              history.map((item: any) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyListing}>{item.listingTitle}</Text>
                    <Text style={styles.historyDate}>{new Date(item.paidAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.historyAmount}>
                    +${(item.amount / 100).toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f9ff" },
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#0c4a6e", marginBottom: 20 },
  center: { paddingTop: 60, alignItems: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#e0f2fe",
    shadowColor: "#0ea5e9", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardPrimary: { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" },
  statLabel: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  statLabelLight: { fontSize: 12, color: "#bae6fd", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  statValueLight: { fontSize: 22, fontWeight: "800", color: "#fff" },
  banner: {
    backgroundColor: "#fef3c7", borderRadius: 12, padding: 14, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: "#f59e0b",
  },
  bannerText: { fontSize: 13, color: "#92400e", lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: "#94a3b8", fontSize: 14 },
  historyCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0f2fe",
  },
  historyListing: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  historyDate: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  historyAmount: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
});
