// __tests__/lib/caller/sort.test.ts
import { sortLeadsForCaller } from "@/lib/caller/sort";
import type { CallerLead } from "@/types/caller";

describe("sortLeadsForCaller", () => {
  const makeLead = (
    id: string,
    zone: string | null,
    hasPhone: boolean
  ): CallerLead => ({
    id,
    status: "identified",
    company: { id: `c-${id}`, name: `Company ${id}`, zone, sector: null },
    contact: hasPhone ? { phone: "+60123456789" } : null,
  });

  it("puts leads with phone first", () => {
    const leads = [
      makeLead("1", "Klang", false),
      makeLead("2", "Klang", true),
    ];
    const sorted = sortLeadsForCaller(leads);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("sorts by zone priority within phone groups", () => {
    const leads = [
      makeLead("1", "Semenyih", true),
      makeLead("2", "Klang", true),
      makeLead("3", "Shah Alam", true),
    ];
    const sorted = sortLeadsForCaller(leads);
    expect(sorted.map((l) => l.id)).toEqual(["2", "3", "1"]);
  });

  it("puts unknown zones after known zones", () => {
    const leads = [
      makeLead("1", "Johor", true),
      makeLead("2", "Rawang", true),
    ];
    const sorted = sortLeadsForCaller(leads);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });
});
