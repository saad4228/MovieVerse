import type { auditoriumEnvelope } from "../../lib/auditorium";

export type ProjectionPoint = { id: string; x: number; y: number };
export type BackgroundFrame = {
  x: number; y: number; width: number; height: number; opacity: string;
  position: string; size: string; image: string; transform: string;
  mainTransform: string | null;
};
declare global {
  interface HTMLCanvasElement {
    /** Development-only read-only hook installed by SeatScene. */
    movieverseDiagnostics(): {
      frames: number; calls: number; triangles: number;
      screen: {x: number; y: number}; screenSize: {width: number; height: number};
      screenCorners: {x: number; y: number}[];
      seatVisuals: {id: string; y: number}[];
      seats: ProjectionPoint[]; seatBacks: ProjectionPoint[];
      room: ReturnType<typeof auditoriumEnvelope>;
    };
  }
  interface Window {
    ticketPhases: Record<string, {status: string; printerStatus: string; navbar: {backgroundColor:string; backgroundImage:string; backdropFilter:string; borderBottomColor:string}}> ;
    ticketMobilePhases: string[];
    __blockPlayback: boolean;
    __perf: {longTasks: number; longTaskMs: number; cls: number};
    slowNavigationAborted: boolean; decoderStarted: boolean;
    pendingNavigationStarted: boolean; pendingNavigationAborted: boolean;
    cinemaVideos: HTMLVideoElement[]; trackedCinemaVideos: HTMLVideoElement[];
    cinemaVideo: HTMLVideoElement;
    movieverseProbe: {video: HTMLVideoElement; frames: number};
    ticketBackgroundFrames: BackgroundFrame[];
    player: {plays: number; emit(state: number): void; fail(): void};
    [key: symbol]: {
      functions: {
        clearNavigationCaches(): void;
        navigate(href: string, scroll: number, kind: string, mode: string): Promise<void>;
      };
    };
  }
}
