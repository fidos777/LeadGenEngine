import { canTransition } from "@/lib/leads/transitions";

describe("Lead Status Transitions", () => {
  test("identified → outreached allowed", () => {
    expect(canTransition("identified", "outreached")).toBe(true);
  });

  test("identified → qualified NOT allowed", () => {
    expect(canTransition("identified", "qualified")).toBe(false);
  });

  test("identified → closed_lost allowed", () => {
    expect(canTransition("identified", "closed_lost")).toBe(true);
  });

  test("outreached → responded allowed", () => {
    expect(canTransition("outreached", "responded")).toBe(true);
  });

  test("responded → qualified allowed", () => {
    expect(canTransition("responded", "qualified")).toBe(true);
  });

  test("qualified → appointment_booked allowed", () => {
    expect(canTransition("qualified", "appointment_booked")).toBe(true);
  });

  test("appointment_booked → closed_won allowed", () => {
    expect(canTransition("appointment_booked", "closed_won")).toBe(true);
  });

  test("appointment_booked → identified NOT allowed", () => {
    expect(canTransition("appointment_booked", "identified")).toBe(false);
  });

  test("closed_won has no outgoing transitions", () => {
    expect(canTransition("closed_won", "qualified")).toBe(false);
  });

  test("closed_lost has no outgoing transitions", () => {
    expect(canTransition("closed_lost", "identified")).toBe(false);
  });
});
