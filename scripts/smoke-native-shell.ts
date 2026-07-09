import {
  planRestNotification,
  type RestSnapshot,
} from "../src/lib/native-shell";

const NOW = 1_000_000;
const idle: RestSnapshot = { endsAt: null, pausedAt: null };
const active = (endsAt: number): RestSnapshot => ({ endsAt, pausedAt: null });
const paused = (endsAt: number, pausedAt: number): RestSnapshot => ({
  endsAt,
  pausedAt,
});

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

check("start schedules", planRestNotification(idle, active(NOW + 45_000), NOW), {
  type: "schedule",
  at: NOW + 45_000,
});
check(
  "adjust reschedules",
  planRestNotification(active(NOW + 45_000), active(NOW + 60_000), NOW),
  { type: "schedule", at: NOW + 60_000 }
);
check("stop cancels", planRestNotification(active(NOW + 45_000), idle, NOW), {
  type: "cancel",
});
check(
  "pause cancels",
  planRestNotification(active(NOW + 45_000), paused(NOW + 45_000, NOW), NOW),
  { type: "cancel" }
);
check(
  "resume reschedules",
  planRestNotification(paused(NOW + 45_000, NOW - 5_000), active(NOW + 50_000), NOW),
  { type: "schedule", at: NOW + 50_000 }
);
check(
  "unrelated change is none",
  planRestNotification(active(NOW + 45_000), active(NOW + 45_000), NOW),
  { type: "none" }
);
check("idle to idle is none", planRestNotification(idle, idle, NOW), {
  type: "none",
});
check(
  "past endsAt never schedules",
  planRestNotification(idle, active(NOW - 1), NOW),
  { type: "none" }
);
check(
  "rehydrate catch-up schedules future timer",
  planRestNotification(idle, active(NOW + 30_000), NOW),
  { type: "schedule", at: NOW + 30_000 }
);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall smoke cases passed");
