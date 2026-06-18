import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { saveToken } from "../../lib/auth";

type Role = "poster" | "referrer";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("referrer");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, bio }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data?.message ?? "Sign up failed");
      const token = res.headers.get("set-auth-token") ?? data?.token;
      if (token) await saveToken(token);
      Alert.alert(
        "Application Submitted",
        "Your account is pending admin approval. We'll notify you by email.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/") }]
      );
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message ?? "Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>SR</Text>
          </View>
          <Text style={styles.brand}>Referrd</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join as a Poster or Referrer</Text>

          {/* Role toggle */}
          <View style={styles.roleRow}>
            {(["referrer", "poster"] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                  {r === "referrer" ? "Referrer" : "Poster"}
                </Text>
                <Text style={[styles.roleDesc, role === r && { color: "#e0f2fe" }]}>
                  {r === "referrer" ? "Submit warm leads" : "Post listings"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Smith"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Short Bio (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell us a bit about yourself..."
              placeholderTextColor="#94a3b8"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Apply Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} style={styles.link}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkHighlight}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f0f9ff" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#38BDF8", alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  brand: { fontSize: 22, fontWeight: "700", color: "#0c4a6e" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    shadowColor: "#0ea5e9", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    padding: 12, alignItems: "center",
  },
  roleBtnActive: { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" },
  roleBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  roleBtnTextActive: { color: "#fff" },
  roleDesc: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  textarea: { height: 80, textAlignVertical: "top", paddingTop: 12 },
  btn: {
    backgroundColor: "#0EA5E9", borderRadius: 12, paddingVertical: 15,
    alignItems: "center", marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { marginTop: 20, alignItems: "center" },
  linkText: { fontSize: 14, color: "#64748b" },
  linkHighlight: { color: "#0EA5E9", fontWeight: "600" },
});
