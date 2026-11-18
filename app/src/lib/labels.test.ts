import { describe, expect, it } from 'vitest';
import { areaLabel, titleCase } from './labels';

describe('display labels', () => {
  it('capitalizes room and surface labels', () => {
    expect(areaLabel('bedroom', 'wall')).toBe('Bedroom: Wall');
    expect(areaLabel('living room', 'white brick wall below the light switch')).toBe('Living Room: White Brick Wall Below the Light Switch');
  });
  it('uses the fixed phrases', () => {
    expect(titleCase('Move-in')).toBe('Move-In');
    expect(titleCase('move-out photos')).toBe('Move-Out Photos');
    expect(titleCase('Normal wear, no charge')).toBe('Normal Wear, No Charge');
  });
});
