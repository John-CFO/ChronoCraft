//////////////////// totpWindow.unit.ts //////////////////////

// This file contains the TOTP Window Logic Unit Tests

//////////////////////////////////////////////////////////////////////////////

import { hotp, verifyTotp } from "../../../src/security/totpCore";

//////////////////////////////////////////////////////////////////////////////

describe("TOTP Window Logic", () => {
  const SECRET = "KRSXG5A2FNFYCAZQ";
  const fixedTime = 1700000000000;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(fixedTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("valid current window", () => {
    const counter = Math.floor(fixedTime / 1000 / 30);
    const token = hotp(SECRET, counter);
    expect(verifyTotp(SECRET, token)).toBe(true);
  });

  it("accepts forward window", () => {
    const counter = Math.floor(fixedTime / 1000 / 30);
    const token = hotp(SECRET, counter + 1);
    expect(verifyTotp(SECRET, token, 1, fixedTime)).toBe(true);
  });

  it("rejects outside window", () => {
    const counter = Math.floor(fixedTime / 1000 / 30);
    const token = hotp(SECRET, counter + 2);
    expect(verifyTotp(SECRET, token, 1, fixedTime)).toBe(false);
  });

  it("boundary drift 29s valid", () => {
    const t = fixedTime + 29000;
    const counter = Math.floor(t / 1000 / 30);
    const token = hotp(SECRET, counter);
    expect(verifyTotp(SECRET, token, 0, t)).toBe(true);
  });

  it("expired after 31s when window=0", () => {
    const counter = Math.floor(fixedTime / 1000 / 30);
    const token = hotp(SECRET, counter);
    expect(verifyTotp(SECRET, token, 0, fixedTime + 31000)).toBe(false);
  });
});
