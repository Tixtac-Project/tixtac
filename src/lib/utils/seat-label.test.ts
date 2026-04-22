import { describe, it, expect } from 'bun:test';
import { getRowLabel, rowLabelToIndex, parseSeatLabel, buildSeatLabel } from './seat-label';

describe('seat-label utils', () => {
  describe('getRowLabel', () => {
    it('converts 0-based index to row label correctly', () => {
      expect(getRowLabel(0)).toBe('A');
      expect(getRowLabel(1)).toBe('B');
      expect(getRowLabel(25)).toBe('Z');
      expect(getRowLabel(26)).toBe('AA');
      expect(getRowLabel(27)).toBe('AB');
      expect(getRowLabel(51)).toBe('AZ');
      expect(getRowLabel(52)).toBe('BA');
      expect(getRowLabel(701)).toBe('ZZ');
      expect(getRowLabel(702)).toBe('AAA');
    });
  });

  describe('rowLabelToIndex', () => {
    it('converts row label back to 0-based index correctly', () => {
      expect(rowLabelToIndex('A')).toBe(0);
      expect(rowLabelToIndex('B')).toBe(1);
      expect(rowLabelToIndex('Z')).toBe(25);
      expect(rowLabelToIndex('AA')).toBe(26);
      expect(rowLabelToIndex('AB')).toBe(27);
      expect(rowLabelToIndex('AZ')).toBe(51);
      expect(rowLabelToIndex('BA')).toBe(52);
      expect(rowLabelToIndex('ZZ')).toBe(701);
      expect(rowLabelToIndex('AAA')).toBe(702);
    });
  });

  describe('parseSeatLabel', () => {
    it('parses valid alphabetic-row seat labels', () => {
      expect(parseSeatLabel('VIP-A1')).toEqual({ prefix: 'VIP', rowLabel: 'A', colNumber: 1 });
      expect(parseSeatLabel('STD-C10')).toEqual({ prefix: 'STD', rowLabel: 'C', colNumber: 10 });
      expect(parseSeatLabel('V1-AA25')).toEqual({ prefix: 'V1', rowLabel: 'AA', colNumber: 25 });
      expect(parseSeatLabel('DIA-B8')).toEqual({ prefix: 'DIA', rowLabel: 'B', colNumber: 8 });
    });

    it('parses valid numeric-row seat labels', () => {
      expect(parseSeatLabel('VIP-1-11')).toEqual({ prefix: 'VIP', rowLabel: '1', colNumber: 11 });
      expect(parseSeatLabel('KA-10-25')).toEqual({ prefix: 'KA', rowLabel: '10', colNumber: 25 });
      expect(parseSeatLabel('STB-1-1')).toEqual({ prefix: 'STB', rowLabel: '1', colNumber: 1 });
      expect(parseSeatLabel('KC-5-50')).toEqual({ prefix: 'KC', rowLabel: '5', colNumber: 50 });
    });

    it('returns null for invalid seat labels', () => {
      expect(parseSeatLabel('A1')).toBeNull(); // missing prefix
      expect(parseSeatLabel('1A')).toBeNull();
      expect(parseSeatLabel('ABC')).toBeNull();
      expect(parseSeatLabel('123')).toBeNull();
      expect(parseSeatLabel('-A1')).toBeNull(); // empty prefix
      expect(parseSeatLabel('VIP-')).toBeNull(); // no row/col
      expect(parseSeatLabel('vip-A1')).toBeNull(); // lowercase prefix
      expect(parseSeatLabel('')).toBeNull();
    });
  });

  describe('buildSeatLabel', () => {
    it('builds alphabetic-row seat labels', () => {
      expect(buildSeatLabel('VIP', 'A', 1)).toBe('VIP-A1');
      expect(buildSeatLabel('STD', 'C', 10)).toBe('STD-C10');
      expect(buildSeatLabel('V1', 'AA', 25)).toBe('V1-AA25');
    });

    it('builds numeric-row seat labels with separator', () => {
      expect(buildSeatLabel('VIP', '1', 11)).toBe('VIP-1-11');
      expect(buildSeatLabel('KA', '10', 25)).toBe('KA-10-25');
      expect(buildSeatLabel('STB', '1', 1)).toBe('STB-1-1');
    });

    it('roundtrips with parseSeatLabel for both formats', () => {
      const alphaLabel = buildSeatLabel('VIP', 'A', 1);
      expect(parseSeatLabel(alphaLabel)).toEqual({ prefix: 'VIP', rowLabel: 'A', colNumber: 1 });

      const numericLabel = buildSeatLabel('KA', '10', 25);
      expect(parseSeatLabel(numericLabel)).toEqual({ prefix: 'KA', rowLabel: '10', colNumber: 25 });
    });
  });
});
