import type { ObservationResponse } from "./types";

export interface NavigationPresentation {
  readonly tone: "info" | "warning" | "success";
  readonly heading: string;
  readonly message: string;
  readonly completed: boolean;
}

export function shouldApplyObservation(
  latestRequestId: string,
  responseRequestId: string,
): boolean {
  return latestRequestId === responseRequestId;
}

export function presentNavigationObservation(
  response: ObservationResponse,
): NavigationPresentation {
  switch (response.routeState) {
    case "AWAITING_START_CONFIRMATION":
      return {
        tone: "warning",
        heading: "Chưa xác nhận điểm xuất phát",
        message: response.spokenMessage,
        completed: false,
      };
    case "STOP_AND_RESCAN":
      return {
        tone: "warning",
        heading: "Dừng lại và quét lại",
        message: response.spokenMessage,
        completed: false,
      };
    case "SEEKING_LANDMARK":
      return {
        tone: "info",
        heading: "Tiếp tục đến landmark kế tiếp",
        message: response.spokenMessage,
        completed: false,
      };
    case "ROUTE_COMPLETED":
      return {
        tone: "success",
        heading: "Đã hoàn tất tuyến",
        message: response.spokenMessage,
        completed: true,
      };
    case "OBSERVING":
      return {
        tone: "info",
        heading: "Đã ghi nhận quan sát",
        message: response.spokenMessage,
        completed: false,
      };
  }
}
