import { expect, test } from "vitest";
import { ReportManager } from "./index";

test("greet function", () => {
  const report = new ReportManager ()
  report.createReport()
  expect("World").toBe("World");
});
