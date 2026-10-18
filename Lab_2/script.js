"use strict";

const form = document.getElementById("feedback-form");
const fileInput = document.getElementById("attachment");
const removeButton = document.getElementById("remove-file");
const success = document.getElementById("success");
const summary = document.getElementById("summary");
const status = document.getElementById("form-status");
const fields = ["name", "email", "subject", "message"].map((id) =>
  document.getElementById(id),
);
const MAX_SIZE = 5 * 1024 * 1024;
const allowedTypes = ["pdf", "txt", "jpg", "jpeg", "png"];
const card = document.querySelector(".card");
const dropZone = document.getElementById("drop-zone");
const preview = document.getElementById("file-preview");
const previewImage = document.getElementById("preview-image");
const submitButton = document.getElementById("submit-button");
const newButton = document.getElementById("new-message");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let previewUrl = null;
let dragDepth = 0;
let submitting = false;

function setError(input, message) {
  document.getElementById(`${input.id}-error`).textContent = message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

function getFieldError(input) {
  const value = input.value.trim();
  let error = "";
  if (!value) error = "Заповніть це поле.";
  else if (input.id === "name" && value.length < 2)
    error = "Ім’я має містити щонайменше 2 символи.";
  else if (input.id === "email" && input.validity.typeMismatch)
    error = "Введіть коректну електронну адресу.";
  else if (input.id === "message" && value.length < 10)
    error = "Повідомлення має містити щонайменше 10 символів.";
  else if (input.maxLength > 0 && value.length > input.maxLength)
    error = `Максимум ${input.maxLength} символів.`;
  return error;
}

function validateField(input) {
  return setError(input, getFieldError(input));
}

function updateProgress() {
  const valid = fields.map((input) => !getFieldError(input));
  const count = valid.filter(Boolean).length;
  document.getElementById("completion").setAttribute("aria-valuenow", count);
  document.getElementById("progress-label").textContent = `${count} з 4 полів`;
  document.getElementById("progress-fill").style.width = `${count * 25}%`;
  document
    .querySelector(".form-progress")
    .classList.toggle("is-complete", count === 4);
  fields.forEach((input, i) =>
    input.closest(".field").classList.toggle("is-valid", valid[i]),
  );
  const steps = document.querySelectorAll(".steps li");
  steps[0].classList.toggle("is-complete", valid[0] && valid[1]);
  steps[1].classList.toggle("is-complete", valid[2] && valid[3]);
  steps[2].classList.toggle(
    "is-complete",
    Boolean(fileInput.files[0]) &&
      fileInput.getAttribute("aria-invalid") !== "true",
  );
}

function validateFile() {
  const file = fileInput.files[0];
  let error = "";
  if (file) {
    const extension = file.name.split(".").pop().toLowerCase();
    if (!allowedTypes.includes(extension))
      error = "Оберіть PDF, TXT, JPG або PNG.";
    else if (file.size === 0) error = "Вибраний файл порожній.";
    else if (file.size > MAX_SIZE) error = "Розмір файлу перевищує 5 МіБ.";
  }
  return setError(fileInput, error);
}

function updateFileInfo() {
  const file = fileInput.files[0];
  document.getElementById("file-info").textContent = file
    ? `${file.name} · ${file.size.toLocaleString("uk-UA")} байтів`
    : "Файл ще не вибрано";
  removeButton.hidden = !file;
  const valid = validateFile();
  dropZone.classList.toggle("has-file", Boolean(file) && valid);
  clearPreview();
  if (file && valid && /\.(png|jpe?g)$/i.test(file.name)) {
    previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    preview.hidden = false;
  }
  updateProgress();
}

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  previewImage.removeAttribute("src");
  preview.hidden = true;
}
previewImage.addEventListener("error", clearPreview);
window.addEventListener("pagehide", clearPreview);

function resetDrag() {
  dragDepth = 0;
  dropZone.classList.remove("is-dragging");
}
const hasFiles = (event) =>
  Array.from(event.dataTransfer?.types || []).includes("Files");
