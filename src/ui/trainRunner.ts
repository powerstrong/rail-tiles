import { type Pose, type TrackPath, poseAt } from '../engine/geometry';

export interface RunOptions {
  /** Cruising speed in cells per second. */
  speed: number;
  /** Ease to a stop at the end (arrival). Without it the train halts abruptly (crash). */
  brake: boolean;
  onPose: (pose: Pose) => void;
  onPuff?: (pose: Pose) => void;
  /** Distance travelled so far (cells), every frame. */
  onAdvance?: (distance: number) => void;
  onDone: (pose: Pose) => void;
}

const ACCEL = 3.2; // cells / s²
const BRAKE_DIST = 0.7; // cells
const PUFF_EVERY = 0.42; // cells travelled between smoke puffs

/**
 * Drives a pose along a precomputed path with requestAnimationFrame.
 * Pure DOM-side animation: callers update transforms directly instead of re-rendering React.
 */
export function runTrain(path: TrackPath, opts: RunOptions): () => void {
  let frame = 0;
  let last = performance.now();
  let dist = 0;
  let v = 0;
  let nextPuff = 0.15;

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const left = path.length - dist;
    let target = opts.speed;
    if (opts.brake && left < BRAKE_DIST) target = opts.speed * Math.max(0.16, Math.sqrt(left / BRAKE_DIST));
    v = v < target ? Math.min(target, v + ACCEL * dt) : target;
    dist = Math.min(path.length, dist + v * dt);

    const pose = poseAt(path, dist);
    opts.onPose(pose);
    opts.onAdvance?.(dist);
    if (opts.onPuff && dist >= nextPuff) {
      nextPuff = dist + PUFF_EVERY;
      opts.onPuff(pose);
    }
    if (dist >= path.length) {
      opts.onDone(pose);
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame((now) => {
    last = now;
    tick(now);
  });
  return () => cancelAnimationFrame(frame);
}

export function poseTransform(pose: Pose, scale: number): string {
  return `translate(${(pose.x * scale).toFixed(2)} ${(pose.y * scale).toFixed(2)}) rotate(${pose.angle.toFixed(2)})`;
}
