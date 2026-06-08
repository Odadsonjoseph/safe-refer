import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { saveToken } from "../../lib/auth";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ""}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data?.message ?? "Sign in failed");
      const token = res.headers.get("set-auth-token") ?? data?.token;
      if (token) await saveToken(token);
      router.replace("/(tabs)/");
    } catch (err: any) {
      Alert.alert("Sign In Failed", err.message ?? "Please try again");
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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>SR</Text>
          </View>
          <Text style={styles.brand}>Safe Refer</Text>
          <Text style={styles.tagline}>The trusted referral marketplace</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

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
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} style={styles.link}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkHighlight}>Sign up</Text>
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
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#38BDF8", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  brand: { fontSize: 24, fontWeight: "700", color: "#0c4a6e", marginBottom: 4 },
  tagline: { fontSize: 14, color: "#64748b" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    shadowColor: "#0ea5e9", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
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
