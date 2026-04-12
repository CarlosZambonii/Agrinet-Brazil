const { sanitizeFields } = require("../middleware/sanitizeInput");

function mockReqRes(body) {
  const req = { body };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe("middleware/sanitizeInput", () => {
  test("remove tags HTML de campos especificados", () => {
    const { req, res, next } = mockReqRes({ name: "<b>Carlos</b>" });
    sanitizeFields(["name"])(req, res, next);
    expect(req.body.name).toBe("Carlos");
    expect(next).toHaveBeenCalled();
  });

  test("remove tags script (conteúdo entre tags permanece sem os delimitadores)", () => {
    const { req, res, next } = mockReqRes({ name: "<script>xss</script>Carlos" });
    sanitizeFields(["name"])(req, res, next);
    // tag stripper remove as tags, não o conteúdo entre elas
    expect(req.body.name).toBe("xssCarlos");
    expect(next).toHaveBeenCalled();
  });

  test("não altera campos não especificados", () => {
    const { req, res, next } = mockReqRes({ name: "<b>Carlos</b>", email: "<b>test@test.com</b>" });
    sanitizeFields(["name"])(req, res, next);
    expect(req.body.name).toBe("Carlos");
    expect(req.body.email).toBe("<b>test@test.com</b>");
  });

  test("não altera valores não-string", () => {
    const { req, res, next } = mockReqRes({ amount: 100 });
    sanitizeFields(["amount"])(req, res, next);
    expect(req.body.amount).toBe(100);
  });

  test("chama next quando body é undefined", () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    sanitizeFields(["name"])(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
