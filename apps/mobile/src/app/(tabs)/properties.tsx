import { money } from "@jojobuilds/api-client";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useAuth, WEB_URL } from "../../auth";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SearchField,
  Tag,
  styles,
  useRefresh,
  useResource,
} from "../../ui";

export default function Properties() {
  const { org } = useAuth();
  const properties = useResource("properties");
  const units = useResource("units");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const refresh = useRefresh();
  return (
    <Screen
      title="Your properties."
      subtitle="Spaces, people and the details in between."
      onRefresh={refresh}
      refreshing={properties.isRefetching}
    >
      <SearchField value={search} onChange={setSearch} placeholder="Search property or location" />
      {error && <ErrorState error={error} />}
      {properties.error || units.error ? (
        <ErrorState error={properties.error ?? units.error!} retry={refresh} />
      ) : !properties.data || !units.data ? (
        <LoadingState />
      ) : !properties.data.length ? (
        <EmptyState
          title="Your portfolio starts on the website"
          message="Add properties and units in your JOJOBUILDS web workspace."
        />
      ) : (
        properties.data
          .filter((p) => `${p.name} ${p.location}`.toLowerCase().includes(search.toLowerCase()))
          .map((p) => (
            <Card key={p.id}>
              <View style={styles.row}>
                <Tag
                  text={`${p.occupied}/${p.units} occupied`}
                  tone={p.occupied === p.units && p.units ? "green" : "neutral"}
                />
                <Text style={styles.muted}>{p.county}</Text>
              </View>
              <Text style={styles.heading}>{p.name}</Text>
              <Text style={styles.muted}>{p.location}</Text>
              {p.billed !== null && (
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <Text style={styles.eyebrow}>ALLOCATED</Text>
                    <Text style={styles.text}>{money(p.collected ?? 0, org?.currency)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.eyebrow}>OUTSTANDING</Text>
                    <Text style={[styles.text, { color: "#bd534c" }]}>
                      {money(p.outstanding ?? 0, org?.currency)}
                    </Text>
                  </View>
                </View>
              )}
              <Button
                label={selected === p.id ? "Hide units" : "View units"}
                secondary
                onPress={() => setSelected(selected === p.id ? "" : p.id)}
              />
              {selected === p.id &&
                units.data
                  .filter((u) => u.property_id === p.id)
                  .map((u) => (
                    <View style={styles.row} key={u.id}>
                      <Text style={styles.text}>
                        {u.building} · {u.number}
                      </Text>
                      <Tag
                        text={u.occupied ? "Occupied" : "Vacant"}
                        tone={u.occupied ? "green" : "neutral"}
                      />
                    </View>
                  ))}
              {selected === p.id && p.contact && (
                <Text style={styles.muted}>Property contact: {p.contact}</Text>
              )}
            </Card>
          ))
      )}
      <Button
        label="Property setup on the website"
        secondary
        onPress={() => {
          void Linking.openURL(WEB_URL).catch((problem: unknown) =>
            setError(problem instanceof Error ? problem.message : "Could not open website."),
          );
        }}
      />
    </Screen>
  );
}
