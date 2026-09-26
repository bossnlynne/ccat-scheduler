import { test } from "node:test";
import assert from "node:assert/strict";
import { googleDayTitle } from "../src/lib/event-title.ts";

const base = "［照護］陳小明-小花/小虎（lynne）";

test("只有一天：標題為「單日（原標題）」", () => {
  assert.equal(googleDayTitle(base, 0, 1), `單日（${base}）`);
});

test("多日：最後一天為「最後一天（原標題）」，其餘維持原標題", () => {
  const titles = [0, 1, 2].map((i) => googleDayTitle(base, i, 3));
  assert.deepEqual(titles, [base, base, `最後一天（${base}）`]);
});

test("兩天：第一天原標題，第二天為最後一天", () => {
  assert.deepEqual(
    [0, 1].map((i) => googleDayTitle("陳小明-小花/小虎", i, 2)),
    ["陳小明-小花/小虎", "最後一天（陳小明-小花/小虎）"]
  );
});
