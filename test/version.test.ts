import { describe, expect, it } from 'vitest';
import { integrationOutdated } from '../src/view';

describe('integrationOutdated', () => {
  it('says an integration that sends no version is older (before 2.0.9)', () => {
    expect(integrationOutdated(undefined)).toBe(true);
    expect(integrationOutdated('')).toBe(true);
  });
  it('compares release numbers', () => {
    expect(integrationOutdated('2.0.8', '2.0.9')).toBe(true);
    expect(integrationOutdated('2.0.9', '2.0.9')).toBe(false);
    expect(integrationOutdated('2.0.10', '2.0.9')).toBe(false);
    expect(integrationOutdated('2.1.0', '2.0.9')).toBe(false);
    expect(integrationOutdated('1.9.9', '2.0.0')).toBe(true);
  });
  it('counts a beta as its release', () => {
    expect(integrationOutdated('2.0.9b1', '2.0.9')).toBe(false);
    expect(integrationOutdated('2.0.8b3', '2.0.9')).toBe(true);
  });
});
