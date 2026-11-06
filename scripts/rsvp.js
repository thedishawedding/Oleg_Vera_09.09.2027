// Анкета гостя. Ответы уходят в Google Apps Script,
// а он уже пересылает их в Telegram (токен бота хранится там).

// URL веб-приложения Apps Script (Deploy → Web app → URL, оканчивается на /exec)
const RSVP_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzDLRkr_x66pTBgnCaeho8FTg8HF2Uu-NjjXDitWhEu7iy1dguIQROLbFayErChtgJKcA/exec";

const rsvpForm = document.querySelector(".rsvp__form");
const attendingBlock = rsvpForm.querySelector(".rsvp__attending");
const partnerField = rsvpForm.querySelector(".rsvp__partner");
const rsvpError = rsvpForm.querySelector(".rsvp__error");
const rsvpThanks = rsvpForm.querySelector(".rsvp__thanks");
const rsvpSubmit = rsvpForm.querySelector(".rsvp__submit");

// Скрытый блок выключаем, чтобы его поля не попали в ответ
function toggleBlock(block, visible) {
  block.hidden = !visible;
  block.querySelectorAll("input").forEach((input) => {
    input.disabled = !visible;
  });
}

// Вопросы о спутнике и трансфере нужны, только если гость придёт,
// а поле для имени спутника — только если он будет с +1
function updateVisibility() {
  const attending = rsvpForm.elements.attendance.value === "yes";
  toggleBlock(attendingBlock, attending);
  toggleBlock(
    partnerField,
    attending && rsvpForm.elements.company.value === "plus-one",
  );
}

function collectAnswers() {
  const data = new FormData(rsvpForm);
  return {
    name: data.get("name").trim(),
    attendance: data.get("attendance"),
    company: data.get("company"),
    partner: data.get("partner")?.trim() || null,
    transfer: data.get("transfer"),
    message: data.get("message").trim(),
  };
}

// text/plain — чтобы браузер не делал CORS preflight, который Apps Script не поддерживает
async function submitRsvp(answers) {
  const response = await fetch(RSVP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(answers),
  });
  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || "Не удалось отправить ответ");
  }
}

function showError(text) {
  rsvpError.textContent = text;
  rsvpError.hidden = false;
  rsvpThanks.hidden = true;
}

rsvpForm.addEventListener("change", () => {
  updateVisibility();
  rsvpError.hidden = true;
});

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const answers = collectAnswers();

  if (!answers.name || !answers.attendance) {
    showError("Пожалуйста, укажите ФИО и ответьте, сможете ли прийти.");
    return;
  }

  if (answers.company === "plus-one" && !answers.partner) {
    showError("Пожалуйста, укажите ФИО спутника.");
    return;
  }

  rsvpError.hidden = true;
  rsvpThanks.hidden = true;
  rsvpSubmit.disabled = true;
  rsvpSubmit.textContent = "Отправляем…";

  try {
    await submitRsvp(answers);
    rsvpForm.reset();
    updateVisibility();
    rsvpThanks.hidden = false;
  } catch (error) {
    console.error("Ошибка отправки анкеты:", error);
    showError("Не получилось отправить ответ. Попробуйте ещё раз чуть позже.");
  } finally {
    rsvpSubmit.disabled = false;
    rsvpSubmit.textContent = "Отправить";
  }
});

updateVisibility();
