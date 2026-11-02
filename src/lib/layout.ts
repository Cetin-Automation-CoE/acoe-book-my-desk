// Groups seats (already in room order) into side-by-side pairs, and pairs into table blocks.
export function roomBlocks<T>(items: T[], pairsPerBlock: number): T[][][] {
  const pairs: T[][] = []
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2))
  const blocks: T[][][] = []
  for (let i = 0; i < pairs.length; i += pairsPerBlock) blocks.push(pairs.slice(i, i + pairsPerBlock))
  return blocks
}
