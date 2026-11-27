import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { buildCsvBuffer, streamPdf } from "../services/reportService.js";

test("buildCsvBuffer formats RFC-4180 CSV with escaped commas and quotes", () => {
  const columns = [
    { key: "employee", label: "Employee" },
    { key: "notes", label: "Notes" },
  ];
  const rows = [{ employee: "Vivek", notes: 'Sick, "urgent"' }];
  const buf = buildCsvBuffer(columns, rows);
  const text = buf.toString("utf8");
  assert.equal(text, 'Employee,Notes\r\nVivek,"Sick, ""urgent"""');
});

test("streamPdf outputs valid non-empty PDF header and EOF", async () => {
  const res = new PassThrough();
  res.setHeader = () => {};
  const chunks = [];
  res.on("data", (c) => chunks.push(c));

  await new Promise((resolve) => {
    res.on("end", resolve);
    streamPdf(
      res,
      "Test Report",
      "test.pdf",
      [{ key: "employee", label: "Employee" }],
      [{ employee: "Vivek" }]
    );
  });

  const pdf = Buffer.concat(chunks).toString("latin1");
  assert.ok(pdf.startsWith("%PDF-"));
  assert.ok(pdf.includes("%%EOF"));
});
