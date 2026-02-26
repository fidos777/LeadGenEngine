import { canAccess } from "@/lib/auth/permissions";

describe("Permission Matrix", () => {
  describe("operator role", () => {
    test("can read leads", () => {
      expect(canAccess("operator", "leads", "read")).toBe(true);
    });

    test("can write leads", () => {
      expect(canAccess("operator", "leads", "write")).toBe(true);
    });

    test("can delete leads", () => {
      expect(canAccess("operator", "leads", "delete")).toBe(true);
    });

    test("can read companies", () => {
      expect(canAccess("operator", "companies", "read")).toBe(true);
    });

    test("can write contacts", () => {
      expect(canAccess("operator", "contacts", "write")).toBe(true);
    });
  });

  describe("caller role", () => {
    test("cannot read leads", () => {
      expect(canAccess("caller", "leads", "read")).toBe(false);
    });

    test("cannot write leads", () => {
      expect(canAccess("caller", "leads", "write")).toBe(false);
    });

    test("can read companies", () => {
      expect(canAccess("caller", "companies", "read")).toBe(true);
    });

    test("can write contacts", () => {
      expect(canAccess("caller", "contacts", "write")).toBe(true);
    });

    test("cannot delete companies", () => {
      expect(canAccess("caller", "companies", "delete")).toBe(false);
    });
  });

  describe("client role", () => {
    test("cannot read leads", () => {
      expect(canAccess("client", "leads", "read")).toBe(false);
    });

    test("cannot write companies", () => {
      expect(canAccess("client", "companies", "write")).toBe(false);
    });

    test("cannot read contacts", () => {
      expect(canAccess("client", "contacts", "read")).toBe(false);
    });
  });
});
