import { calculateStars } from '../services/starRating';

describe('calculateStars', () => {
  // 3 stars: 0 hints, 0-1 invalid attempts
  test('returns 3 stars for 0 hints, 0 mistakes', () => {
    expect(calculateStars(0, 0)).toBe(3);
  });

  test('returns 3 stars for 0 hints, 1 mistake', () => {
    expect(calculateStars(0, 1)).toBe(3);
  });

  // 2 stars: 1 hint OR 2-3 invalid attempts
  test('returns 2 stars for 1 hint, 0 mistakes', () => {
    expect(calculateStars(1, 0)).toBe(2);
  });

  test('returns 2 stars for 0 hints, 2 mistakes', () => {
    expect(calculateStars(0, 2)).toBe(2);
  });

  test('returns 2 stars for 0 hints, 3 mistakes', () => {
    expect(calculateStars(0, 3)).toBe(2);
  });

  test('returns 2 stars for 1 hint, 1 mistake', () => {
    expect(calculateStars(1, 1)).toBe(2);
  });

  // 1 star: 2+ hints OR 4+ invalid attempts
  test('returns 1 star for 2 hints, 0 mistakes', () => {
    expect(calculateStars(2, 0)).toBe(1);
  });

  test('returns 1 star for 0 hints, 4 mistakes', () => {
    expect(calculateStars(0, 4)).toBe(1);
  });

  test('returns 1 star for 3 hints, 5 mistakes', () => {
    expect(calculateStars(3, 5)).toBe(1);
  });

  test('returns 1 star for 0 hints, 10 mistakes', () => {
    expect(calculateStars(0, 10)).toBe(1);
  });

  // Edge cases
  test('handles very large numbers', () => {
    expect(calculateStars(100, 100)).toBe(1);
  });

  test('1 hint with 4+ mistakes returns 1 star (both conditions)', () => {
    expect(calculateStars(1, 4)).toBe(1);
  });
});
