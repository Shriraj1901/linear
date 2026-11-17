import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GitLabCsvImporter } from "../importers/gitlabCsv/GitlabCsvImporter.ts";

let tmpDir: string;

const importWeights = async (weights: string[]) => {
  const header = "Title,Description,URL,State,Labels,Due Date,Created At (UTC),Closed At (UTC),Weight,Time Estimate";
  const rows = weights.map(
    (weight, index) => `"Issue ${index}","",https://gitlab.com/a/b/-/issues/${index},opened,,,,,${weight},`
  );
  const file = path.join(tmpDir, `gitlab-${weights.join("-")}.csv`);
  fs.writeFileSync(file, [header, ...rows].join("\n"));
  const { issues } = await new GitLabCsvImporter(file).import();
  return issues.map(issue => issue.priority);
};

describe("GitLabCsvImporter priority", () => {
  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-import-"));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("maps the highest weight to Urgent and the lowest weight to Low", async () => {
    expect(await importWeights(["1", "2", "3", "4", "5"])).toEqual([4, 3, 3, 2, 1]);
  });

  it("never maps a weighted issue to No priority", async () => {
    const priorities = await importWeights(["1", "3", "8", "13", "21"]);

    expect(priorities.every(priority => priority !== undefined && priority >= 1 && priority <= 4)).toBe(true);
  });

  it("maps a single distinct weight to Urgent", async () => {
    expect(await importWeights(["3", "3"])).toEqual([1, 1]);
  });

  it("leaves issues without a weight unprioritized", async () => {
    expect(await importWeights(["", "2", "4"])).toEqual([undefined, 4, 1]);
  });
});

describe("GitLabCsvImporter state and dates", () => {
  // GitLab writes "Open" or "Closed" in State and "YYYY-MM-DD HH:MM:SS" in UTC in the date columns
  const importIssue = async (state: string, createdAt: string, closedAt: string) => {
    const header = "Title,Description,URL,State,Labels,Due Date,Created At (UTC),Closed At (UTC),Weight,Time Estimate";
    const row = `"Issue","",https://gitlab.com/a/b/-/issues/1,${state},,,${createdAt},${closedAt},,`;
    const file = path.join(tmpDir, `gitlab-${state}.csv`);
    fs.writeFileSync(file, [header, row].join("\n"));
    const { issues } = await new GitLabCsvImporter(file).import();
    return issues[0];
  };

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-import-"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("imports a Closed issue as Completed", async () => {
    const issue = await importIssue("Closed", "2026-01-02 03:04:05", "2026-02-03 04:05:06");

    expect(issue.status).toBe("Completed");
    expect(issue.completedAt).toEqual(new Date("2026-02-03T04:05:06Z"));
  });

  it("imports an Open issue as Backlog without a completion date", async () => {
    const issue = await importIssue("Open", "2026-01-02 03:04:05", "");

    expect(issue.status).toBe("Backlog");
    expect(issue.completedAt).toBeUndefined();
  });

  it("reads the UTC date columns as UTC in any time zone", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");

    const issue = await importIssue("Closed", "2026-01-02 03:04:05", "2026-02-03 04:05:06");

    expect(issue.createdAt?.toISOString()).toBe("2026-01-02T03:04:05.000Z");
    expect(issue.completedAt?.toISOString()).toBe("2026-02-03T04:05:06.000Z");
  });
});
