import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, LogIn } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Colors } from "../constants/Colors";
import { useMutation } from "@tanstack/react-query";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/auth/login", { email, password });
      return response.data;
    },
    onSuccess: async (data) => {
      await login(data.user, data.token);
    },
  });

  const handleLogin = () => {
    if (!email || !password) return;
    loginMutation.mutate();
  };

  const error = loginMutation.error ? (loginMutation.error as any).response?.data?.message || "Login failed" : null;
  const loading = loginMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          className="px-6"
        >
          <View className="w-full max-w-[450px]">

          <View className="mb-10 items-center">
            <View className="w-20 h-20 bg-primary/20 rounded-3xl items-center justify-center mb-6">
              <LogIn size={40} color={Colors.primary} />
            </View>
            <Text className="text-white text-4xl font-extrabold tracking-tight">Meetel <Text className="text-primary">ERP</Text></Text>
            <Text className="text-muted-foreground text-lg mt-2">Sign in to your account</Text>
          </View>

          <View className="space-y-4">
            {/* Email Input */}
            <View className="bg-card border border-border rounded-2xl flex-row items-center px-4 h-16 mb-4">
              <Mail size={20} color={Colors.muted} />
              <TextInput
                className="flex-1 ml-3 text-white text-base"
                placeholder="Email address"
                placeholderTextColor={Colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View className="bg-card border border-border rounded-2xl flex-row items-center px-4 h-16 mb-4">
              <Lock size={20} color={Colors.muted} />
              <TextInput
                className="flex-1 ml-3 text-white text-base"
                placeholder="Password"
                placeholderTextColor={Colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {error && (
              <View className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-4">
                <Text className="text-red-500 text-center font-medium">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className={`h-16 rounded-2xl items-center justify-center shadow-xl ${loading ? "bg-primary/50" : "bg-primary"
                }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Login</Text>
              )}
            </TouchableOpacity>

            {/* Quick Login Buttons (Dev Only) */}
            <View className="mt-8">
              <Text className="text-muted-foreground text-center mb-4 text-sm font-medium">QUICK LOGIN (DEVELOPMENT)</Text>
              <View className="flex-row flex-wrap justify-between gap-3">
                {[
                  { label: "Admin", email: "admin@company.com", pass: "adminpassword" },
                  { label: "Sales", email: "sarah@company.com", pass: "salespassword" },
                  { label: "Whouse", email: "wally@company.com", pass: "1234" },
                ].map((u) => (
                  <TouchableOpacity
                    key={u.label}
                    onPress={() => {
                      setEmail(u.email);
                      setPassword(u.pass);
                    }}
                    className="bg-card border border-border px-4 py-2 rounded-xl flex-1 items-center"
                  >
                    <Text className="text-white text-xs font-bold">{u.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>


          <View className="mt-12 items-center">
            <Text className="text-muted-foreground">
              By logging in, you agree to our
              <Text className="text-primary font-bold"> Terms of Service</Text>
            </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
