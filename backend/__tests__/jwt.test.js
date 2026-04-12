const { sign, verify } = require("../lib/jwt");

describe("lib/jwt", () => {
  test("sign gera um token e verify decodifica corretamente", () => {
    const payload = { id: 1, role: "user" };
    const token = sign(payload);
    const decoded = verify(token);

    expect(decoded.id).toBe(1);
    expect(decoded.role).toBe("user");
  });

  test("verify lança erro com token inválido", () => {
    expect(() => verify("token.invalido.aqui")).toThrow();
  });

  test("verify lança erro com token expirado", () => {
    const jwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "supersecretjwt";
    const expired = jwt.sign({ id: 1 }, secret, { expiresIn: -1 });
    expect(() => verify(expired)).toThrow();
  });
});
