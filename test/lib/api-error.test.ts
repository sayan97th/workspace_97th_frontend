import { describe, expect, test } from "vitest";
import { getApiErrorMessage } from "@/lib/api-error";

describe("getApiErrorMessage", () => {
  test("prefers the first validation message", () => {
    expect(getApiErrorMessage({ errors: { name: ["Too long", "Other"] }, message: "Invalid" }, "fallback")).toBe("Too long");
    expect(getApiErrorMessage({ errors: { name: "Plain string" } }, "fallback")).toBe("Plain string");
  });

  test("then the top-level message", () => {
    expect(getApiErrorMessage({ message: "Forbidden" }, "fallback")).toBe("Forbidden");
  });

  test("then the fallback, for blank or non-API errors", () => {
    expect(getApiErrorMessage({}, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ message: "   " }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
    expect(getApiErrorMessage("boom", "fallback")).toBe("fallback");
  });
});
