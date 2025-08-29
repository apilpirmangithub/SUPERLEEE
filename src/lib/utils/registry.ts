import { erc721Abi, parseAbiItem } from "viem";

function ipfsToHttps(url?: string) {
  if (!url) return "";
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  const m = url.match(/\/ipfs\/([^\/?#]+)/i);
  if (m?.[1]) return `https://ipfs.io/ipfs/${m[1]}`;
  if (/^(baf|Qm)[a-zA-Z0-9]+$/.test(url)) return `https://ipfs.io/ipfs/${url}`;
  return url;
}

async function fetchJsonSafe(url?: string): Promise<any | null> {
  if (!url) return null;
  try { return await fetch(url).then(r => r.json()); } catch { return null; }
}

export type DuplicateMatch = {
  found: boolean;
  tokenId?: string;
  tokenURI?: string;
  ipMetadataURI?: string;
};

export async function checkDuplicateQuick(pc: any, spg: `0x${string}`, targetImageHash: string): Promise<DuplicateMatch> {
  try {
    const lastN = Number.parseInt(process.env.NEXT_PUBLIC_REGISTRY_CHECK_LAST || '300', 10);
    // Try totalSupply (ERC721Enumerable)
    const total = (await pc.readContract({
      address: spg,
      abi: [{ type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }] as const,
      functionName: 'totalSupply',
      args: [],
    }).catch(() => null)) as bigint | null;

    if (!total) return { found: false };

    const start = total - 1n;
    const end = start > BigInt(lastN) ? start - BigInt(lastN) : 0n;

    for (let i = start; i >= end; i--) {
      let tokenId: bigint | null = null;
      try {
        tokenId = (await pc.readContract({
          address: spg,
          abi: [{ type: 'function', name: 'tokenByIndex', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] }] as const,
          functionName: 'tokenByIndex',
          args: [i],
        })) as bigint;
      } catch { tokenId = i; }

      let tokenURI: string | undefined;
      try {
        tokenURI = await pc.readContract({ address: spg, abi: erc721Abi, functionName: 'tokenURI', args: [tokenId!] });
      } catch { tokenURI = undefined; }

      const nftMeta = await fetchJsonSafe(ipfsToHttps(tokenURI));
      const ipMetaUri: string | undefined = nftMeta?.ipMetadataURI || nftMeta?.attributes?.find?.((a: any) => {
        const t = a?.trait_type?.toLowerCase?.();
        return t === 'ip_metadata_uri' || t === 'ipmetadatauri';
      })?.value;
      const ipMeta = await fetchJsonSafe(ipfsToHttps(ipMetaUri));
      const imgHash = (ipMeta?.imageHash || ipMeta?.mediaHash || '').toLowerCase();
      if (imgHash && imgHash === targetImageHash.toLowerCase()) {
        return { found: true, tokenId: tokenId?.toString(), tokenURI, ipMetadataURI: ipMetaUri };
      }

      if (i === 0n) break;
    }
  } catch {}
  return { found: false };
}

export async function checkDuplicateByImageHash(pc: any, spg: `0x${string}`, targetImageHash: string): Promise<DuplicateMatch> {
  // Scan Transfer(mint) logs progressively
  const latest = await pc.getBlockNumber();
  let step = 75_000n;
  const maxBack = BigInt(Number(process.env.NEXT_PUBLIC_REGISTRY_SCAN_MAX_BACK || 2_000_000));
  const start = latest > maxBack ? latest - maxBack : 0n;

  const tokenIds = new Set<string>();
  for (let from = start; from <= latest; from += step) {
    const to = from + step - 1n > latest ? latest : from + step - 1n;
    const logs = await pc.getLogs({
      address: spg,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      args: { from: "0x0000000000000000000000000000000000000000" as `0x${string}` },
      fromBlock: from,
      toBlock: to,
    });
    for (const l of logs) {
      const tid = (l.args?.tokenId as bigint)?.toString?.();
      if (tid) tokenIds.add(tid);
    }
  }

  // For each token, fetch tokenURI -> metadata -> ipMetadataURI -> ipMeta to compare imageHash
  for (const tid of tokenIds) {
    let tokenURI: string | undefined;
    try {
      tokenURI = await pc.readContract({ address: spg, abi: erc721Abi, functionName: 'tokenURI', args: [BigInt(tid)] });
    } catch { tokenURI = undefined; }

    const nftMeta = await fetchJsonSafe(ipfsToHttps(tokenURI));
    const ipMetaUri: string | undefined = nftMeta?.ipMetadataURI || nftMeta?.attributes?.find?.((a: any) => {
      const t = a?.trait_type?.toLowerCase?.();
      return t === 'ip_metadata_uri' || t === 'ipmetadatauri';
    })?.value;

    const ipMeta = await fetchJsonSafe(ipfsToHttps(ipMetaUri));
    const imgHash = (ipMeta?.imageHash || ipMeta?.mediaHash || '').toLowerCase();
    if (imgHash && imgHash === targetImageHash.toLowerCase()) {
      return { found: true, tokenId: tid, tokenURI, ipMetadataURI: ipMetaUri };
    }
  }

  return { found: false };
}
