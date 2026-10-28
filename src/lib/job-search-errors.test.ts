import { describe, expect, it } from "vitest";
import { jobSearchLimitMessage } from "./job-search-errors.mjs";

describe("public job-search limit errors", () => {
  it("names migration 0002 only for a missing RPC", () => {
    expect(jobSearchLimitMessage("PGRST202")).toContain("0002_client_leads.sql");
    expect(jobSearchLimitMessage("42883")).toContain("0002_client_leads.sql");
  });
  it("distinguishes permission errors from other database failures", () => {
    expect(jobSearchLimitMessage("42501")).toContain("denied access");
    expect(jobSearchLimitMessage("XX000")).toContain("no job search was sent");
  });
});
