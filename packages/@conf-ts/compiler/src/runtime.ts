export const String = global.String;
export const Number = global.Number;
export const Boolean = global.Boolean;

export function arrayMap<T, U>(arr: T[], callback: (item: T) => U): U[] {
  return arr.map(callback);
}

export function env(key: string): string | undefined {
  // Support both Node and browser environments
  // eslint-disable-next-line no-undef
  const proc: any = typeof process !== 'undefined' ? process : undefined;
  return proc?.env?.[key];
}
