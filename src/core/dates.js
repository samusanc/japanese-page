export function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function monthStr() {
  return todayStr().slice(0, 7);
}

export function monthLastDay() {
  const d = new Date();
  return monthStr() + "-" + String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0");
}

export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
