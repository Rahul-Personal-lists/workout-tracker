import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatInTimeZone } from "date-fns-tz";
import type { WeeklySummary } from "@/lib/weekly-summary";
import { muscleLabel } from "@/lib/muscle-groups";

const VANCOUVER_TZ = "America/Vancouver";

export type WeeklySummaryEmailProps = {
  summary: WeeklySummary;
  appUrl: string;
};

const styles = {
  body: { backgroundColor: "#f6f7f9", fontFamily: "system-ui, -apple-system, sans-serif" },
  container: {
    backgroundColor: "#ffffff",
    padding: "32px 24px",
    maxWidth: "560px",
    margin: "24px auto",
    borderRadius: "12px",
  },
  h1: { fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "#0f172a" },
  range: { fontSize: "14px", color: "#64748b", margin: "0 0 24px" },
  bigNumber: { fontSize: "44px", fontWeight: 800, margin: "0", color: "#0f172a", lineHeight: 1 },
  bigLabel: { fontSize: "13px", color: "#64748b", margin: "4px 0 0", letterSpacing: "0.04em", textTransform: "uppercase" as const },
  card: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    margin: "12px 0",
  },
  cardLabel: { fontSize: "12px", color: "#64748b", margin: "0 0 4px", letterSpacing: "0.04em", textTransform: "uppercase" as const },
  cardValue: { fontSize: "18px", fontWeight: 700, margin: "0", color: "#0f172a" },
  cardSub: { fontSize: "13px", color: "#475569", margin: "4px 0 0" },
  cta: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
    display: "inline-block",
  },
  footer: { fontSize: "12px", color: "#94a3b8", margin: "24px 0 0", textAlign: "center" as const },
};

export function WeeklySummaryEmail({ summary, appUrl }: WeeklySummaryEmailProps) {
  const range = `${formatInTimeZone(summary.weekStart, VANCOUVER_TZ, "MMM d")} – ${formatInTimeZone(summary.weekEnd, VANCOUVER_TZ, "MMM d")}`;

  if (summary.kind === "missed") {
    return (
      <Html>
        <Head />
        <Preview>You didn&apos;t log any workouts this week</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.h1}>Quiet week.</Heading>
            <Text style={styles.range}>{range}</Text>
            <Text style={{ fontSize: "15px", color: "#0f172a", lineHeight: 1.6 }}>
              No workouts logged this week.
              {summary.lastWeekVolume > 0
                ? ` Last week you lifted ${summary.lastWeekVolume.toLocaleString()} lb — let's get back to it.`
                : " Time to start the streak."}
            </Text>
            <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
              <Button href={`${appUrl}/today`} style={styles.cta}>
                Open today&apos;s workout
              </Button>
            </Section>
            <Hr style={{ borderColor: "#e2e8f0", margin: "28px 0 12px" }} />
            <Text style={styles.footer}>Workout Tracker · weekly summary</Text>
          </Container>
        </Body>
      </Html>
    );
  }

  const ranked = Object.entries(summary.perMuscle)
    .map(([group, volume]) => ({
      group: group as keyof typeof summary.perMuscle,
      volume,
    }))
    .filter((r) => r.volume > 0)
    .sort((a, b) => b.volume - a.volume);

  const COLS = 3;
  const gridRows: (typeof ranked)[] = [];
  for (let i = 0; i < ranked.length; i += COLS) {
    gridRows.push(ranked.slice(i, i + COLS));
  }

  return (
    <Html>
      <Head />
      <Preview>{`${summary.totalVolume.toLocaleString()} lb across ${summary.sessionsCount} session${summary.sessionsCount === 1 ? "" : "s"}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.h1}>Your week in lifts</Heading>
          <Text style={styles.range}>{range}</Text>

          <Section style={{ textAlign: "center", margin: "8px 0 24px" }}>
            <Text style={styles.bigNumber}>
              {summary.totalVolume.toLocaleString()} lb
            </Text>
            <Text style={styles.bigLabel}>
              total volume · {summary.sessionsCount} session
              {summary.sessionsCount === 1 ? "" : "s"}
            </Text>
          </Section>

          {ranked.length > 0 && (
            <Section style={styles.card}>
              <Text style={styles.cardLabel}>Muscles worked this week</Text>
              <table
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                style={{ width: "100%", marginTop: "8px" }}
              >
                <tbody>
                  {gridRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map(({ group, volume }) => (
                        <td
                          key={group}
                          style={{
                            width: `${100 / COLS}%`,
                            padding: "8px 4px",
                            textAlign: "center",
                            verticalAlign: "top",
                          }}
                        >
                          <Img
                            src={`${appUrl}/muscle-images/${group}.png`}
                            width="120"
                            alt={muscleLabel(group)}
                            style={{
                              borderRadius: "6px",
                              margin: "0 auto",
                              display: "block",
                            }}
                          />
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#0f172a",
                              marginTop: "6px",
                            }}
                          >
                            {muscleLabel(group)}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {volume.toLocaleString()} lb
                          </div>
                        </td>
                      ))}
                      {row.length < COLS &&
                        Array.from({ length: COLS - row.length }).map((_, i) => (
                          <td key={`pad-${i}`} style={{ width: `${100 / COLS}%` }} />
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {ranked.length > 0 && (
            <Section style={styles.card}>
              <Text style={styles.cardLabel}>Volume breakdown</Text>
              {ranked.map(({ group, volume }) => {
                const pct = Math.max(2, Math.round((volume / ranked[0].volume) * 100));
                return (
                  <table
                    key={group}
                    role="presentation"
                    cellPadding={0}
                    cellSpacing={0}
                    style={{ width: "100%", margin: "8px 0" }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: "84px",
                            fontSize: "13px",
                            color: "#475569",
                            verticalAlign: "middle",
                          }}
                        >
                          {muscleLabel(group)}
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "0 12px" }}>
                          <div
                            style={{
                              height: "8px",
                              backgroundColor: "#e2e8f0",
                              borderRadius: "4px",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "8px",
                                backgroundColor: "#0f172a",
                                borderRadius: "4px",
                              }}
                            />
                          </div>
                        </td>
                        <td
                          style={{
                            width: "84px",
                            textAlign: "right",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#0f172a",
                            verticalAlign: "middle",
                          }}
                        >
                          {volume.toLocaleString()} lb
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </Section>
          )}

          {summary.weakest && summary.weakest.avg > 0 && (
            <Section style={styles.card}>
              <Text style={styles.cardLabel}>Most regressed muscle group</Text>
              <Text style={styles.cardValue}>
                {muscleLabel(summary.weakest.group)}
              </Text>
              <Text style={styles.cardSub}>
                {`${Math.round(
                  summary.weakest.pctChange * 100
                )}% below your 4-week average (${summary.weakest.thisWeek.toLocaleString()} lb vs ${summary.weakest.avg.toLocaleString()} lb)`}
              </Text>
            </Section>
          )}

          <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
            <Button href={`${appUrl}/today`} style={styles.cta}>
              Plan next week
            </Button>
          </Section>

          <Hr style={{ borderColor: "#e2e8f0", margin: "28px 0 12px" }} />
          <Text style={styles.footer}>Workout Tracker · weekly summary</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WeeklySummaryEmail;
