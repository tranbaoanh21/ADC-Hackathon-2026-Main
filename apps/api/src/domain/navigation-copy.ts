import type { Landmark, ProductLocale, RelativeManeuver } from "./types.js";

export function learnNarration(candidateName: string | null, locale: ProductLocale): string {
  if (!candidateName) {
    return locale === "en-US"
      ? "No stable landmark was identified. Hold still and scan the sign or entrance again."
      : "Chưa nhận diện được điểm mốc ổn định. Hãy quét lại biển chỉ dẫn hoặc lối vào.";
  }
  return locale === "en-US"
    ? `${candidateName} identified. You can save this landmark for buddy review.`
    : `Đã nhận diện ${vietnameseLandmarkName(candidateName)}. Điểm mốc này sẽ được lưu để đồng nghiệp hoặc bộ phận Nhân sự duyệt.`;
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
  const localizedName = vietnameseLandmarkName(expectedName);
  return awaitingStart
    ? `Chưa nhận ra ${localizedName}. Hãy hướng máy ảnh về biển chỉ dẫn và quét lại.`
    : `Chưa nhận ra ${localizedName}. Hãy dừng lại và quét lại.`;
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
      : vietnameseMovement(vietnameseLandmarkName(next.name), maneuver);
  return locale === "en-US"
    ? `${current.name} confirmed. ${instruction}`
    : `Đã xác nhận ${vietnameseLandmarkName(current.name)}. ${instruction}`;
}

export function arrivalNarration(destinationName: string, locale: ProductLocale): string {
  return locale === "en-US"
    ? `You have arrived at ${destinationName}.`
    : `Đã đến ${vietnameseLandmarkName(destinationName)}.`;
}

function vietnameseLandmarkName(name: string): string {
  const knownNames: Readonly<Record<string, string>> = {
    "demo office landmark network": "Mạng lưới điểm mốc văn phòng mẫu",
    reception: "Quầy lễ tân",
    "elevator level 2": "Khu vực thang máy tầng 2",
    "meeting room a": "Phòng họp A",
    "restroom level 2": "Nhà vệ sinh tầng 2",
  };
  return knownNames[name.trim().toLocaleLowerCase()] ?? name;
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
