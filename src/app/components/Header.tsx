import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/app/theme";

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22
  }
});
