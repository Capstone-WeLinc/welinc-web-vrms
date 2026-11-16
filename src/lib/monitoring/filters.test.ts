import type { ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { apiOrigin, beforeBreadcrumb, createBeforeSend, isApiClientError, vrmsRoleTag } from './filters';
import { redact } from './redact';

// covers: VRMS spec 0025 AC-6, AC-9

const crash = () => ({ originalException: new Error('boom') });
const event = (extra: Partial<ErrorEvent> = {}): ErrorEvent => ({ type: undefined, ...extra });

describe('isApiClientError', () => {
  it('spots axios answers, network failures and cancelled calls', () => {
    expect(isApiClientError({ isAxiosError: true, message: 'Network Error' })).toBe(true);
    expect(isApiClientError({ response: { status: 500 } })).toBe(true);
    expect(isApiClientError({ name: 'CanceledError' })).toBe(true);
    expect(isApiClientError({ name: 'AbortError' })).toBe(true);
  });

  it('leaves a real crash alone', () => {
    expect(isApiClientError(new TypeError('x is undefined'))).toBe(false);
    expect(isApiClientError('text')).toBe(false);
    expect(isApiClientError(null)).toBe(false);
  });
});

describe('createBeforeSend', () => {
  it('drops an API client error', () => {
    const send = createBeforeSend();
    expect(send(event(), { originalException: { isAxiosError: true } })).toBeNull();
  });

  it('strips the query string and keeps only the user agent and user id', () => {
    const send = createBeforeSend();
    const sent = send(
      event({
        request: {
          url: 'https://vrms.welinc.test/reset?code=123456&email=a@b.co',
          query_string: 'code=123456',
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://x.test/?code=1' },
          cookies: { a: 'b' },
        },
        user: { id: 'u1', email: 'a@b.co', ip_address: '1.2.3.4' },
      }),
      crash(),
    );
    expect(sent?.request).toEqual({ url: 'https://vrms.welinc.test/reset', headers: { 'User-Agent': 'Mozilla/5.0' } });
    expect(sent?.user).toEqual({ id: 'u1' });
  });

  it('redacts the message, exception values and breadcrumbs', () => {
    const sent = createBeforeSend()(
      event({
        message: 'for a@b.co',
        exception: { values: [{ value: 'Bearer abc failed' }] },
        breadcrumbs: [{ message: 'eyJa.eyJb.c' }],
      }),
      crash(),
    );
    expect(sent?.message).toBe('for [email]');
    expect(sent?.exception?.values?.[0].value).toBe('Bearer [token] failed');
    expect(sent?.breadcrumbs?.[0].message).toBe('[token]');
  });

  it('stops after the per page cap', () => {
    const send = createBeforeSend(2);
    expect(send(event(), crash())).not.toBeNull();
    expect(send(event(), crash())).not.toBeNull();
    expect(send(event(), crash())).toBeNull();
  });

  it('does not count a dropped event toward the cap', () => {
    const send = createBeforeSend(1);
    expect(send(event(), { originalException: { isAxiosError: true } })).toBeNull();
    expect(send(event(), crash())).not.toBeNull();
  });
});

describe('beforeBreadcrumb', () => {
  it('drops console breadcrumbs', () => {
    expect(beforeBreadcrumb({ category: 'console', message: 'hi' })).toBeNull();
  });

  it('keeps only method, path and status on API calls', () => {
    expect(
      beforeBreadcrumb({
        category: 'xhr',
        data: { method: 'GET', url: 'https://api.test/vrms/x?email=a@b.co', status_code: 200, request_body_size: 9 },
      }),
    ).toEqual({ category: 'xhr', data: { method: 'GET', url: 'https://api.test/vrms/x', status_code: 200 } });
  });

  it('strips queries from navigation breadcrumbs', () => {
    expect(beforeBreadcrumb({ category: 'navigation', data: { from: '/a?x=1', to: '/b#y' } })?.data).toEqual({ from: '/a', to: '/b' });
  });
});

describe('apiOrigin', () => {
  it('keeps only the origin', () => {
    expect(apiOrigin('https://api.welinc.test/some/path')).toBe('https://api.welinc.test');
    expect(apiOrigin('not a url')).toBeUndefined();
  });
});

describe('vrmsRoleTag', () => {
  it('joins the VRMS role names only', () => {
    expect(
      vrmsRoleTag([
        { role: 'ADMIN', system: 'VRMS' },
        { role: 'DRIVER', system: 'VMMS' },
      ]),
    ).toBe('ADMIN');
  });

  it('gives no tag without a VRMS role (never the MECHANIC fallback)', () => {
    expect(vrmsRoleTag([{ role: 'DRIVER', system: 'VMMS' }])).toBeUndefined();
    expect(vrmsRoleTag([])).toBeUndefined();
  });
});

describe('redact', () => {
  it('replaces emails, JWTs and bearer values', () => {
    expect(redact('a@b.co eyJx.eyJy.z Bearer q')).toBe('[email] [token] Bearer [token]');
  });
});
