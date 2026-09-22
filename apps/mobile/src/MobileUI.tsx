import type { ReactNode, RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Language, landmarkTypeLabels, mobileCopy } from "./i18n";
import { colors } from "./theme";
import type { LandmarkSummary } from "./types";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  hint,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly variant?: ButtonVariant;
  readonly hint?: string;
}) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`${variant}Button`],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, styles[`${variant}ButtonText`]]}>{label}</Text>
    </Pressable>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  headingRef,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly headingRef: RefObject<View | null>;
}) {
  return (
    <View
      accessible
      accessibilityLabel={[eyebrow, title, description].filter(Boolean).join(". ")}
      accessibilityRole="header"
      focusable
      ref={headingRef}
      style={styles.headingGroup}
    >
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heading}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

export function ModeCard({
  label,
  title,
  description,
  onPress,
  language,
  primary = false,
}: {
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly onPress: () => void;
  readonly language: Language;
  readonly primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={`${label}. ${title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        primary && styles.modeCardPrimary,
        pressed && styles.modeCardPressed,
      ]}
    >
      <Text style={[styles.modeLabel, primary && styles.modeLabelPrimary]}>{label}</Text>
      <Text style={[styles.modeTitle, primary && styles.modeTitlePrimary]}>{title}</Text>
      <Text style={[styles.modeDescription, primary && styles.modeDescriptionPrimary]}>
        {description}
      </Text>
      <Text style={[styles.modeAction, primary && styles.modeActionPrimary]}>
        {mobileCopy[language].openFeature} →
      </Text>
    </Pressable>
  );
}

export function Choice({
  item,
  selected,
  onPress,
  index,
  language,
}: {
  readonly item: LandmarkSummary;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly index?: number;
  readonly language: Language;
}) {
  const copy = mobileCopy[language];
  const typeLabel = landmarkTypeLabels[language][item.type];
  return (
    <Pressable
      accessibilityHint={copy.choiceHint}
      accessibilityLabel={`${item.name}. ${typeLabel}. ${selected ? copy.selected : copy.notSelected}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      {typeof index === "number" ? (
        <View style={[styles.choiceIndex, selected && styles.choiceIndexSelected]}>
          <Text style={[styles.choiceIndexText, selected && styles.choiceIndexTextSelected]}>
            {index + 1}
          </Text>
        </View>
      ) : null}
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceName}>{item.name}</Text>
        <Text style={styles.choiceMeta}>{typeLabel}</Text>
      </View>
      <Text style={[styles.choiceState, selected && styles.choiceStateSelected]}>
        {selected ? copy.selected : copy.select}
      </Text>
    </Pressable>
  );
}

export function SafetyNotice({
  language,
  compact = false,
}: {
  readonly language: Language;
  readonly compact?: boolean;
}) {
  const copy = mobileCopy[language];
  return (
    <View accessibilityRole="summary" style={styles.safetyNotice}>
      {!compact ? <Text style={styles.safetyTitle}>{copy.safetyTitle}</Text> : null}
      <Text style={styles.safetyText}>{compact ? copy.compactSafety : copy.safetyText}</Text>
    </View>
  );
}

export function LanguageSwitch({
  language,
  onChange,
}: {
  readonly language: Language;
  readonly onChange: (language: Language) => void;
}) {
  const copy = mobileCopy[language];
  return (
    <View
      accessibilityLabel={copy.language}
      accessibilityRole="radiogroup"
      style={styles.languageSwitch}
    >
      <Pressable
        accessibilityLabel={copy.english}
        accessibilityRole="radio"
        accessibilityState={{ checked: language === "en" }}
        onPress={() => onChange("en")}
        style={[styles.languageButton, language === "en" && styles.languageButtonActive]}
      >
        <Text style={[styles.languageText, language === "en" && styles.languageTextActive]}>
          EN
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={copy.vietnamese}
        accessibilityRole="radio"
        accessibilityState={{ checked: language === "vi" }}
        onPress={() => onChange("vi")}
        style={[styles.languageButton, language === "vi" && styles.languageButtonActive]}
      >
        <Text style={[styles.languageText, language === "vi" && styles.languageTextActive]}>
          VI
        </Text>
      </Pressable>
    </View>
  );
}

export function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function LogoMark() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.logoMark}
    >
      <View style={styles.logoLineVertical} />
      <View style={styles.logoLineHorizontal} />
      <View style={[styles.logoNode, styles.logoNodeStart]} />
      <View style={[styles.logoNode, styles.logoNodeMiddle]} />
      <View style={[styles.logoNode, styles.logoNodeEnd]} />
    </View>
  );
}

