import * as Speech from "expo-speech";
import { AccessibilityInfo } from "react-native";

export async function announceMessage(message: string): Promise<void> {
  await Speech.stop();
  const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
  if (screenReaderEnabled) {
    AccessibilityInfo.announceForAccessibility(message);
    return;
  }
  Speech.speak(message, { language: "vi-VN", pitch: 1, rate: 0.92 });
}

export function stopSpeaking(): Promise<void> {
  return Speech.stop();
}
