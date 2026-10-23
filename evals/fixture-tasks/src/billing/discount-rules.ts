export function loyaltyDiscount(visits: number): number {
  return visits >= 10 ? 0.1 : 0
}
