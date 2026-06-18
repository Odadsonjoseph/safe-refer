import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListingsTab() {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const res = await (api.listings.$get() as Promise<Response>);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ listings: any[] }>;
    },
  });

  const listings = (data?.listings ?? []).filter((l: any) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Referrd</Text>
        <Text style={styles.headerSub}>Find referral opportunities</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          placeholder="Search listings..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38BDF8" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No listings found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/listings/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.industryBadge}>
                  <Text style={styles.industryText}>{item.industry}</Text>
                </View>
                <Text style={styles.payout}>${(item.payoutAmount / 100).toFixed(0)}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>{item.posterName}</Text>
                <Text style={styles.cardMeta}>
                  {item.submissionsCount ?? 0} leads · {item.deadlineDays}d deadline
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f9ff" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  logo: { fontSize: 22, fontWeight: "800", color: "#0c4a6e" },
  headerSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12 },
  search: {
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0",
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#0f172a",
  },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#94a3b8", fontSize: 15 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#e0f2fe",
    shadowColor: "#0ea5e9", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  industryBadge: {
    backgroundColor: "#e0f2fe", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  industryText: { color: "#0369a1", fontSize: 12, fontWeight: "600" },
  payout: { fontSize: 20, fontWeight: "800", color: "#0EA5E9" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#64748b", lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  cardMeta: { fontSize: 12, color: "#94a3b8" },
});
