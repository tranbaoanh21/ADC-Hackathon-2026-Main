import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.eyebrow}>
          PathMemory
        </Text>
        <Text accessibilityRole="header" style={styles.heading}>
          Verified landmarks. Familiar journeys.
        </Text>
        <Text style={styles.body}>
          Mobile scaffold is ready. Accessible Learn and Navigate flows will follow the Product API
          vertical slice.
        </Text>
      </View>
      <StatusBar barStyle="dark-content" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F7FAFC",
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  eyebrow: {
    color: "#006D77",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  heading: {
    color: "#102A43",
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 42,
    marginBottom: 20,
  },
  body: {
    color: "#52606D",
    fontSize: 18,
    lineHeight: 28,
  },
});
