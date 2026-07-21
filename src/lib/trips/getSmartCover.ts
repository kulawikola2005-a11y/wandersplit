function pickBySeed(seed: string, arr: string[]) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return arr[h % arr.length];
}

export function getSmartCover(name: string, fallbackId: string) {
  const q = (name || "").toLowerCase();

  const cityMap: Array<[RegExp, string[]]> = [
    [/(tokyo|tokio|japan|japon)/i, ["/covers/tokyo-1.jpg", "/covers/tokyo-2.jpg"]],
    [/(rome|rzym|italy|italia)/i, ["/covers/rome-1.jpg", "/covers/rome-2.jpg"]],
    [/(paris|france|francja)/i, ["/covers/paris-1.jpg", "/covers/paris-2.jpg"]],
    [/(london|uk|england|anglia)/i, ["/covers/london-1.jpg", "/covers/london-2.jpg"]],
  ];

  for (const [pattern, photos] of cityMap) {
    if (pattern.test(q)) {
      return pickBySeed(name + fallbackId, photos);
    }
  }

  return pickBySeed(name + fallbackId, [
    "/covers/generic-1.jpg",
    "/covers/generic-2.jpg",
    "/covers/generic-3.jpg",
    "/covers/generic-4.jpg",
  ]);
}
