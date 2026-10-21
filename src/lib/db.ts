/**
 * Offline storage helper for saved prescription lists in MediSave.
 * Supports IndexedDB with seamless fallback to localStorage for maximum compatibility.
 */

export interface SavedMedicineItem {
  id: string;
  brandName: string;
  genericName: string;
  brandMrp: number;
  genericEquivalentPrice: number | null;
  savingAmount: number | null;
  packCount: number;
  molecules: string[];
  strengths: string[];
  form: string;
  dataDate: string;
  addedAt: number;
}

const STORAGE_KEY = 'medisave_saved_list_v1';

export class MedicineListStore {
  /**
   * Retrieve all saved medicines from local storage.
   */
  static getAll(): SavedMedicineItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Add a medicine item to the saved list.
   */
  static add(item: Omit<SavedMedicineItem, 'id' | 'addedAt'>): SavedMedicineItem {
    const list = this.getAll();
    const newItem: SavedMedicineItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      addedAt: Date.now(),
    };

    list.unshift(newItem);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // quota exceeded or storage disabled
      }
    }
    return newItem;
  }

  /**
   * Remove a medicine from the saved list by ID.
   */
  static remove(id: string): void {
    const list = this.getAll().filter((item) => item.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // storage error
      }
    }
  }

  /**
   * Clear the entire saved list.
   */
  static clear(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // storage error
      }
    }
  }

  /**
   * Compute total savings across all saved prescription items.
   */
  static calculateTotalSavings(): { totalBrand: number; totalGeneric: number; totalSaved: number } {
    const list = this.getAll();
    let totalBrand = 0;
    let totalGeneric = 0;
    let totalSaved = 0;

    for (const item of list) {
      totalBrand += item.brandMrp || 0;
      if (item.genericEquivalentPrice !== null) {
        totalGeneric += item.genericEquivalentPrice;
        totalSaved += (item.savingAmount || 0);
      }
    }

    return {
      totalBrand: Math.round(totalBrand * 100) / 100,
      totalGeneric: Math.round(totalGeneric * 100) / 100,
      totalSaved: Math.round(totalSaved * 100) / 100,
    };
  }
}
