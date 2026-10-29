import { describe, expect, it } from 'vitest';
import { buildAbility } from './keys';

// Spec 0011, AC-22 and AC-16: the browser builds flag rules from the keys the server sends
describe('buildAbility', () => {
  it('allows exactly the keys it was given', () => {
    const ability = buildAbility(['ticket.view', 'knowledge.view']);

    expect(ability.can('ticket.view', 'Permission')).toBe(true);
    expect(ability.can('knowledge.view', 'Permission')).toBe(true);
  });

  it('denies every key it was not given', () => {
    const ability = buildAbility(['ticket.view']);

    expect(ability.can('users.manage', 'Permission')).toBe(false);
    expect(ability.can('analytics.view', 'Permission')).toBe(false);
  });

  it('denies everything for an empty key list, which is the No VRMS access case (AC-23)', () => {
    const ability = buildAbility([]);

    expect(ability.can('ticket.view', 'Permission')).toBe(false);
    expect(ability.can('config.read', 'Permission')).toBe(false);
  });

  it('reads a fresh key list as a new ability, so a refetch can revoke a right (AC-20, AC-23)', () => {
    const before = buildAbility(['analytics.view']);
    const after = buildAbility([]);

    expect(before.can('analytics.view', 'Permission')).toBe(true);
    expect(after.can('analytics.view', 'Permission')).toBe(false);
  });

  it('does not grant a key through a similar looking one', () => {
    const ability = buildAbility(['ticket.view']);

    expect(ability.can('ticket.view_all', 'Permission')).toBe(false);
  });
});
