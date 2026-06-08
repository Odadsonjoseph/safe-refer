import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const res = await (api.listings[":id"].$get({ param: { id } }) as Promise<Response>);
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<{ listing: any }>;
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await (api.submissions.$post({
        json: { listingId: id, leadName, leadEmail, leadPhone, notes },
      }) as Promise<Response>);
      const body = await res.json() as any;
      if (!res.ok) throw new Error(body?.error ?? "Failed to submit");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", "mine"] });
      Alert.alert("Lead Submitted!", "Your referral has been submitted and is under review.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message ?? "Could not submit lead");
    },
  });

  function handleSubmit() {
    if (!leadName || !leadEmail) {
      Alert.alert("Required", "Lead name and email are required");
      return;
    }
    submitMutation.mutate();
  }

  const listing = data?.listing;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Back nav */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#38BDF8" />
          </View>
        ) : !listing ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Listing not found</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Listing info */}
            <View style={styles.listingCard}>
              <View style={styles.cardTop}>
                <View style={styles.industryBadge}>
                  <Text style={styles.industryText}>{listing.industry}</Text>
                </View>
                <Text style={styles.payout}>${(listing.payoutAmount / 100).toFixed(0)}</Text>
              </View>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              <Text style={styles.listingDesc}>{listing.description}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Posted by</Text>
                  <Text style={styles.metaValue}>{listing.posterName}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Deadline</Text>
                  <Text style={styles.metaValue}>{listing.deadlineDays} days</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Leads</Text>
                  <Text style={styles.metaValue}>{listing.submissionsCount ?? 0}</Text>
                </View>
              </View>

              {listing.requirements && (
                <View style={styles.requirementsBox}>
                  <Text style={styles.requirementsLabel}>Requirements</Text>
                  <Text style={styles.requirementsText}>{listing.requirements}</Text>
                </View>
              )}
            </View>

            {/* Submit form (referrers only) */}
            {user?.role === "referrer" && (
              <>
                {!showForm ? (
                  <TouchableOpacity
                    style={styles.submitCTA}
                    onPress={() => setShowForm(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitCTAText}>Submit a Warm Lead →</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.form}>
                    <Text style={styles.formTitle}>Submit Lead</Text>

                    <View style={styles.field}>
                      <Text style={styles.label}>Lead Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#94a3b8"
                        value={leadName}
                        onChangeText={setLeadName}
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Lead Email *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="john@example.com"
                        placeholderTextColor="#94a3b8"
                        value={leadEmail}
                        onChangeText={setLeadEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Lead Phone</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="+1 (555) 000-0000"
                        placeholderTextColor="#94a3b8"
                        value={leadPhone}
                        onChangeText={setLeadPhone}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Notes</Text>
                      <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="How do you know this lead? Why are they a good fit?"
                        placeholderTextColor="#94a3b8"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, submitMutation.isPending && styles.submitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.submitBtnText}>Submit Lead</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {user?.role === "poster" && (
              <View style={styles.posterNote}>
                <Text style={styles.posterNoteText}>You posted this listing. Manage it on the web dashboard.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f9ff" },
  backBtn: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backText: { color: "#0EA5E9", fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#94a3b8", fontSize: 16 },
  container: { padding: 20 },
  listingCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: "#e0f2fe",
    shadowColor: "#0ea5e9", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  industryBadge: { backgroundColor: "#e0f2fe", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  industryText: { color: "#0369a1", fontSize: 12, fontWeight: "600" },
  payout: { fontSize: 28, fontWeight: "800", color: "#0EA5E9" },
  listingTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  listingDesc: { fontSize: 14, color: "#64748b", lineHeight: 20, marginBottom: 16 },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  metaItem: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, alignItems: "center" },
  metaLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  requirementsBox: { backgroundColor: "#f0f9ff", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#38BDF8" },
  requirementsLabel: { fontSize: 12, fontWeight: "700", color: "#0369a1", marginBottom: 4 },
  requirementsText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  submitCTA: {
    backgroundColor: "#0EA5E9", borderRadius: 16, paddingVertical: 18,
    alignItems: "center", marginBottom: 20,
  },
  submitCTAText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  form: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "#e0f2fe",
  },
  formTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  textarea: { height: 90, textAlignVertical: "top", paddingTop: 12 },
  submitBtn: {
    backgroundColor: "#0EA5E9", borderRadius: 12, paddingVertical: 15,
    alignItems: "center", marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelText: { color: "#94a3b8", fontSize: 14 },
  posterNote: {
    backgroundColor: "#f8fafc", borderRadius: 12, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0",
  },
  posterNoteText: { fontSize: 13, color: "#64748b", textAlign: "center" },
});
