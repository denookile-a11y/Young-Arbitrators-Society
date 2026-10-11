import { describe, it, expect } from "vitest";
import { departmentHeading } from "./department-copy";

describe("department heading follows the real count", () => {
  it.each([
    [1, "One department, one institutional mandate."],
    [4, "Four departments, one institutional mandate."],
    [7, "Seven departments, one institutional mandate."],
    [10, "Ten departments, one institutional mandate."],
    [15, "Fifteen departments, one institutional mandate."],
    [20, "Twenty departments, one institutional mandate."],
    [25, "25 departments, one institutional mandate."],
    [0, "Our departments, one institutional mandate."],
  ])("%i -> %s", (n, text) => {
    expect(departmentHeading(n)).toBe(text);
  });
});
