import { expect, it } from 'vitest';
import { calendarNetworkMessage } from '../src/lib/server/feed-fetch';

it('explains restricted outgoing access without leaking a private link', () => {
  const error = {
    message: 'https://calendar.example/SECRET',
    errors: [{ code: 'EACCES' }, { code: 'EACCES' }],
  };
  expect(calendarNetworkMessage(error)).toContain('blocked from accessing the internet');
  expect(calendarNetworkMessage(error)).not.toContain('SECRET');
});
it('distinguishes name resolution, timeout and certificate errors', () => {
  expect(calendarNetworkMessage({ code: 'ENOTFOUND' })).toContain('could not be resolved');
  expect(calendarNetworkMessage({ cause: { code: 'ETIMEDOUT' } })).toContain('in time');
  expect(calendarNetworkMessage({ code: 'CERT_HAS_EXPIRED' })).toContain('secure connection');
  expect(calendarNetworkMessage({ message: 'secret' })).not.toContain('secret');
});
