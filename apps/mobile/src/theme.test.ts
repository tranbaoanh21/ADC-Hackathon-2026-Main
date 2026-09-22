import { describe, expect, it } from "vitest";

import { colors } from "./theme";

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    channel(Number.parseInt(value.slice(offset, offset + 2), 16)),
  );
  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("PathMemory palette", () => {
  it.each([
    ["primary button", colors.surface, colors.blue],
    ["accent label", colors.surface, colors.teal],
    ["main text", colors.navy, colors.canvas],
    ["muted text", colors.muted, colors.surface],
    ["safety text", colors.warningText, colors.warningSoft],
    ["error text", colors.errorText, colors.errorSoft],
    ["success text", colors.success, colors.canvas],
  ])("keeps %s at or above WCAG AA normal-text contrast", (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the focus accent distinguishable from a white control surface", () => {
    expect(contrast(colors.focus, colors.surface)).toBeGreaterThanOrEqual(3);
  });
});