export function Surface({ children }: { readonly children: ReactNode }) {
  return <View style={styles.surface}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButton: { backgroundColor: colors.blue },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.blue,
    borderWidth: 2,
  },
  quietButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    minHeight: 48,
  },
  dangerButton: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderWidth: 2,
  },
  buttonText: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  primaryButtonText: { color: colors.surface },
  secondaryButtonText: { color: colors.blueDark },
  quietButtonText: { color: colors.navy, fontSize: 16 },
  dangerButtonText: { color: colors.error },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
  headingGroup: { gap: 7 },
  eyebrow: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heading: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 39,
  },
  description: { color: colors.muted, fontSize: 17, lineHeight: 26 },
  modeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    minHeight: 184,
    padding: 20,
  },
  modeCardPrimary: { backgroundColor: colors.navy, borderColor: colors.navy },
  modeCardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  modeLabel: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  modeLabelPrimary: { color: "#84CAFF" },
  modeTitle: { color: colors.navy, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  modeTitlePrimary: { color: colors.surface },
  modeDescription: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  modeDescriptionPrimary: { color: "#D7E5F4" },
  modeAction: { color: colors.blue, fontSize: 16, fontWeight: "800", marginTop: 4 },
  modeActionPrimary: { color: "#84CAFF" },
  languageSwitch: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.30)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    padding: 3,
  },
  languageButton: {
    alignItems: "center",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 44,
    paddingHorizontal: 8,
  },
  languageButtonActive: { backgroundColor: colors.surface },
  languageText: { color: "#D7E5F4", fontSize: 14, fontWeight: "800" },
  languageTextActive: { color: colors.navy },
  choice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.lineStrong,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    padding: 14,
  },
  choiceSelected: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.blue,
    borderWidth: 2.5,
  },
  choiceIndex: {
    alignItems: "center",
    backgroundColor: colors.disabled,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  choiceIndexSelected: { backgroundColor: colors.blue },
  choiceIndexText: { color: colors.navy, fontSize: 16, fontWeight: "800" },
  choiceIndexTextSelected: { color: colors.surface },
  choiceCopy: { flex: 1, gap: 3 },
  choiceName: { color: colors.navy, fontSize: 18, fontWeight: "700", lineHeight: 24 },
  choiceMeta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  choiceState: { color: colors.blue, fontSize: 14, fontWeight: "800" },
  choiceStateSelected: { color: colors.infoText },
  safetyNotice: {
    backgroundColor: colors.warningSoft,
    borderColor: "#FEDF89",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  safetyTitle: { color: colors.warningText, fontSize: 16, fontWeight: "800" },
  safetyText: { color: colors.warningText, fontSize: 15, lineHeight: 23 },
  summaryRow: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 12,
  },
  summaryLabel: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  summaryValue: { color: colors.navy, fontSize: 18, fontWeight: "700", lineHeight: 25 },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logoLineVertical: {
    backgroundColor: colors.surface,
    height: 29,
    left: 14,
    position: "absolute",
    top: 10,
    width: 3,
  },
  logoLineHorizontal: {
    backgroundColor: colors.surface,
    height: 3,
    left: 16,
    position: "absolute",
    top: 13,
    width: 19,
  },
  logoNode: { borderRadius: 6, height: 10, position: "absolute", width: 10 },
  logoNodeStart: { backgroundColor: "#5ED2C8", left: 11, top: 7 },
  logoNodeMiddle: { backgroundColor: "#84CAFF", left: 31, top: 9 },
  logoNodeEnd: { backgroundColor: "#84CAFF", left: 11, top: 33 },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
});
