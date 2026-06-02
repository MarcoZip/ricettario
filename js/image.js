// Legge un file immagine e lo ridimensiona in una data URL JPEG compatta,
// così le foto restano leggere (adatte al salvataggio cloud/locale).
export function fileToDataUrl(file, maxSize = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lettura immagine fallita"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Immagine non valida"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w >= h && w > maxSize) { h = Math.round((h * maxSize) / w); w = maxSize; }
        else if (h > w && h > maxSize) { w = Math.round((w * maxSize) / h); h = maxSize; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL("image/jpeg", quality)); }
        catch (e) { reject(new Error("Conversione immagine fallita")); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
