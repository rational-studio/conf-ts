export interface SourceLocation {
  line: number;
  character: number;
  file?: string;
}

export class ConfTSError extends Error {
  constructor(
    message: string,
    public location: SourceLocation,
  ) {
    super(message);
    this.name = 'ConfTSError';
    Object.setPrototypeOf(this, ConfTSError.prototype);
  }

  toString(): string {
    const { file, line, character } = this.location;
    return `${this.name}: ${this.message}\n    at ${file || 'unknown'}:${line}:${character}`;
  }
}
