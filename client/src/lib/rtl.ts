export function isRtlDirection(dir: string): boolean {
  return dir === "rtl";
}

export function overlayEdgeClass(isRTL: boolean): string {
  return isRTL ? "left-0" : "right-0";
}

export function overlayAlign(isRTL: boolean): "start" | "end" {
  return isRTL ? "start" : "end";
}
