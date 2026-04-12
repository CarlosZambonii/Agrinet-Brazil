jest.mock("../lib/db");
jest.mock("../lib/redis");

const pool = require("../lib/db");
const { redis } = require("../lib/redis");
const { calculateFraudScore } = require("../services/fraudService");

function mockQuery(results) {
  pool.query = jest.fn();
  results.forEach((result, i) => {
    pool.query.mockResolvedValueOnce(result);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  redis.incr = jest.fn().mockResolvedValue(1);
  redis.expire = jest.fn().mockResolvedValue(1);
});

describe("fraudService - calculateFraudScore (transação)", () => {
  test("score 0 para transação normal", async () => {
    mockQuery([
      [[{ total: 0 }]],
      [[{ total: 0 }]],
    ]);

    const score = await calculateFraudScore(1, 2, 100);
    expect(score).toBe(0);
  });

  test("+40 para valor acima de R$5000", async () => {
    mockQuery([
      [[{ total: 0 }]],
      [[{ total: 0 }]],
    ]);

    const score = await calculateFraudScore(1, 2, 6000);
    expect(score).toBe(40);
  });

  test("+30 para muitas transações recentes do comprador", async () => {
    mockQuery([
      [[{ total: 5 }]],
      [[{ total: 0 }]],
    ]);

    const score = await calculateFraudScore(1, 2, 100);
    expect(score).toBe(30);
  });

  test("+30 para muitas transações no mesmo par comprador/vendedor", async () => {
    mockQuery([
      [[{ total: 0 }]],
      [[{ total: 3 }]],
    ]);

    const score = await calculateFraudScore(1, 2, 100);
    expect(score).toBe(30);
  });

  test("score máximo (100) com tudo suspeito", async () => {
    mockQuery([
      [[{ total: 5 }]],
      [[{ total: 3 }]],
    ]);

    const score = await calculateFraudScore(1, 2, 6000);
    expect(score).toBe(100);
  });
});

describe("fraudService - calculateFraudScore (usuário)", () => {
  function mockUserQuery(velocityCount, walletCount, disputes, refunds, accountAgeDays) {
    redis.incr = jest.fn().mockResolvedValue(velocityCount);
    pool.query = jest.fn()
      .mockResolvedValueOnce([[{ count: walletCount }]])
      .mockResolvedValueOnce([[{ count: disputes }]])
      .mockResolvedValueOnce([[{ count: refunds }]])
      .mockResolvedValueOnce([[{ days: accountAgeDays }]])
      .mockResolvedValueOnce([{}]); // UPDATE
  }

  test("usuário confiável tem score baixo", async () => {
    mockUserQuery(1, 0, 0, 0, 30);
    const score = await calculateFraudScore(42);
    expect(score).toBe(0);
  });

  test("+20 para conta nova (menos de 7 dias)", async () => {
    mockUserQuery(1, 0, 0, 0, 3);
    const score = await calculateFraudScore(42);
    expect(score).toBe(20);
  });

  test("+30 para alta velocidade no Redis", async () => {
    mockUserQuery(5, 0, 0, 0, 30);
    const score = await calculateFraudScore(42);
    expect(score).toBe(30);
  });

  test("score acumula disputas corretamente", async () => {
    mockUserQuery(1, 0, 3, 0, 30);
    const score = await calculateFraudScore(42);
    expect(score).toBe(30); // 3 * 10
  });
});
