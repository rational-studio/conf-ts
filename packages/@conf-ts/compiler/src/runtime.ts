export const String = global.String;
export const Number = global.Number;
export const Boolean = global.Boolean;

export function arrayMap<T, U>(arr: T[], callback: (item: T) => U): U[] {
  return arr.map(callback);
}
