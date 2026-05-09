/* ===============================
   FILE CONVERTER PRO+ (FIXED)
   100% WORKING + OPTIMIZED
================================= */

let file = null;
let files = [];
let selectedType = "img-pdf";

// ELEMENTS
const tools = document.querySelectorAll(".tool");
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const preview = document.getElementById("preview");
const fileInfo = document.getElementById("fileInfo");
const downloadBtn = document.getElementById("downloadBtn");
const textInput = document.getElementById("textInput");
const themeBtn = document.getElementById("themeBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const fileNameInput = document.getElementById("fileName");

// PDF WORKER
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

// INIT
textInput.style.display = "none";
progressWrap.style.display = "none";
downloadBtn.style.display = "none";

// =============================
// TOOL SWITCH
// =============================
tools.forEach(tool => {
  tool.addEventListener("click", () => {
    tools.forEach(t => t.classList.remove("active"));
    tool.classList.add("active");

    selectedType = tool.dataset.type;

    resetUI();

    if (
      selectedType === "text-pdf" ||
      selectedType === "text-img" ||
      selectedType === "img-text"
    ) {
      textInput.style.display = "block";
    } else {
      textInput.style.display = "none";
    }
  });
});

// =============================
// THEME (SAVE + RESTORE)
// =============================

// page load
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }

  themeBtn.textContent = "Theme";
});

// click par theme change + save
themeBtn.onclick = () => {
  document.body.classList.toggle("light");

  if (document.body.classList.contains("light")) {
    localStorage.setItem("theme", "light");
  } else {
    localStorage.setItem("theme", "dark");
  }

  themeBtn.textContent = "Theme";
};

// =============================
// FILE EVENTS
// =============================
dropzone.onclick = () => fileInput.click();

fileInput.onchange = e => handleFiles(e.target.files);

dropzone.ondragover = e => {
  e.preventDefault();
  dropzone.classList.add("drag");
};

dropzone.ondragleave = () => {
  dropzone.classList.remove("drag");
};

dropzone.ondrop = e => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  handleFiles(e.dataTransfer.files);
};

// =============================
// HANDLE FILES
// =============================
function handleFiles(selectedFiles) {
  files = Array.from(selectedFiles);
  if (!files.length) return;

  file = files[0];
  preview.innerHTML = "";

  fileInfo.innerHTML = `${files.length} file(s) selected`;

  files.forEach(f => {
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();

      reader.onload = e => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.width = "80px";
        img.style.margin = "5px";
        img.style.borderRadius = "10px";
        preview.appendChild(img);
      };

      reader.readAsDataURL(f);
    } else {
      const box = document.createElement("div");
      box.innerHTML = `📄 ${f.name}`;
      box.style.margin = "8px";
      preview.appendChild(box);
    }
  });
}

// =============================
// MAIN CONVERT
// =============================

async function convertFile() {
  try {
    resetProgress();

    switch (selectedType) {
      case "text-pdf":
        return textToPDF();

      case "text-img":
        return textToImage();

      case "pdf-img":
        return pdfToImage();

      case "img-text":
        return imageToText();

      case "bg-remove":
        return removeBackground();

      case "img-pdf":
        if (files.length > 1) return batchImagesToPDF();
        return processImageConversion();

      // =========================
      // ADVANCED IMAGE FEATURES
      // =========================
      case "png-webp":
      case "jpg-webp":
      case "compress-img":
      case "compress-pdf":
        return processAdvancedConversion();

      default:
        if (!file) return alert("Select a file first");
        return processImageConversion();
    }

  } catch (error) {
    console.error(error);
    alert("Conversion failed");
  }
}

// =============================
// IMAGE CONVERSION
// =============================
function processImageConversion() {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      // WHITE BACKGROUND FOR JPG
      if (selectedType === "png-jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      if (selectedType === "jpg-png") {
        downloadCanvas(canvas, "image/png", "png");
      } else if (selectedType === "png-jpg") {
        downloadCanvas(canvas, "image/jpeg", "jpg");
      } else if (selectedType === "img-pdf") {
        imgToPDF(img);
      }
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

// =============================
// IMAGE TO PDF
// =============================
function imgToPDF(img) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (img.height * pageWidth) / img.width;

  pdf.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);

  showDownload(url, "image.pdf");
}

// =============================
// MULTIPLE IMAGE TO PDF
// =============================
async function batchImagesToPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i = 0; i < files.length; i++) {
    updateProgress((i / files.length) * 100);

    const data = await fileToDataURL(files[i]);

    const img = await loadImage(data);

    const w = pdf.internal.pageSize.getWidth();
    const h = (img.height * w) / img.width;

    if (i > 0) pdf.addPage();

    pdf.addImage(img, "JPEG", 0, 0, w, h);
  }

  updateProgress(100);

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);

  showDownload(url, "batch.pdf");
}

