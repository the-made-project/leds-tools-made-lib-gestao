import { expect, test } from "vitest";
import { ReportManager } from "./index";

test("greet function", () => {
  const report = new ReportManager ()
  const dbpath = "./example"
  report.createReport(dbpath)
  expect("World").toBe("World");
});
