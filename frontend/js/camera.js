/**
 * MediSave Camera & Prescription OCR Module
 * Handles client-side downscaling (max 1280px JPEG) to save cellular bandwidth
 * and calls Gemma 4 perception endpoint with strict privacy (in-memory only).
 */

class CameraScanner {
  constructor() {
    this.maxDimension = 1280;
    this.jpegQuality = 0.85;
  }

  async downscaleImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > this.maxDimension || height > this.maxDimension) {
            if (width > height) {
              height = Math.round((height * this.maxDimension) / width);
              width = this.maxDimension;
            } else {
              width = Math.round((width * this.maxDimension) / height);
              height = this.maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas blob generation failed'));
              }
            },
            'image/jpeg',
            this.jpegQuality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image for downscaling'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  async scanImage(file) {
    // 1. Client-side downscaling
    const downscaledBlob = await this.downscaleImage(file);

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('file', downscaledBlob, 'prescription_scan.jpg');

    // 3. Check if online and send to Gemma endpoint
    try {
      const response = await fetch('/api/extract-from-image', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Extraction service returned error');
      }
    } catch (err) {
      console.warn('[CameraScanner] Gemma perception error or backend offline:', err);
      // Fallback response for offline mode: open manual confirm step
      return {
        success: false,
        model_used: 'Gemma 4 (Local/Ollama)',
        items: [],
        warning: 'Gemma service is currently offline or unreachable. Please type the medicine name directly into search.'
      };
    }
  }
}

window.cameraScanner = new CameraScanner();
