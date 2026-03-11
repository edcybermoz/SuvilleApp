export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "2.0.0";

export const compareVersions = (current: string, target: string) => {
  const a = current.split(".").map(Number);
  const b = target.split(".").map(Number);
  const max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;

    if (x > y) return 1;
    if (x < y) return -1;
  }

  return 0;
};