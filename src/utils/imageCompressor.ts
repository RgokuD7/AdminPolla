/**
 * Utilidad de compresión de imágenes client-side para comprobantes de pago.
 * Reduce fotos de smartphones de 4-10MB a ~120-220KB manteniendo nitidez total en textos y números.
 */
export const compressImage = async (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Si no es imagen, retornar el archivo original
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular proporciones manteniendo relación de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        // En caso de error cargando la imagen en canvas, fallback al archivo original
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
};
