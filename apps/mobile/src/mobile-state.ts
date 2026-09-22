import { type Language, mobileCopy } from "./i18n";
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
  language: Language = "vi",
): NavigationPresentation {
  const copy = mobileCopy[language];
  switch (response.routeState) {
    case "AWAITING_START_CONFIRMATION":
      return {
        tone: "warning",
        heading: copy.routeAwaiting,
        message: response.spokenMessage,
        completed: false,
      };
    case "STOP_AND_RESCAN":
      return {
        tone: "warning",
        heading: copy.routeStop,
        message: response.spokenMessage,
        completed: false,
      };
    case "SEEKING_LANDMARK":
      return {
        tone: "info",
        heading: copy.routeContinue,
        message: response.spokenMessage,
        completed: false,
      };
    case "ROUTE_COMPLETED":
      return {
        tone: "success",
        heading: copy.routeComplete,
        message: response.spokenMessage,
        completed: true,
      };
    case "OBSERVING":
      return {
        tone: "info",
        heading: copy.routeObserved,
        message: response.spokenMessage,
        completed: false,
      };
  }
}
