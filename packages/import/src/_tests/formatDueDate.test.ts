import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AsanaCsvImporter } from "../importers/asanaCsv/AsanaCsvImporter.ts";
import { GitLabCsvImporter } from "../importers/gitlabCsv/GitlabCsvImporter.ts";
import { formatDueDate } from "../utils/formatDueDate.ts";

let tmpDir: string;

const writeCsv = (name: string, header: string[], row: string[]) => {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, [header.join(","), row.join(",")].join("\n"));
  return file;
};

const timeZones = ["America/Los_Angeles", "UTC", "Pacific/Auckland"];

describe("formatDueDate", () => {
  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-import-"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it.each(timeZones)("keeps the due date of an Asana task in %s", async timeZone => {
    vi.stubEnv("TZ", timeZone);
    const file = writeCsv(
      "asana.csv",
      ["Task ID", "Created At", "Completed At", "Name", "Assignee", "Due Date", "Tags", "Notes", "Priority"],
      ["1", "2026-03-01", "", "Task", "", "2026-03-05", "", "", ""]
    );

    const { issues } = await new AsanaCsvImporter(file, "").import();

    expect(formatDueDate(issues[0].dueDate as Date)).toBe("2026-03-05");
  });

  it.each(timeZones)("keeps the due date of a GitLab issue in %s", async timeZone => {
    vi.stubEnv("TZ", timeZone);
    const file = writeCsv(
      "gitlab.csv",
      ["Title", "Description", "URL", "State", "Labels", "Due Date", "Created At (UTC)", "Closed At (UTC)"],
      ["Issue", "", "https://gitlab.com/a/b/-/issues/1", "Open", "", "2026-03-05", "", ""]
    );

    const { issues } = await new GitLabCsvImporter(file).import();

    expect(formatDueDate(issues[0].dueDate as Date)).toBe("2026-03-05");
  });
});
