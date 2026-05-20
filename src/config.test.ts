import { describe, expect, it } from 'vitest';
import { readNumberEnv } from './config';

describe('readNumberEnv', () => {
  it('falls back to default when env is undefined', () => {
    expect(readNumberEnv(undefined, 2000)).toBe(2000);
  });

  it('falls back to default for empty string', () => {
    expect(readNumberEnv('', 30)).toBe(30);
  });

  it('falls back to default for non-numeric', () => {
    expect(readNumberEnv('not-a-number', 2000)).toBe(2000);
  });

  it('falls back to default for non-positive numbers', () => {
    expect(readNumberEnv('-5', 30)).toBe(30);
    expect(readNumberEnv('0', 30)).toBe(30);
  });

  it('uses the parsed numeric env when valid', () => {
    expect(readNumberEnv('500', 2000)).toBe(500);
  });
});
