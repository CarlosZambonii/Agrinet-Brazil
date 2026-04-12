jest.mock("../lib/db");

const pool = require("../lib/db");
const authMiddleware = require("../middleware/authMiddleware");
const { sign } = require("../lib/jwt");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

describe("authMiddleware - API Key", () => {
  test("passa com API key válida", () => {
    process.env.API_KEY = "chave-teste";
    const req = { headers: { "x-api-key": "chave-teste" } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("rejeita com API key inválida e sem token", async () => {
    process.env.API_KEY = "chave-teste";
    const req = { headers: { "x-api-key": "errada" } };
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("authMiddleware - JWT", () => {
  test("rejeita sem Authorization header", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejeita com token inválido", async () => {
    const req = { headers: { authorization: "Bearer token.invalido" } };
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("passa com token válido e usuário ativo", async () => {
    const token = sign({ id: 1, role: "user" });
    pool.query = jest.fn().mockResolvedValue([[{ id: 1, is_blocked: 0 }]]);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  test("rejeita usuário bloqueado", async () => {
    const token = sign({ id: 2, role: "user" });
    pool.query = jest.fn().mockResolvedValue([[{ id: 2, is_blocked: 1, blocked_until: null }]]);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("desbloqueia usuário com blocked_until expirado", async () => {
    const token = sign({ id: 3, role: "user" });
    const pastDate = new Date(Date.now() - 1000).toISOString();
    pool.query = jest.fn()
      .mockResolvedValueOnce([[{ id: 3, is_blocked: 1, blocked_until: pastDate }]])
      .mockResolvedValueOnce([{}]); // UPDATE

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
