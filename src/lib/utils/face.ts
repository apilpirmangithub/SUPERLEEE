// Lightweight face embedding using MediaPipe FaceLandmarker via CDN
// No npm deps required; runs fully on-device in the browser

let landmarker: any | null = null;
let vision: any | null = null;
let loadingPromise: Promise<void> | null = null;

const MP_VERSION = (process.env.NEXT_PUBLIC_MEDIAPIPE_TASKS_VISION_VERSION || "0.10.3").trim();
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;

async function ensureFaceLandmarker() {
  if (landmarker) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (typeof window === 'undefined') return;
    // Dynamic ESM import from CDN (works in modern browsers)
    vision = await import(/* @vite-ignore */ /* webpackIgnore: true */ MODULE_URL + "/vision_bundle.mjs");
    const { FilesetResolver, FaceLandmarker } = vision as any;
    const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
    landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: { modelAssetPath: MODULE_URL + "/face_landmarker.task" },
      runningMode: "IMAGE",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  })();

  await loadingPromise;
}

async function imageBitmapFromFile(file: File): Promise<ImageBitmap> {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await fetch(blobUrl).then(r => r.blob());
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export type FaceEmbedding = Float32Array;

// Build a normalized landmark-based embedding (translation/scale invariant)
export async function getFaceEmbedding(file: File): Promise<FaceEmbedding | null> {
  if (typeof window === 'undefined') return null;
  await ensureFaceLandmarker();
  if (!landmarker) return null;

  const bitmap = await imageBitmapFromFile(file);
  const result = landmarker.detect(bitmap as any);
  // @ts-ignore
  const faces = result?.faceLandmarks as { x: number; y: number; z?: number }[][] | undefined;
  if (!faces || faces.length === 0) return null;
  const pts = faces[0];
  if (!pts || pts.length === 0) return null;

  // Choose eye indices for scale reference (MediaPipe 468 landmarks)
  const LEFT_EYE_IDX = 33; // left eye outer
  const RIGHT_EYE_IDX = 263; // right eye outer
  const pL = pts[Math.min(LEFT_EYE_IDX, pts.length - 1)];
  const pR = pts[Math.min(RIGHT_EYE_IDX, pts.length - 1)];
  const eyeDist = Math.hypot((pL.x - pR.x), (pL.y - pR.y)) || 1e-6;

  // Center by mean
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= pts.length; my /= pts.length;

  // Build vector from a subset for size: take every 4th point to ~117 pairs
  const vec: number[] = [];
  for (let i = 0; i < pts.length; i += 4) {
    const p = pts[i];
    vec.push((p.x - mx) / eyeDist, (p.y - my) / eyeDist);
  }
  // L2 normalize
  let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  const emb = new Float32Array(vec.map(v => v / norm));
  return emb;
}

export function cosineSimilarity(a: FaceEmbedding, b: FaceEmbedding): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}
