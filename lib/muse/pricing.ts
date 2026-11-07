import type { BrandProfile } from "@/lib/types";
import { formatMoney } from "@/lib/brand/kit";

export interface PricingRow {
  service: string;
  price: number;
  cost: number;
  minutes: number;
  hourlyMargin: number;
  status: "healthy" | "tight" | "underpriced";
  suggestedPrice?: number;
  why: string;
}

export interface PricingReport {
  neededHourly: number;
  bookableHoursPerMonth: number;
  rows: PricingRow[];
  bookingsNeeded: number | null;
  summary: string;
  assumptions: string[];
}

const BUFFER_MIN = 15; // clean-down + consultation time per appointment
const UTILISATION = 0.7; // share of available hours that realistically get booked
const WEEKS_PER_MONTH = 4.33;

export function pricingCheck(brand: BrandProfile): PricingReport {
  const goal = brand.monthlyIncomeGoal ?? 0;
  const fixed = brand.monthlyFixedCosts ?? 0;
  const hours = brand.hoursPerWeek ?? 30;
  const bookable = hours * WEEKS_PER_MONTH * UTILISATION;
  const neededHourly = bookable > 0 ? (goal + fixed) / bookable : 0;
  const money = (n: number) => formatMoney(Math.round(n), brand);

  const rows: PricingRow[] = brand.services.map((s) => {
    const cost = s.cost ?? 0;
    const minutes = s.durationMin + BUFFER_MIN;
    const hourlyMargin = ((s.price - cost) / minutes) * 60;
    let status: PricingRow["status"] = "healthy";
    let suggestedPrice: number | undefined;
    let why = `Earns about ${money(hourlyMargin)}/hour after product costs (including ${BUFFER_MIN} min setup).`;
    if (goal > 0 && hourlyMargin < neededHourly * 0.85) {
      status = "underpriced";
      suggestedPrice = Math.ceil((neededHourly * (minutes / 60) + cost) / 5) * 5;
      why += ` Your goal needs about ${money(neededHourly)}/hour. Try about ${money(suggestedPrice)}, or shorten the appointment.`;
    } else if (goal > 0 && hourlyMargin < neededHourly) {
      status = "tight";
      why += " It's just under your target. A small increase or an add-on would close the gap.";
    }
    if (s.price > 0 && cost / s.price > 0.35) why += " Product costs are over 35% of the price. Check your supplier or portion sizes.";
    return { service: s.name, price: s.price, cost, minutes: s.durationMin, hourlyMargin: Math.round(hourlyMargin), status, suggestedPrice, why };
  });

  const avgMargin = brand.services.length ? brand.services.reduce((n, s) => n + (s.price - (s.cost ?? 0)), 0) / brand.services.length : 0;
  const bookingsNeeded = goal > 0 && avgMargin > 0 ? Math.ceil((goal + fixed) / avgMargin) : null;
  const under = rows.filter((r) => r.status === "underpriced").length;

  return {
    neededHourly: Math.round(neededHourly),
    bookableHoursPerMonth: Math.round(bookable),
    rows,
    bookingsNeeded,
    summary:
      goal <= 0
        ? "Add your monthly income goal, fixed costs and working hours in Brand Kit → Business to get a full check."
        : under
          ? `${under} of ${rows.length} services earn less per hour than your goal needs. At your current mix you'd need about ${bookingsNeeded} bookings a month.`
          : `Your prices support your goal. You need about ${bookingsNeeded} bookings a month at your current mix.`,
    assumptions: [
      `${BUFFER_MIN} minutes of setup/clean-down per appointment`,
      `${Math.round(UTILISATION * 100)}% of your working hours actually get booked`,
      "Your income goal is before tax. Check with an accountant for your tax rate.",
    ],
  };
}
