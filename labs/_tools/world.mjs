/* The facts of the case study, written once. Everything is invented: Ghaym Regional Weather and
   Climate Centre, its people, its travel policy and every number. No randomness: the same values
   on every run. */

export const POLICY = {
  flatOld: 600,        // SAR per night, version 2
  tierA: 650,          // SAR per night in Riyadh, Jeddah and Dammam, version 3
  tierB: 500,          // SAR per night elsewhere in the Kingdom, version 3
  bookingDays: 14,
  bookingDaysOld: 3,
  economyUnderHours: 6,
  directorAboveNights: 5,
  settleWorkingDays: 10,
  settleDaysOld: 30,
  emergencyLogWorkingDays: 2,
  articles: 12,
  effective: '1 يناير 2027'
};

/* Travel in work missions, by department: second quarter (trips, cost) and third quarter
   (trips, nights, nights in tier A cities, cost in SAR). */
export const TRAVEL = [
  { id: 'field', name: 'المحطات الميدانية', q2_trips: 46, q2_cost: 219000, q3_trips: 58, q3_nights: 232, q3_nights_a: 52, q3_cost: 301600 },
  { id: 'forecast', name: 'التنبؤات', q2_trips: 12, q2_cost: 54600, q3_trips: 14, q3_nights: 42, q3_nights_a: 30, q3_cost: 61300 },
  { id: 'climate', name: 'المناخ والدراسات', q2_trips: 9, q2_cost: 41200, q3_trips: 11, q3_nights: 38, q3_nights_a: 20, q3_cost: 49500 },
  { id: 'it', name: 'تقنية المعلومات', q2_trips: 15, q2_cost: 66000, q3_trips: 13, q3_nights: 39, q3_nights_a: 24, q3_cost: 57200 },
  { id: 'corporate', name: 'الخدمات المؤسسية', q2_trips: 8, q2_cost: 30400, q3_trips: 6, q3_nights: 14, q3_nights_a: 12, q3_cost: 22800 },
  { id: 'comms', name: 'الاتصال والنشر', q2_trips: 5, q2_cost: 19500, q3_trips: 7, q3_nights: 16, q3_nights_a: 14, q3_cost: 28700 },
  { id: 'legal', name: 'الشؤون القانونية', q2_trips: 3, q2_cost: 12300, q3_trips: 2, q3_nights: 4, q3_nights_a: 4, q3_cost: 8100 },
  { id: 'finance', name: 'المالية', q2_trips: 4, q2_cost: 15000, q3_trips: 5, q3_nights: 11, q3_nights_a: 9, q3_cost: 18800 }
];

export const TRAVEL_COLUMNS = ['department', 'q2_trips', 'q2_cost_sar', 'q3_trips', 'q3_nights', 'q3_nights_tier_a', 'q3_cost_sar'];

export function travelCsv() {
  const lines = [TRAVEL_COLUMNS.join(',')];
  for (const r of TRAVEL) lines.push([r.name, r.q2_trips, r.q2_cost, r.q3_trips, r.q3_nights, r.q3_nights_a, r.q3_cost].join(','));
  return lines.join('\n') + '\n';
}

const sum = (rows, key) => rows.reduce((a, r) => a + r[key], 0);
const round1 = (x) => Math.round(x * 10) / 10;

/* The eight lines of the worked reference answer of lab 1.2, computed from the table. */
export function frontier(rows = TRAVEL, policy = POLICY) {
  const q3Cost = sum(rows, 'q3_cost');
  const q2Cost = sum(rows, 'q2_cost');
  const q3Trips = sum(rows, 'q3_trips');
  const nights = sum(rows, 'q3_nights');
  const nightsA = sum(rows, 'q3_nights_a');
  const top = rows.reduce((a, r) => (r.q3_cost > a.q3_cost ? r : a));
  const perTrip = rows.map((r) => ({ name: r.name, value: r.q3_cost / r.q3_trips }));
  const highest = perTrip.reduce((a, r) => (r.value > a.value ? r : a));
  const perDiemOld = nights * policy.flatOld;
  const perDiemNew = nightsA * policy.tierA + (nights - nightsA) * policy.tierB;
  return {
    q3_cost: q3Cost,
    q3_trips: q3Trips,
    q2_cost: q2Cost,
    change_pct: round1(((q3Cost - q2Cost) / q2Cost) * 100),
    cost_per_trip: Math.round(q3Cost / q3Trips),
    top_department: top.name,
    top_share_pct: round1((top.q3_cost / q3Cost) * 100),
    nights,
    nights_a: nightsA,
    nights_a_share_pct: round1((nightsA / nights) * 100),
    highest_per_trip_department: highest.name,
    highest_per_trip: Math.round(highest.value),
    per_diem_old: perDiemOld,
    per_diem_new: perDiemNew,
    per_diem_change: perDiemNew - perDiemOld,
    per_diem_change_pct: round1(((perDiemNew - perDiemOld) / perDiemOld) * 100),
    /* the wrong values planted in the prepared assistant summary, each from a named mistake */
    planted: {
      change_pct_wrong_base: round1(((q3Cost - q2Cost) / q3Cost) * 100),
      cost_per_trip_mean_of_means: Math.round(perTrip.reduce((a, r) => a + r.value, 0) / perTrip.length),
      forecast_cost_transposed: 63100,
      per_diem_all_tier_b: nights * policy.tierB,
      per_diem_all_tier_b_change_pct: round1(((nights * policy.tierB - perDiemOld) / perDiemOld) * 100)
    }
  };
}

export const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