dropZone.addEventListener("dragenter", (event) => {
  if (!hasFiles(event) || submitting) return;
  event.preventDefault();
  dragDepth++;
  dropZone.classList.add("is-dragging");
});
dropZone.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) resetDrag();
});
dropZone.addEventListener("dragover", (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = submitting ? "none" : "copy";
});
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  resetDrag();
  if (submitting) return;
  if (event.dataTransfer.files.length !== 1) {
    status.textContent = "Перетягніть лише один файл за раз.";
    return;
  }
  fileInput.files = event.dataTransfer.files;
  status.textContent = "";
  updateFileInfo();
});
// Запобігаємо відкриттю файлу браузером при випадковому скиданні повз зону.
document.addEventListener("dragover", (event) => {
  if (hasFiles(event)) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  if (hasFiles(event)) event.preventDefault();
  resetDrag();
});
document.addEventListener("dragend", resetDrag);

function updateCounter() {
  document.getElementById("counter").textContent =
    `${form.elements.message.value.length} / 2000`;
}

function clearFeedback() {
  [...fields, fileInput].forEach((input) => setError(input, ""));
  status.textContent = "";
  updateCounter();
  updateFileInfo();
  resetDrag();
}

fields.forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
  input.addEventListener("input", () => {
    status.textContent = "";
    if (input.getAttribute("aria-invalid") === "true") validateField(input);
    updateProgress();
  });
  input.addEventListener("change", updateProgress);
});
form.elements.message.addEventListener("input", updateCounter);
fileInput.addEventListener("change", () => {
  status.textContent = "";
  updateFileInfo();
});
removeButton.addEventListener("click", () => {
  fileInput.value = "";
  status.textContent = "";
  updateFileInfo();
  fileInput.focus();
});
form.addEventListener("reset", () => {
  // Подія reset виникає перед фактичним очищенням полів.
  setTimeout(clearFeedback, 0);
});

function setBusy(busy) {
  form.setAttribute("aria-busy", String(busy));
  form
    .querySelectorAll("input, select, textarea, button")
    .forEach((control) => {
      control.disabled = busy;
    });
  newButton.disabled = busy;
  submitButton.querySelector(".button-label").textContent = busy
    ? "Формуємо звернення…"
    : "Надіслати повідомлення";
  submitButton.querySelector(".spinner").hidden = !busy;
  submitButton.querySelector(".button-arrow").hidden = busy;
}

async function swapPanels(from, to) {
  const oldHeight = card.getBoundingClientRect().height;
  if (!reducedMotion.matches) {
    await from
      .animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-8px)" },
        ],
        { duration: 240, easing: "ease-in" },
      )
      .finished.catch(() => {});
  }
  from.hidden = true;
  to.hidden = false;
  if (!reducedMotion.matches) {
    const newHeight = card.getBoundingClientRect().height;
    const resize = card.animate(
      [{ height: `${oldHeight}px` }, { height: `${newHeight}px` }],
      { duration: 320, easing: "ease-in-out" },
    );
    to.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
    await resize.finished.catch(() => {});
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting) return;
  const validFields = fields.map(validateField).every(Boolean);
  const validFile = validateFile();
  updateProgress();
  if (!validFields || !validFile) {
    status.textContent = "Перевірте позначені поля та повторіть спробу.";
    const invalid = form.querySelector('[aria-invalid="true"]');
    invalid.focus();
    if (!reducedMotion.matches)
      invalid
        .closest(".field")
        .animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 220 },
        );
    return;
  }

  // FormData містить справжній File, а не лише його назву.
  const data = new FormData(form);
  fields.forEach((input) => data.set(input.name, input.value.trim()));
  const file = fileInput.files[0];
  if (!file) data.delete("attachment");
  const details = [
    ["Ім’я", data.get("name")],
    ["Електронна пошта", data.get("email")],
    ["Тема", data.get("subject")],
    ["Повідомлення", data.get("message")],
    ["Вкладення", file ? `${file.name} (${file.size} байтів)` : "Без файлу"],
  ];
  summary.replaceChildren();
  details.forEach(([label, value]) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    summary.append(term, description);
  });
  submitting = true;
  setBusy(true);
  card.classList.add("show-success");
  await swapPanels(form, success);
  setBusy(false);
  submitting = false;
  document.getElementById("success-title").focus();
});

newButton.addEventListener("click", async () => {
  if (submitting) return;
  submitting = true;
  setBusy(true);
  form.reset();
  await swapPanels(success, form);
  summary.replaceChildren();
  card.classList.remove("show-success");
  setBusy(false);
  submitting = false;
  fields[0].focus();
});
submitButton.disabled = false;
updateProgress();
