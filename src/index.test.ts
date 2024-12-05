import { expect, test } from "vitest";
import { ReportManager } from "./index";

test("greet function", () => {
  const report = new ReportManager ()
  const dbpath = "./example"
  report.createReport(dbpath)
  expect("World").toBe("World");
});

test("greet2 function", async () => {
  const report = new ReportManager ()
  const dbpath = "./example"
  const value = await report.createSprintSummary(dbpath)
  console.log (JSON.stringify(value))
  expect("World").toBe("World");
});
