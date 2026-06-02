// Riconoscimento testo da foto (OCR) tramite Tesseract.js, gratuito e tutto sul
// dispositivo. La libreria viene scaricata solo al primo utilizzo (serve rete).

const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
let loadingPromise = null;

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN;
    s.onload = () => resolve();
    s.onerror = () => { loadingPromise = null; reject(new Error("Impossibile caricare il riconoscimento testo (serve internet).")); };
    document.head.appendChild(s);
  });
  return loadingPromise;
}

// Restituisce il testo riconosciuto dall'immagine (italiano).
export async function ocrImage(file, onProgress) {
  await loadTesseract();
  const { data } = await window.Tesseract.recognize(file, "ita", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    }
  });
  return (data && data.text ? data.text : "").trim();
}
