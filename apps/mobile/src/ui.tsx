import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Queries } from "@jojobuilds/api-client";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./auth";

export const colors = {
  navy: "#132535",
  paper: "#f7f6f1",
  white: "#fffefa",
  terra: "#a44f36",
  line: "#e4e5d9",
  muted: "#858c7d",
  green: "#218565",
  red: "#bd534c",
  amber: "#a47b26",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.navy,
  },
  brand: { color: "#e8dbc0", fontSize: 18, fontWeight: "800", letterSpacing: 1.5 },
  subBrand: { color: "#acb5b6", fontSize: 11, marginTop: 7 },
  content: { padding: 18, paddingBottom: 35, gap: 16 },
  eyebrow: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  title: { color: colors.navy, fontSize: 27, fontWeight: "600", letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  card: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 9,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  heading: { fontSize: 17, fontWeight: "600", color: colors.navy },
  text: { color: colors.navy, fontSize: 13, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  amount: { color: colors.navy, fontSize: 30, fontWeight: "600", letterSpacing: -1 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.white,
    color: colors.navy,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 46,
    fontSize: 14,
  },
  label: { color: "#67715d", fontSize: 11, fontWeight: "600", marginBottom: 7 },
  button: {
    backgroundColor: colors.terra,
    borderRadius: 6,
    padding: 14,
    minHeight: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  secondaryText: { color: colors.navy },
  error: {
    backgroundColor: "#f8eae5",
    borderColor: "#edcfc6",
    borderWidth: 1,
    borderRadius: 7,
    padding: 13,
    gap: 8,
  },
  errorText: { color: "#a74d42", fontSize: 12, lineHeight: 19 },
  badge: {
    backgroundColor: "#eef0e7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#727e67", fontSize: 9, fontWeight: "600" },
  separator: { height: 1, backgroundColor: colors.line, marginVertical: 7 },
  empty: { padding: 30, alignItems: "center", gap: 10 },
  metrics: { flexDirection: "row", gap: 12 },
  metric: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    padding: 16,
    gap: 8,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 7,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, color: colors.navy, paddingVertical: 13, fontSize: 12 },
});

export function useResource<K extends keyof Queries>(resource: K, enabled = true) {
  const { api, org } = useAuth();
  return useQuery({
    queryKey: [org?.id, resource],
    queryFn: () => api.get(resource),
    enabled: !!org && enabled,
  });
}
export function Screen({
  title,
  subtitle,
  children,
  refreshing = false,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { org } = useAuth();
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>JOJOBUILDS</Text>
        <Text style={styles.subBrand}>{org?.name ?? "Landlord workspace"}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.terra}
            />
          ) : undefined
        }
      >
        <View>
          <Text style={styles.eyebrow}>YOUR PORTFOLIO, IN FOCUS</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {org?.demo && <Tag text="DEMO — synthetic records only" />}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Tag({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "green" | "red" | "neutral";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "green" && { backgroundColor: "#eaf5ec" },
        tone === "red" && { backgroundColor: "#fbece7" },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "green" && { color: colors.green },
          tone === "red" && { color: colors.red },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}
export function ErrorState({ error, retry }: { error: Error | string; retry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Text style={styles.errorText}>{typeof error === "string" ? error : error.message}</Text>
      {retry && <Button label="Retry" secondary onPress={retry} />}
    </View>
  );
}
export function LoadingState() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.terra} />
      <Text style={styles.muted}>Loading your workspace...</Text>
    </View>
  );
}
export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="leaf-outline" size={28} color={colors.muted} />
      <Text style={styles.heading}>{title}</Text>
      {message && <Text style={styles.muted}>{message}</Text>}
    </View>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={17} color={colors.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}
export function useRefresh() {
  const client = useQueryClient();
  const { org } = useAuth();
  return () => {
    void client.invalidateQueries({ queryKey: [org?.id] });
  };
}
