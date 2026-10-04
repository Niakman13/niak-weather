import { expect, it } from 'vitest';
import { comfortColor } from '../src/comfort-color';
it('matches rail stops and clamps temperatures outside the displayed scale', () => {
  expect(comfortColor(-5)).toBe('74,127,208');
  expect(comfortColor(24)).toBe('242,201,76');
  expect(comfortColor(45)).toBe('244,105,102');
  expect(comfortColor(-40)).toBe(comfortColor(-5));
  expect(comfortColor(60)).toBe(comfortColor(45));
});
