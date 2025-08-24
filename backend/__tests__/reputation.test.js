const { calculateReputationScore } = require('../utils/reputation');

describe('calculateReputationScore', () => {
  test('applies bayesian weighting and rater reputation', () => {
    const result = calculateReputationScore({
      currentScore: 0,
      currentWeight: 0,
      newRating: 4,
      raterScore: 2
    });
    const expected = (2 * 5 + 4 * 2) / (5 + 2);
    expect(result.score).toBeCloseTo(expected);
    expect(result.weight).toBe(2);
  });
});
