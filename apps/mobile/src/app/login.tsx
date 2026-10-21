import { Redirect } from "expo-router";
import { useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";
import { API_URL, useAuth, WEB_URL } from "../auth";
import { Button, Card, ErrorState, LoadingState, Screen, styles } from "../ui";

export default function Login() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (auth.loading)
    return (
      <Screen title="Welcome back">
        <LoadingState />
      </Screen>
    );
  if (auth.session) return <Redirect href="/" />;
  async function login() {
    setBusy(true);
    setError("");
    try {
      await auth.login(email.trim(), password);
      setPassword("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title="Good spaces. Better managed."
      subtitle="Sign in to your private landlord workspace."
    >
      <Card>
        <Text style={styles.heading}>A little clarity starts here.</Text>
        <View>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>
        <View>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
          />
        </View>
        {(error || auth.error) && (
          <ErrorState error={error || auth.error} retry={() => void auth.restore()} />
        )}
        <Button
          label={busy ? "Signing in..." : "Sign in to JOJOBUILDS"}
          disabled={busy || !email || !password}
          onPress={() => void login()}
        />
        <Button
          label="Account recovery on the website"
          secondary
          onPress={() => {
            void Linking.openURL(WEB_URL).catch((problem: unknown) =>
              setError(problem instanceof Error ? problem.message : "Could not open website."),
            );
          }}
        />
      </Card>
      <Text style={styles.muted}>
        Your account must first be created or invited through the shared backend. There are no
        default credentials.
      </Text>
      <Text style={styles.muted}>Development API: {API_URL}</Text>
    </Screen>
  );
}
