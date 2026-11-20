import { describe, expect, it } from 'vitest';
import { redact } from './redact';

// covers: VRMS spec 0025 AC-6

describe('redact', () => {
  it('replaces email addresses', () => {
    expect(redact('No access for maria.santos+vrms@welinc.com today')).toBe('No access for [email] today');
  });

  it('replaces every email in one text', () => {
    expect(redact('from a@welinc.com to b@welinc.com')).toBe('from [email] to [email]');
  });

  it('replaces JWT shaped strings', () => {
    const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJlX3BhcnQ';
    expect(redact(`token ${jwt} was refused`)).toBe('token [token] was refused');
  });

  it('replaces bearer values, whatever their shape', () => {
    expect(redact('Authorization: Bearer abc.def-123')).toBe('Authorization: Bearer [token]');
    expect(redact('bearer opaque_value, next')).toBe('Bearer [token], next');
  });

  it('keeps nothing of a bearer value that holds an email or a token', () => {
    const text = redact('Bearer eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2ln for maria@welinc.com');
    expect(text).toBe('Bearer [token] for [email]');
  });

  it('leaves ordinary text alone', () => {
    const text = 'Cannot read properties of undefined (reading "id")';
    expect(redact(text)).toBe(text);
  });

  it('returns an empty string unchanged', () => {
    expect(redact('')).toBe('');
  });
});
