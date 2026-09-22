import type { Landmark, ProductLocale, RelativeManeuver } from "./types.js";

export function learnNarration(candidateName: string | null, locale: ProductLocale): string {
  if (!candidateName) {
    return locale === "en-US"
      ? "No stable landmark was identified. Hold still and scan the sign or entrance again."
      : "Chưa nhận diện được landmark ổn định. Hãy đứng yên và quét lại biển hoặc lối vào.";
  }
  return locale === "en-US"
    ? `${candidateName} identified. You can save this landmark for buddy review.`
    : `Đã nhận diện ${candidateName}. Bạn có thể lưu landmark này để buddy duyệt.`;
}

export function rescanNarration(
  expectedName: string,
  awaitingStart: boolean,
  locale: ProductLocale,
): string {
  if (locale === "en-US") {
    return awaitingStart
      ? `${expectedName} could not be confirmed. Hold still, point the camera towards its sign and scan again.`
      : `${expectedName} could not be confirmed. Stop and scan again.`;
  }
  return awaitingStart
    ? `Chưa xác nhận được ${expectedName}. Hãy đứng yên, hướng camera về biển chỉ dẫn và quét lại.`
    : `Chưa xác nhận được ${expectedName}. Hãy dừng lại và quét lại.`;
}

export function movementNarration(
  current: Landmark,
  next: Landmark,
  maneuver: RelativeManeuver,
  locale: ProductLocale,
): string {
  const instruction =
    locale === "en-US"
      ? englishMovement(next.name, maneuver)
      : vietnameseMovement(next.name, maneuver);
  return locale === "en-US"
    ? `${current.name} confirmed. ${instruction}`
    : `Đã xác nhận ${current.name}. ${instruction}`;
}

export function arrivalNarration(destinationName: string, locale: ProductLocale): string {
  return locale === "en-US"
    ? `You have arrived at ${destinationName}.`
    : `Đã đến ${destinationName}.`;
}

function englishMovement(targetName: string, maneuver: RelativeManeuver): string {
  switch (maneuver) {
    case "GO_STRAIGHT":
      return `Continue straight to ${targetName}.`;
    case "TURN_LEFT":
      return `Turn left and continue to ${targetName}.`;
    case "TURN_RIGHT":
      return `Turn right and continue to ${targetName}.`;
    case "TAKE_ELEVATOR":
      return `Take the elevator and continue to ${targetName}.`;
    case "ENTER_DOOR":
      return `Enter the door and continue to ${targetName}.`;
    case "OTHER":
      return `Continue to ${targetName}.`;
  }
}

function vietnameseMovement(targetName: string, maneuver: RelativeManeuver): string {
  switch (maneuver) {
    case "GO_STRAIGHT":
      return `Đi thẳng đến ${targetName}.`;
    case "TURN_LEFT":
      return `Rẽ trái và tiếp tục đến ${targetName}.`;
    case "TURN_RIGHT":
      return `Rẽ phải và tiếp tục đến ${targetName}.`;
    case "TAKE_ELEVATOR":
      return `Đi thang máy và tiếp tục đến ${targetName}.`;
    case "ENTER_DOOR":
      return `Đi qua cửa và tiếp tục đến ${targetName}.`;
    case "OTHER":
      return `Tiếp tục đến ${targetName}.`;
  }
}
