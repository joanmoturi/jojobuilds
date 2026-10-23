import Ionicons from "@expo/vector-icons/Ionicons";
import { canFinance, canManageTenants } from "@jojobuilds/api-client";
import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../auth";
import { Button, Card, LoadingState, Screen, colors } from "../../ui";

export default function TabsLayout() {
  const { session, org, loading, logout } = useAuth();
  if (loading)
    return (
      <Screen title="Your workspace">
        <LoadingState />
      </Screen>
    );
  if (!session) return <Redirect href="/login" />;
  if (!org || org.role === "tenant")
    return (
      <Screen title="Landlord mobile workspace">
        <Card>
          <Text>
            This Android app is for authorized property staff. Use the website for tenant and
            service-provider portals, including Google sign-in, or contact your owner about access.
          </Text>
          <Button label="Sign out" onPress={() => void logout()} />
        </Card>
      </Screen>
    );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.terra,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          minHeight: 64,
          paddingTop: 7,
        },
        tabBarLabelStyle: { fontSize: 9 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: "Properties",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: org.role === "manager" ? "Balances" : "Tenants",
          href:
            canManageTenants(org.role) || ["manager", "finance"].includes(org.role)
              ? "/tenants"
              : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          href: canFinance(org.role) ? "/payments" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
