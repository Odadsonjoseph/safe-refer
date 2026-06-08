import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: "#fef3c7", text: "#92400e" },
  approved: { bg: "#e0f2fe", text: "#0369a1" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
  closed:   { bg: "#dcfce7", text: "#166534" },
  paid:     { bg: "#dcfce7", text: "#166534" },
};

export default function SubmissionsTab() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["submissions", "mine"],
    queryFn: async () => {
      const res = await (api.submissions.mine.$get() as Promise<Response>);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ submissions: any[] }>;
    },
  });

  const submissions = data?.submissions ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Leads</Text>
        <Text style={styles.subtitle}>Track your submitted referrals</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38BDF8" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No leads submitted yet</Text>
              <Text style={styles.emptyHint}>Browse listings and submit warm leads</Text>
            </View>
          }
          renderItem={({ item }) => {
            const colors = STATUS_COLORS[item.status] ?? { bg: "#f1f5f9", text: "#64748b" };
            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadName}>{item.leadName}</Text>
                    <Text style={styles.leadEmail}>{item.leadEmail}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.badgeText, { color: colors.text }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.listingTitle}>{item.listingTitle}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.meta}>
                    Payout: <Text style={styles.payout}>${(item.payoutAmount / 100).toFixed(2)}</Text>
                  </Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f9ff" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#0c4a6e" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptyHint: { fontSize: 13, color: "#94a3b8" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#e0f2fe",
    shadowColor: "#0ea5e9", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  leadName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  leadEmail: { fontSize: 12, color: "#64748b", marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  listingTitle: { fontSize: 13, color: "#64748b", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, color: "#94a3b8" },
  payout: { color: "#0EA5E9", fontWeight: "700" },
});
