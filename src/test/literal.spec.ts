import { Literal } from "../lib/literal";

describe("OData V4 Literal", () => {


  it("literal: [null](null)", () => expect(Literal.convert("null", 'null')).toBeNull());
  it("literal: [Edm.Boolean](true)", () => expect(Literal.convert("Edm.Boolean", 'true')).toBeTruthy());
  it("literal: [Edm.Boolean](false)", () => expect(Literal.convert("Edm.Boolean", 'false')).toBeFalsy());
  it("literal: [Edm.Byte](1)", () => expect(Literal.convert("Edm.Byte", '1')).toEqual(1));
  it("literal: [Edm.SByte](-1)", () => expect(Literal.convert("Edm.SByte", '-1')).toEqual(-1));
  it("literal: [Edm.Int16](-32768)", () => expect(Literal.convert("Edm.Int16", '-32768')).toEqual(-32768));
  it("literal: [Edm.Int32](-2147483648)", () => expect(Literal.convert("Edm.Int32", '-2147483648')).toEqual(-2147483648));
  it("literal: [Edm.Int64](0)", () => expect(Literal.convert("Edm.Int64", '0')).toEqual(0));
  it("literal: [Edm.Decimal](34.95)", () => expect(Literal.convert("Edm.Decimal", '34.95')).toEqual(34.95));
  it("literal: [Edm.Double](0.31415926535897931e1)", () => expect(Literal.convert("Edm.Double", '0.31415926535897931e1')).toEqual(0.31415926535897931e1));
  it("literal: [Edm.Single](INF)", () => expect(Literal.convert("Edm.Single", 'INF')).toEqual(Infinity));
  it("literal: [Edm.String]('Say Hello,then go')", () => expect(Literal.convert("Edm.String", "'Say Hello,then go'")).toEqual("Say Hello,then go"));
  it("literal: [Edm.String]('Say Hello to O''Neill,then go')", () => expect(Literal.convert("Edm.String", "'Say Hello to O''Neill,then go'")).toEqual("Say Hello to O'Neill,then go"));
  it("literal: [Edm.Date](2012-12-03)", () => expect(Literal.convert("Edm.Date", '2012-12-03')).toEqual('2012-12-03'));
  it("literal: [Edm.DateTimeOffset](2012-12-03T07:16:23Z)", () => expect(Literal.convert('Edm.DateTimeOffset', '2012-12-03T07:16:23Z').valueOf()).toEqual(new Date("2012-12-03T07:16:23Z").valueOf()));
  it.skip("literal: [Edm.Duration](duration'P12DT23H59M59.999999999999S')", () => {
    expect(Literal.convert("Edm.Duration", "duration'P12DT23H59M59.999999999999S'pfo")).toEqual(1033199000)

  });
  it("literal: [Edm.TimeOfDay](07:59:59.999)", () => expect(Literal.convert('Edm.TimeOfDay', '07:59:59.999').valueOf()).toEqual(new Date("1970-01-01T07:59:59.999Z").valueOf()));
  it("literal: [Edm.Guid](01234567-89ab-cdef-0123-456789abcdef)", () => expect(Literal.convert("Edm.Guid", '01234567-89ab-cdef-0123-456789abcdef')).toEqual("01234567-89ab-cdef-0123-456789abcdef"));
});