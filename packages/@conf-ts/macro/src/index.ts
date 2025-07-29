console.warn(
  '@conf-ts/macro has been imported. This package is intended for compile-time macro expansion and should not be directly imported into runtime code.',
);

export function String(value: any): string {
  return String(value);
}

export function Number(value: any): number {
  return Number(value);
}

export function Boolean(value: any): boolean {
  return Boolean(value);
}

export function arrayMap<T, U>(array: T[], callback: (item: T) => U): U[] {
  return array.map(callback);
}

export function env(key: string): string | undefined {
  return process.env[key];
}
