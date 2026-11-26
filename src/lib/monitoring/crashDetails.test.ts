import { describe, expect, it } from 'vitest';
import { crashDetails, crashTime, errorLine } from './crashDetails';

// covers: VRMS spec 0025 AC-7a

const at = new Date('2026-11-25T06:03:07.000Z');
const facts = { path: '/repairs/42', at, app: 'web-vrms', release: 'abc1234' };

describe('errorLine', () => {
  it('reads name: message', () => {
    expect(errorLine(new TypeError('x is undefined'))).toBe('TypeError: x is undefined');
  });

  it('redacts emails and tokens in the message', () => {
    const line = errorLine(new Error('no user ana@welinc.com with Bearer abc.def'));

    expect(line).toBe('Error: no user [email] with Bearer [token]');
  });

  it('redacts before the 300 character cut, so a token is never split', () => {
    const token = `eyJ${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
    const message = `${'x'.repeat(290)} ${token}`;

    const line = errorLine(new Error(message));

    expect(line).toBe(`Error: ${'x'.repeat(290)} [token]`);
    expect(line).not.toContain('eyJ');
  });

  it('cuts a long message to 300 characters with an ellipsis', () => {
    const line = errorLine(new Error('y'.repeat(500)));
    const message = line.slice('Error: '.length);

    expect(message).toHaveLength(300);
    expect(message.endsWith('…')).toBe(true);
  });

  it('keeps a 300 character message whole', () => {
    expect(errorLine(new Error('z'.repeat(300)))).toBe(`Error: ${'z'.repeat(300)}`);
  });

  it('keeps the message on one line', () => {
    expect(errorLine(new Error('first\n  second'))).toBe('Error: first second');
  });

  it('shows a thrown string as Error: <value>', () => {
    expect(errorLine('plain text')).toBe('Error: plain text');
  });

  it('shows other thrown values through String()', () => {
    expect(errorLine(42)).toBe('Error: 42');
    expect(errorLine(null)).toBe('Error: null');
    expect(errorLine(undefined)).toBe('Error: undefined');
  });

  it('survives a value that cannot be turned into text', () => {
    expect(errorLine(Object.create(null))).toBe('Error: a value that could not be shown');
  });

  it('reads an error shaped object from another frame', () => {
    expect(errorLine({ name: 'RangeError', message: 'too far' })).toBe('RangeError: too far');
  });
});

describe('crashTime', () => {
  it('gives the local time, then the ISO time in UTC', () => {
    expect(crashTime(at)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \(2026-11-25T06:03:07\.000Z\)$/);
  });
});

describe('crashDetails', () => {
  it('lists one item per line, without a Code line when there is no code', () => {
    const lines = crashDetails(new TypeError('x is undefined'), facts).split('\n');

    expect(lines).toEqual([
      'TypeError: x is undefined',
      'Page: /repairs/42',
      `Time: ${crashTime(at)}`,
      'App: web-vrms abc1234',
    ]);
  });

  it('adds the Code line last when there is a code', () => {
    const text = crashDetails(new Error('boom'), { ...facts, code: 'abcdef01' });

    expect(text.split('\n').pop()).toBe('Code: abcdef01');
  });

  it('shows the release as "local" when the build has none', () => {
    expect(crashDetails(new Error('boom'), { ...facts, release: 'local' })).toContain('App: web-vrms local');
  });
});
