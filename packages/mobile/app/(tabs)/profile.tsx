import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { clearToken } from "../../lib/auth";

export default function ProfileTab() {
  const { user, setUser } = useAuth();

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          setUser(null);
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badges}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user.role}</Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: user.status === "approved" ? "#dcfce7" : user.status === "rejected" ? "#fee2e2" : "#fef3c7"
            }]}>
              <Text style={[styles.statusBadgeText, {
                color: user.status === "approved" ? "#166534" : user.status === "rejected" ? "#991b1b" : "#92400e"
              }]}>{user.status}</Text>
            </View>
          </View>
        </View>

        {/* Info section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue} style={{ textTransform: "capitalize" }}>{user.role}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>{user.status}</Text>
          </View>
          {user.payoutEnabled && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stripe Payouts</Text>
              <Text style={[styles.infoValue, { color: "#16a34a" }]}>Connected ✓</Text>
            </View>
          )}
        </View>

        {/* Payout setup CTA */}
        {user.role === "referrer" && !user.payoutEnabled && (
          <View style={styles.payoutBanner}>
            <Text style={styles.payoutBannerTitle}>Set up payouts</Text>
            <Text style={styles.payoutBannerText}>
              Connect your bank account on the web dashboard to receive referral payouts.
            </Text>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f9ff" },
  container: { padding: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#0EA5E9",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  email: { fontSize: 14, color: "#64748b", marginBottom: 12 },
  badges: { flexDirection: "row", gap: 8 },
  roleBadge: {
    backgroundColor: "#e0f2fe", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  roleBadgeText: { color: "#0369a1", fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  statusBadgeText: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#e0f2fe",
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  infoLabel: { fontSize: 14, color: "#64748b" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  payoutBanner: {
    backgroundColor: "#fff7ed", borderRadius: 12, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: "#f97316",
  },
  payoutBannerTitle: { fontSize: 14, fontWeight: "700", color: "#c2410c", marginBottom: 4 },
  payoutBannerText: { fontSize: 13, color: "#9a3412", lineHeight: 18 },
  signOutBtn: {
    borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 8,
  },
  signOutText: { color: "#dc2626", fontSize: 15, fontWeight: "700" },
});
