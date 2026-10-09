// Camera + MediaPipe hand tracking. Loaded lazily so the hologram works even if tracking is unavailable.
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  constructor() { this.lm = null; this.stream = null; this.lastT = -1; this.ready = false; }

  async start(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Camera is not available (use https or localhost)');
    if (!this.lm) {
      let files;
      try { files = await FilesetResolver.forVisionTasks(WASM); } catch { throw new Error('The hand model could not be downloaded. Check your internet connection'); }
      const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6, minHandPresenceConfidence: 0.5 });
      // CPU only: the GPU delegate opens a second WebGL context that can make the hologram canvas go black on some graphics cards
      try { this.lm = await HandLandmarker.createFromOptions(files, opts('CPU')); }
      catch { throw new Error('The hand model could not be downloaded. Check your internet connection'); }
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    video.srcObject = this.stream; await video.play();
    this.ready = true;
  }

  detect(video, now) {
    if (!this.ready || video.readyState < 2 || video.currentTime === this.lastT) return null;
    this.lastT = video.currentTime;
    return this.lm.detectForVideo(video, now).landmarks || [];
  }

  stop(video) {
    this.ready = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null; if (video) video.srcObject = null;
  }
}

export const CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;
