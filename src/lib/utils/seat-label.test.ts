import { describe, it, expect } from 'bun:test';
import { getRowLabel, rowLabelToIndex, parseSeatLabel } from './seat-label';

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
    it('parses valid seat labels', () => {
      expect(parseSeatLabel('A1')).toEqual({ rowLabel: 'A', colNumber: 1 });
      expect(parseSeatLabel('C10')).toEqual({ rowLabel: 'C', colNumber: 10 });
      expect(parseSeatLabel('AA25')).toEqual({ rowLabel: 'AA', colNumber: 25 });
    });

    it('returns null for invalid seat labels', () => {
      expect(parseSeatLabel('1A')).toBeNull();
      expect(parseSeatLabel('ABC')).toBeNull();
      expect(parseSeatLabel('123')).toBeNull();
      expect(parseSeatLabel('A-1')).toBeNull();
      expect(parseSeatLabel('')).toBeNull();
    });
  });
});
