const STORAGE_KEY = "workout-daily-sets-v2";
const WELLNESS_STORAGE_KEY = "workout-wellness-v1";

const DEFAULT_EXERCISES = [
  { name: "座りスクワット", reps: 15 },
  { name: "腿上げ左右", reps: 15 },
  { name: "踵上げ", reps: 50 },
  { name: "ブラジリアンスクワット", reps: 20 },
  { name: "足上げ腹筋", reps: 20 },
  { name: "仰向けお尻上げ", reps: 15 },
  { name: "膝立腕立て", reps: 5 },
];

const dateInput = document.querySelector("#workout-date");
const exerciseList = document.querySelector("#exercise-list");
const customForm = document.querySelector("#custom-form");
const historyList = document.querySelector("#history-list");
const dayCount = document.querySelector("#day-count");
const emptyMessage = document.querySelector("#empty-message");
const calendarMonthLabel = document.querySelector("#calendar-month");
const calendarDays = document.querySelector("#calendar-days");
const streakCount = document.querySelector("#streak-count");
const monthlyLabel = document.querySelector("#monthly-label");
const monthlyRate = document.querySelector("#monthly-rate");
const monthlyDays = document.querySelector("#monthly-days");
const sleepInput = document.querySelector("#sleep-hours");
const conditionInputs = document.querySelectorAll('input[name="condition"]');

let calendarMonth = new Date();
calendarMonth.setDate(1);

function getToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

let recordsByDate = loadRecords();
let wellnessByDate = loadWellness();
dateInput.value = getToday();

function loadWellness() {
  try {
    return JSON.parse(localStorage.getItem(WELLNESS_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recordsByDate));
}

function saveWellness() {
  const date = dateInput.value;
  const condition = document.querySelector('input[name="condition"]:checked');
  const sleepHours = sleepInput.value === "" ? null : Number(sleepInput.value);
  const entry = {
    condition: condition ? Number(condition.value) : null,
    sleepHours,
  };

  if (entry.condition === null && entry.sleepHours === null) {
    delete wellnessByDate[date];
  } else {
    wellnessByDate[date] = entry;
  }

  localStorage.setItem(WELLNESS_STORAGE_KEY, JSON.stringify(wellnessByDate));
  renderHistory();
  renderCalendar();
}

function renderWellness() {
  const wellness = wellnessByDate[dateInput.value] || {};
  conditionInputs.forEach((input) => {
    input.checked = Number(wellness.condition) === Number(input.value);
  });
  sleepInput.value = wellness.sleepHours ?? "";
}

function getExercisesForDate(date) {
  const saved = recordsByDate[date] || [];
  return [
    ...DEFAULT_EXERCISES.map((exercise) => {
      const existing = saved.find((item) => item.name === exercise.name && item.fixed);
      return existing || { ...exercise, sets: 0, fixed: true };
    }),
    ...saved.filter((item) => !item.fixed),
  ];
}

function updateExercise(index, change) {
  const exercises = getExercisesForDate(dateInput.value);
  const exercise = exercises[index];
  exercise.sets = Math.max(0, (exercise.sets || 0) + change);
  recordsByDate[dateInput.value] = exercises;
  saveRecords();
  render();
}

function renderExercises() {
  exerciseList.replaceChildren();
  getExercisesForDate(dateInput.value).forEach((exercise, index) => {
    const row = document.createElement("li");
    row.className = "exercise-row";
    const info = document.createElement("div");
    info.className = "exercise-info";
    const name = document.createElement("p");
    name.className = "exercise-name";
    name.textContent = exercise.name;
    const target = document.createElement("p");
    target.className = "exercise-target";
    target.textContent = `1セット ${exercise.reps}回`;
    info.append(name, target);

    const controls = document.createElement("div");
    controls.className = "set-controls";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "step-button";
    minus.textContent = "−";
    minus.disabled = !exercise.sets;
    minus.setAttribute("aria-label", `${exercise.name}のセット数を減らす`);
    minus.addEventListener("click", () => updateExercise(index, -1));
    const count = document.createElement("span");
    count.className = "set-count";
    count.textContent = `${exercise.sets || 0}セット`;
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "step-button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `${exercise.name}のセット数を増やす`);
    plus.addEventListener("click", () => updateExercise(index, 1));
    controls.append(minus, count, plus);

    if (!exercise.fixed) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.textContent = "削除";
      remove.setAttribute("aria-label", `${exercise.name}をこの日の記録から削除`);
      remove.addEventListener("click", () => removeCustomExercise(exercise.id));
      controls.append(remove);
    }
    row.append(info, controls);
    exerciseList.append(row);
  });
}

function removeCustomExercise(id) {
  recordsByDate[dateInput.value] = getExercisesForDate(dateInput.value).filter((exercise) => exercise.id !== id);
  saveRecords();
  render();
}

function formatDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("ja-JP", { weekday: "short" });
  return `${year}年${month}月${day}日（${weekday}）`;
}

