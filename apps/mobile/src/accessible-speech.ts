import * as Speech from "expo-speech";
import { AccessibilityInfo } from "react-native";

import type { Language } from "./i18n";

export async function announceMessage(message: string, language: Language = "vi"): Promise<void> {
  await Speech.stop();
  const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
  if (screenReaderEnabled) {
    AccessibilityInfo.announceForAccessibility(message);
    return;
  }
  Speech.speak(message, { language: language === "en" ? "en-US" : "vi-VN", pitch: 1, rate: 0.92 });
}

export function stopSpeaking(): Promise<void> {
  return Speech.stop();
}
