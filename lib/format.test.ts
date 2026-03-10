import { describe, expect, it } from 'vitest';

import {
  formatAmountInputDisplay,
  stripToNumericString,
} from './format';

describe('amount input helpers', () => {
  describe('stripToNumericString', () => {
    it('strips commas so displayed value is stored as raw for submit', () => {
      expect(stripToNumericString('12,224,520', { allowDecimals: false })).toBe(
        '12224520'
      );
      expect(stripToNumericString('5,000,000', { allowDecimals: false })).toBe(
        '5000000'
      );
    });

    it('allows decimals when allowDecimals is true (default)', () => {
      expect(stripToNumericString('1,234.56')).toBe('1234.56');
      expect(stripToNumericString('1,234.5')).toBe('1234.5');
    });

    it('integer-only mode strips dots', () => {
      expect(stripToNumericString('12224520.50', { allowDecimals: false })).toBe(
        '1222452050'
      );
    });
  });

  describe('formatAmountInputDisplay', () => {
    it('formats raw integer string with commas (no decimals)', () => {
      expect(formatAmountInputDisplay('12224520', { decimals: false })).toBe(
        '12,224,520'
      );
      expect(formatAmountInputDisplay('5000000', { decimals: false })).toBe(
        '5,000,000'
      );
    });

    it('round-trip: raw -> display -> strip yields raw for submit', () => {
      const raw = '12224520';
      const display = formatAmountInputDisplay(raw, { decimals: false });
      expect(display).toBe('12,224,520');
      const stripped = stripToNumericString(display, { allowDecimals: false });
      expect(stripped).toBe(raw);
    });
  });
});