function renderHistory() {
  historyList.replaceChildren();
  const dates = [...new Set([
    ...Object.keys(recordsByDate).filter((date) => (recordsByDate[date] || []).some((exercise) => exercise.sets > 0)),
    ...Object.keys(wellnessByDate).filter((date) => {
      const wellness = wellnessByDate[date];
      return wellness.condition !== null || wellness.sleepHours !== null;
    }),
  ])]
    .sort((a, b) => b.localeCompare(a));

  dates.forEach((date) => {
    const completed = (recordsByDate[date] || []).filter((exercise) => exercise.sets > 0);
    const card = document.createElement("article");
    card.className = "day-card";
    const heading = document.createElement("div");
    heading.className = "day-heading";
    const title = document.createElement("h3");
    title.textContent = formatDate(date);
    const total = document.createElement("span");
    total.className = "day-total";
    total.textContent = completed.length
      ? `${completed.length}種目・${completed.reduce((sum, item) => sum + item.sets, 0)}セット`
      : "体調・睡眠の記録";
    heading.append(title, total);

    const summary = document.createElement("div");
    summary.className = "day-summary";
    completed.forEach((exercise) => {
      const line = document.createElement("p");
      line.textContent = `${exercise.name}：${exercise.sets}セット × ${exercise.reps}回`;
      summary.append(line);
    });
    const wellness = wellnessByDate[date];
    if (wellness && (wellness.condition !== null || wellness.sleepHours !== null)) {
      const wellnessLine = document.createElement("p");
      wellnessLine.className = "wellness-summary";
      const details = [];
      if (wellness.condition !== null) details.push(`体調 ${wellness.condition}/5`);
      if (wellness.sleepHours !== null) details.push(`睡眠 ${wellness.sleepHours}時間`);
      wellnessLine.textContent = details.join("・");
      summary.append(wellnessLine);
    }
    card.append(heading, summary);
    historyList.append(card);
  });

  dayCount.textContent = `${dates.length}日`;
  emptyMessage.hidden = dates.length > 0;
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDayComplete(date) {
  const dayExercises = recordsByDate[date] || [];
  return DEFAULT_EXERCISES.every((standard) =>
    dayExercises.some((exercise) => exercise.fixed && exercise.name === standard.name && exercise.sets > 0)
  );
}

function hasAnyRecord(date) {
  const wellness = wellnessByDate[date];
  const hasWellness = wellness && (wellness.condition !== null || wellness.sleepHours !== null);
  return (recordsByDate[date] || []).some((exercise) => exercise.sets > 0) || Boolean(hasWellness);
}

function renderStats() {
  const today = getToday();
  // 今日がまだ未達成なら、昨日までの連続記録を表示します。
  let streakDate = isDayComplete(today)
    ? new Date(`${today}T12:00:00`)
    : new Date(`${today}T12:00:00`);
  if (!isDayComplete(today)) streakDate.setDate(streakDate.getDate() - 1);

  let streak = 0;
  while (isDayComplete(dateString(streakDate))) {
    streak += 1;
    streakDate.setDate(streakDate.getDate() - 1);
  }
  streakCount.textContent = streak;

  const year = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const currentMonth = today.slice(0, 7);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const elapsedDays = monthKey < currentMonth
    ? daysInMonth
    : monthKey === currentMonth
      ? Number(today.slice(8, 10))
      : 0;
  let achievedDays = 0;
  for (let day = 1; day <= elapsedDays; day += 1) {
    if (isDayComplete(`${monthKey}-${String(day).padStart(2, "0")}`)) achievedDays += 1;
  }

  monthlyLabel.textContent = monthKey === currentMonth ? "今月の達成率" : `${year}年${monthIndex + 1}月の達成率`;
  monthlyRate.textContent = elapsedDays ? Math.round((achievedDays / elapsedDays) * 100) : 0;
  monthlyDays.textContent = `${achievedDays} / ${elapsedDays}日`;
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const selectedDate = dateInput.value;
  calendarMonthLabel.textContent = `${year}年${monthIndex + 1}月`;
  calendarDays.replaceChildren();

  for (let cell = 0; cell < 42; cell += 1) {
    const day = cell - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) {
      const blank = document.createElement("span");
      blank.className = "calendar-day outside";
      blank.setAttribute("aria-hidden", "true");
      calendarDays.append(blank);
      continue;
    }

    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;
    button.setAttribute("aria-label", `${formatDate(date)}${isDayComplete(date) ? "、7種目達成" : hasAnyRecord(date) ? "、記録あり" : "、記録なし"}`);
    button.setAttribute("aria-pressed", String(date === selectedDate));
    if (isDayComplete(date)) button.classList.add("achieved");
    else if (hasAnyRecord(date)) button.classList.add("partial");
    if (date === selectedDate) button.classList.add("selected");
    if (date === getToday()) button.classList.add("today");
    button.addEventListener("click", () => {
      dateInput.value = date;
      render();
      document.querySelector(".daily-card").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    calendarDays.append(button);
  }
}

function render() {
  renderExercises();
  renderWellness();
  renderHistory();
  renderStats();
  renderCalendar();
}

dateInput.addEventListener("change", render);
conditionInputs.forEach((input) => input.addEventListener("change", saveWellness));
sleepInput.addEventListener("input", saveWellness);
document.querySelector("#previous-month").addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
  render();
});
document.querySelector("#next-month").addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  render();
});

customForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(customForm);
  const exercises = getExercisesForDate(dateInput.value);
  exercises.push({
    id: `${Date.now()}-${Math.random()}`,
    name: data.get("name").trim(),
    reps: Number(data.get("reps")),
    sets: 0,
    fixed: false,
  });
  recordsByDate[dateInput.value] = exercises;
  saveRecords();
  customForm.reset();
  render();
  document.querySelector("#custom-name").focus();
});

render();
