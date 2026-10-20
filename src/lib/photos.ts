const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT = 20 * 1024 * 1024;

export function validatePhoto(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Choisis une photo JPEG, PNG ou WebP. Pour une photo HEIC, exporte-la en JPEG.');
  if (file.size > MAX_INPUT) throw new Error('Cette photo dépasse 20 Mo. Choisis une image plus légère.');
  if (file.size === 0) throw new Error('Cette photo est vide.');
}

export async function preparePhoto(file: File): Promise<File> {
  validatePhoto(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Impossible de lire cette photo. Essaie une autre image JPEG ou PNG.');
  }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Le traitement des photos n’est pas disponible dans ce navigateur.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('La préparation de la photo a échoué.')), 'image/jpeg', 0.85),
    );
    if (blob.size > 5 * 1024 * 1024) throw new Error('L’image préparée dépasse 5 Mo. Choisis une photo plus petite.');
    return new File([blob], 'plante.jpg', { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
