/**
 * Compresse et redimensionne une image sélectionnée par l'utilisateur en DataURL léger,
 * afin d'éviter les dépassements de quota localStorage et la limite 1 Mo de Firestore.
 */
export async function compressImageToDataUrl(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    preserveTransparency?: boolean;
  } = {}
): Promise<string> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.82,
    preserveTransparency = false
  } = options;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Impossible de lire le fichier image.'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier image.'));
    reader.readAsDataURL(file);
  });

  // Si l'image est déjà légère (< 80 Ko), la retourner directement sans perte
  if (rawDataUrl.length < 80 * 1024) {
    return rawDataUrl;
  }

  const isPng = preserveTransparency && (file.type === 'image/png' || rawDataUrl.startsWith('data:image/png'));

  // Sinon, redimensionner et compresser via canvas
  return await new Promise<string>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(rawDataUrl);
          return;
        }

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        const targetW = Math.max(1, Math.round(width * ratio));
        const targetH = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const compressed = isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality);
        resolve(compressed && compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
