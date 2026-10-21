/**
 * MediSave Barcode Scanner Module
 * Reads GS1 / EAN-13 barcodes off medicine strips and packaging.
 * Uses native Web BarcodeDetector API with graceful fallback.
 */

class BarcodeScanner {
  constructor() {
    this.hasNativeSupport = 'BarcodeDetector' in window;
    if (this.hasNativeSupport) {
      this.detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
      });
    }
    // Indian GS1 pharmaceutical barcode mock registry for instant demo
    this.barcodeMap = {
      "8901117001015": "B001", // Dolo 650
      "8901036002021": "B006", // Augmentin 625 Duo
      "8901234003033": "B009", // Pan 40
      "8901456004044": "B014", // Atorva 10
      "8901789005055": "B019", // Glycomet 500
      "8902001006066": "B025", // Telma 40
      "8902123007077": "B033", // Azee 500
      "8902456008088": "B037", // Montair-LC
      "8902789009099": "B045", // Omez 20
      "8903001010100": "B077"  // Asthalin Inhaler
    };
  }

  async scanFromImage(imageElement) {
    if (this.hasNativeSupport && this.detector) {
      try {
        const barcodes = await this.detector.detect(imageElement);
        if (barcodes && barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          return {
            success: true,
            code: rawValue,
            medicine_id: this.barcodeMap[rawValue] || null
          };
        }
      } catch (e) {
        console.warn('[BarcodeScanner] Native detection error:', e);
      }
    }
    return { success: false, code: null };
  }

  lookupBarcode(code) {
    const trimmed = (code || '').trim();
    const medId = this.barcodeMap[trimmed];
    return medId || null;
  }
}

window.barcodeScanner = new BarcodeScanner();
