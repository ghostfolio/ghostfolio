export function normalizeTopHoldingName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function isSameTopHoldingName(aName: string, bName: string) {
  return normalizeTopHoldingName(aName) === normalizeTopHoldingName(bName);
}