// =============================
// PDF TO IMAGE ZIP
// =============================
async function pdfToImage() {
  if (!file) return alert("Select PDF first");

  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const zip = new JSZip();

  for (let i = 1; i <= pdf.numPages; i++) {
    updateProgress((i / pdf.numPages) * 100);

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    const base64 = canvas.toDataURL("image/png").split(",")[1];

    zip.file(`page-${i}.png`, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);

  showDownload(url, "images.zip");
}

// =============================
// OCR IMAGE TO TEXT
// =============================
async function imageToText() {
  if (!file) return alert("Select image first");

  const data = await fileToDataURL(file);

  const result = await Tesseract.recognize(data, "eng", {
    logger: m => {
      if (m.progress) updateProgress(m.progress * 100);
    }
  });

  textInput.style.display = "block";
  textInput.value = result.data.text;

  const blob = new Blob([result.data.text], { type: "text/plain" });

  const url = URL.createObjectURL(blob);

  showDownload(url, "text.txt");
}

// =============================
// REMOVE BACKGROUND
// =============================
async function removeBackground() {
  if (!file) return alert("Select image first");

  if (!window.removeBackgroundFromImage) {
    return alert("Background remover not loaded");
  }

  updateProgress(30);

  const url = URL.createObjectURL(file);

  const blob = await window.removeBackgroundFromImage(url);

  updateProgress(100);

  const imgUrl = URL.createObjectURL(blob);

  preview.innerHTML = `<img src="${imgUrl}" style="max-width:250px;border-radius:12px">`;

  showDownload(imgUrl, "transparent.png");
}

// =============================
// TEXT TO PDF
// =============================
function textToPDF() {
  const text = textInput.value.trim();

  if (!text) return alert("Write text first");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const lines = pdf.splitTextToSize(text, 180);

  let y = 15;

  lines.forEach(line => {
    if (y > 280) {
      pdf.addPage();
      y = 15;
    }

    pdf.text(line, 10, y);
    y += 10;
  });

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);

  showDownload(url, "text.pdf");
}

// =============================
// TEXT TO IMAGE
// =============================
function textToImage() {
  const text = textInput.value.trim();

  if (!text) return alert("Write text first");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 900;
  canvas.height = 1200;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  ctx.font = "28px Arial";

  const words = text.split(" ");
  let line = "";
  let y = 50;

  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    const width = ctx.measureText(test).width;

    if (width > 820 && n > 0) {
      ctx.fillText(line, 40, y);
      line = words[n] + " ";
      y += 40;
    } else {
      line = test;
    }
  }

  ctx.fillText(line, 40, y);

  const url = canvas.toDataURL("image/png");

  showDownload(url, "text-image.png");
}

function processAdvancedConversion() {
  if (!file) return alert("Select a file first");

  const reader = new FileReader();

  reader.onload = async e => {
    const img = new Image();

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      // =========================
      // PNG → WEBP
      // =========================
      if (selectedType === "png-webp") {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          showDownload(url, "image.webp");
        }, "image/webp", 0.85);
      }

      // =========================
      // JPG → WEBP (BEST COMPRESSION)
      // =========================
      if (selectedType === "jpg-webp") {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          showDownload(url, "compressed.webp");
        }, "image/webp", 0.7); // better compression
      }

      // =========================
      // COMPRESS IMAGE (SMART QUALITY)
      // =========================
      if (selectedType === "compress-img") {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          showDownload(url, "compressed.jpg");
        }, "image/jpeg", 0.6); // strong compression
      }

      // =========================
      // COMPRESS PDF (REDUCED SIZE)
      // =========================
      if (selectedType === "compress-pdf") {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (img.height * pageWidth) / img.width;

        // LOW QUALITY IMAGE INSIDE PDF
        pdf.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);

        showDownload(url, "compressed.pdf");
      }
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

// =============================
// HELPERS
// =============================
function downloadCanvas(canvas, type, ext) {
  const url = canvas.toDataURL(type);
  showDownload(url, `converted.${ext}`);
}

function showDownload(url, defaultName) {
  downloadBtn.href = url;
  downloadBtn.download = getFileName(defaultName);
  downloadBtn.style.display = "inline-block";
}

function getFileName(defaultName) {
  const val = fileNameInput.value.trim();
  return val ? val : defaultName;
}

function resetUI() {
  preview.innerHTML = "";
  fileInfo.innerHTML = "";
  downloadBtn.style.display = "none";
  progressWrap.style.display = "none";
  progressBar.style.width = "0%";
  files = [];
  file = null;
}

function resetProgress() {
  progressWrap.style.display = "block";
  progressBar.style.width = "0%";
}

function updateProgress(value) {
  progressWrap.style.display = "block";
  progressBar.style.width = value + "%";
}

function fileToDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}