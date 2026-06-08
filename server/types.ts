export type ClientMessage =
  | { type: "start" }
  | { type: "stop" }
  | { type: "refresh" }
  | { type: "navigate"; url: string }
  | { type: "mouse"; eventType: "mouseMoved" | "mousePressed" | "mouseReleased"; x: number; y: number; button?: "left" | "right" | "middle"; clickCount?: number }
  | { type: "wheel"; x: number; y: number; deltaX: number; deltaY: number }
  | { type: "key"; eventType: "keyDown" | "keyUp" | "char"; key: string; code?: string; text?: string };

export type ServerMessage =
  | { type: "status"; status: BrowserStatus; message?: string }
  | { type: "frame"; data: string; width: number; height: number }
  | { type: "url"; url: string }
  | { type: "error"; message: string };

export type BrowserStatus = "idle" | "building" | "starting" | "connecting" | "ready" | "stopping" | "error";
