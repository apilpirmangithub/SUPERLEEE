// dHash-based whitelist with Hamming distance threshold
// Env:
// - NEXT_PUBLIC_SAFE_IMAGE_DHASHES: comma-separated hex dhashes
// - NEXT_PUBLIC_SAFE_IMAGE_DHASH_THRESHOLD: integer (default 10)

function parseList(env: string | undefined): string[] {
  if (!env) return [];
  return env.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function nibblePopcount(n: number): number {
  return [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4][n & 0xf];
}

function hexHamming(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += nibblePopcount(x);
  }
  // Penalize length mismatch
  dist += Math.abs(a.length - b.length) * 4;
  return dist;
}

export async function computeDHash(file: File, hashSize = 8, flipHorizontal = false, centerCropRatio = 1): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = url;
    });

    const w = hashSize + 1;
    const h = hashSize;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // Compute crop box (center crop to reduce background influence)
    const ratio = Math.max(0.1, Math.min(1, centerCropRatio));
    const cropW = img.width * ratio;
    const cropH = img.height * ratio;
    const sx = (img.width - cropW) / 2;
    const sy = (img.height - cropH) / 2;

    if (flipHorizontal) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, w, h);
    }
    const { data } = ctx.getImageData(0, 0, w, h);

    // grayscale brightness matrix
    const gray: number[] = new Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        gray[y * w + x] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    // compute horizontal differences -> 64 bits when hashSize=8
    const bits: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < hashSize; x++) {
        const left = gray[y * w + x];
        const right = gray[y * w + x + 1];
        bits.push(left > right ? 1 : 0);
      }
    }

    // pack to hex
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | (bits[i + 3] << 0);
      hex += nibble.toString(16);
    }
    return hex;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function computeDHashVariants(file: File, hashSize: number): Promise<{ label: string; hash: string }[]> {
  const cropEnv = parseFloat(process.env.NEXT_PUBLIC_SAFE_IMAGE_CENTER_CROP || '0.7');
  const crop = Math.max(0.4, Math.min(0.95, isNaN(cropEnv) ? 0.7 : cropEnv));
  const base = await computeDHash(file, hashSize, false, 1);
  const flip = await computeDHash(file, hashSize, true, 1);
  const center = await computeDHash(file, hashSize, false, crop);
  const centerFlip = await computeDHash(file, hashSize, true, crop);
  return [
    { label: 'base', hash: base.toLowerCase() },
    { label: 'flip', hash: flip.toLowerCase() },
    { label: 'center', hash: center.toLowerCase() },
    { label: 'centerFlip', hash: centerFlip.toLowerCase() },
  ];
}

export async function isWhitelistedImage(file: File): Promise<{ whitelisted: boolean; reason: string; hash: string; distance: number; threshold: number }> {
  const list = parseList(process.env.NEXT_PUBLIC_SAFE_IMAGE_DHASHES);
  const threshold = Number.parseInt(process.env.NEXT_PUBLIC_SAFE_IMAGE_DHASH_THRESHOLD || '8', 10);
  const looseEnv = process.env.NEXT_PUBLIC_SAFE_IMAGE_ENABLE_LOOSE ?? 'false';
  const useLoose = looseEnv === 'true';
  const loose = Number.parseInt(process.env.NEXT_PUBLIC_SAFE_IMAGE_DHASH_THRESHOLD_LOOSE || String(threshold + 6), 10);
  const hashSize = Number.parseInt(process.env.NEXT_PUBLIC_SAFE_IMAGE_DHASH_SIZE || '8', 10);

  const variants = await computeDHashVariants(file, hashSize);

  if (list.length === 0) {
    return { whitelisted: false, reason: 'No whitelist configured', hash: variants[0].hash, distance: Infinity, threshold };
  }

  let best = { dist: Infinity, variant: variants[0].label, hash: variants[0].hash, ref: '' };
  for (const v of variants) {
    for (const ref of list) {
      const d = hexHamming(v.hash, ref);
      if (d < best.dist) best = { dist: d, variant: v.label, hash: v.hash, ref };
    }
  }

  const okStrict = best.dist <= threshold;
  const okLoose = useLoose && best.dist <= loose;
  const ok = okStrict || okLoose;
  const used = best.hash;
  const usedTh = okStrict ? threshold : (okLoose ? loose : threshold);
  return {
    whitelisted: ok,
    reason: ok ? `dHash(${best.variant}) matched safe list (distance ${best.dist} ≤ ${usedTh}${okLoose ? ' (loose)' : ''})` : `Closest distance ${best.dist} > ${threshold}${useLoose ? '/' + loose : ''}`,
    hash: used,
    distance: best.dist,
    threshold: usedTh
  };
}
