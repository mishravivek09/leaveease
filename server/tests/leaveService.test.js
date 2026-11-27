import test from "node:test";
import assert from "node:assert/strict";
import Holiday from "../models/Holiday.js";
import { calculateWorkingDays, parseUtcDate } from "../services/leaveService.js";

test("parseUtcDate normalizes YYYY-MM-DD to UTC midnight without timezone shift", () => {
  const dt = parseUtcDate("2026-08-15");
  assert.equal(dt.toISOString(), "2026-08-15T00:00:00.000Z");
  assert.equal(parseUtcDate("invalid-date"), null);
});

test("calculateWorkingDays excludes weekends and mandatory holidays (not optional)", async (t) => {
  // 2026-08-14 (Fri) to 2026-08-18 (Tue) -> Sat 15, Sun 16, Mon 17 (mandatory holiday), Tue 18 (optional)
  t.mock.method(Holiday, "find", () => ({
    lean: async () => [
      { holidayDate: new Date("2026-08-17T00:00:00.000Z"), isOptional: false },
    ],
  }));

  const result = await calculateWorkingDays("2026-08-14", "2026-08-18", [0, 6]);
  assert.equal(result.noOfDays, 2); // Fri 14 + Tue 18
  assert.equal(result.excludedWeekends, 2);
  assert.equal(result.excludedHolidays, 1);
});

test("calculateWorkingDays returns 0 working days for weekend-only range", async (t) => {
  t.mock.method(Holiday, "find", () => ({
    lean: async () => [],
  }));

  const result = await calculateWorkingDays("2026-08-15", "2026-08-16", [0, 6]);
  assert.equal(result.noOfDays, 0);
  assert.equal(result.excludedWeekends, 2);
});

test("calculateWorkingDays rejects inverted date range", async () => {
  await assert.rejects(
    () => calculateWorkingDays("2026-08-20", "2026-08-15", [0, 6]),
    (err) => err.statusCode === 400
  );
});
