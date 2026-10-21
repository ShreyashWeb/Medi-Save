/**
 * MediSave Offline Matcher Engine
 * Fully independent client-side fuzzy search, comparison, and Haversine geo-engine.
 * Guarantees 100% functionality at pharmacy counter with zero network connectivity.
 */

class OfflineMatcher {
  constructor() {
    this.medicines = [];
    this.kendras = [];
    this.isLoaded = false;
  }

  async loadData() {
    if (this.isLoaded) return;
    try {
      const [medsRes, kendrasRes] = await Promise.all([
        fetch('/data/medicines.json'),
        fetch('/data/kendras.json')
      ]);
      if (medsRes.ok) this.medicines = await medsRes.json();
      if (kendrasRes.ok) this.kendras = await kendrasRes.json();
      this.isLoaded = true;
      console.log(`[OfflineMatcher] Loaded ${this.medicines.length} medicines and ${this.kendras.length} kendras offline.`);
    } catch (e) {
      console.warn('[OfflineMatcher] Could not load local JSON files:', e);
    }
  }

  cleanQuery(q) {
    if (!q) return '';
    return q.toLowerCase()
      .replace(/\b(tab|capsule|cap|tablet|syrup|syr|syp|inj|inhaler|gel|ointment)\.?\b/gi, '')
      .replace(/\b(1-0-1|1-1-1|0-1-0|0-0-1|1-0-0|od|bd|bid|tds|tid|qid|hs|sos|bbf|ac|pc)\.?\b/gi, '')
      .replace(/[#*@!&^%$~,.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Levenshtein similarity score between 0 and 1
  similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const a = s1.toLowerCase();
    const b = s2.toLowerCase();
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.85;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    const distance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return 1 - (distance / maxLen);
  }

  search(rawQuery, limit = 10) {
    const q = this.cleanQuery(rawQuery);
    if (!q) return { query: rawQuery, total_matches: 0, matches: [], did_you_mean: null };

    const queryTokens = q.split(' ').filter(Boolean);
    const queryNumbers = q.match(/\d+/g) || [];

    const scored = [];

    for (const med of this.medicines) {
      const brand = med.brand_name.toLowerCase();
      const molecule = med.molecule.toLowerCase();
      const searchable = `${brand} ${molecule} ${med.strength} ${med.form}`.toLowerCase();

      let score = 0;

      // Exact phrase match
      if (brand === q) {
        score = 100;
      } else if (brand.includes(q)) {
        score = 92;
      } else if (molecule.includes(q)) {
        score = 88;
      } else {
        // Token and fuzzy matching
        const brandSim = this.similarity(q, brand);
        const molSim = this.similarity(q, molecule);
        const maxSim = Math.max(brandSim, molSim);

        let tokenMatches = 0;
        for (const token of queryTokens) {
          if (searchable.includes(token)) {
            tokenMatches++;
          }
        }
        const tokenRatio = tokenMatches / queryTokens.length;
        score = (maxSim * 60) + (tokenRatio * 40);
      }

      // Bonus if strength matches (e.g. 650, 500, 40)
      const medNumbers = med.strength.match(/\d+/g) || [];
      if (queryNumbers.length > 0 && medNumbers.length > 0) {
        if (queryNumbers.some(num => medNumbers.includes(num))) {
          score += 8;
        }
      }

      score = Math.min(100, Math.round(score));

      if (score >= 40) {
        scored.push({
          score,
          medicine: med,
          match_type: brand.includes(q) || this.similarity(q, brand) > 0.6 ? 'brand' : 'molecule'
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    let didYouMean = null;
    if (top.length > 0 && top[0].score < 80) {
      didYouMean = top[0].medicine.brand_name;
    }

    return {
      query: rawQuery,
      total_matches: top.length,
      matches: top,
      did_you_mean: didYouMean,
      disclaimer: "Price and molecule information only, not medical advice. Confirm any change with your doctor or pharmacist."
    };
  }

  compare(items) {
    let totalBrand = 0;
    let totalGeneric = 0;
    const itemResults = [];

    for (const item of items) {
      const med = this.medicines.find(m => m.id === item.medicine_id);
      if (!med) continue;

      const qty = Math.max(1, item.quantity_units || 10);
      const brandUnit = med.brand_unit_price_inr;
      const genericUnit = med.generic_match ? med.generic_match.ja_unit_price_inr : brandUnit;

      const itemBrandCost = Number((brandUnit * qty).toFixed(2));
      const itemGenCost = Number((genericUnit * qty).toFixed(2));
      const itemSaving = Math.max(0, Number((itemBrandCost - itemGenCost).toFixed(2)));
      const itemSavingPct = brandUnit > genericUnit ? Math.round(((brandUnit - genericUnit) / brandUnit) * 100) : 0;

      totalBrand += itemBrandCost;
      totalGeneric += itemGenCost;

      itemResults.push({
        brand_name: med.brand_name,
        molecule: med.molecule,
        strength: med.strength,
        form: med.form,
        quantity_units: qty,
        brand_unit_price: brandUnit,
        generic_unit_price: genericUnit,
        brand_total_cost: itemBrandCost,
        generic_total_cost: itemGenCost,
        total_saving_inr: itemSaving,
        saving_percentage: itemSavingPct,
        jan_aushadhi_code: med.generic_match ? med.generic_match.jan_aushadhi_code : 'N/A',
        source: med.generic_match ? med.generic_match.source : med.source
      });
    }

    const totalSaving = Math.max(0, Number((totalBrand - totalGeneric).toFixed(2)));
    const overallPct = totalBrand > 0 ? Math.round((totalSaving / totalBrand) * 100) : 0;

    return {
      items: itemResults,
      total_brand_cost: Number(totalBrand.toFixed(2)),
      total_generic_cost: Number(totalGeneric.toFixed(2)),
      total_saving_inr: totalSaving,
      overall_saving_percentage: overallPct,
      disclaimer: "Price and molecule information only, not medical advice. Confirm any change with your doctor or pharmacist."
    };
  }

  findNearbyKendras(lat, lng, limit = 8) {
    if (!this.kendras || this.kendras.length === 0) return [];
    if (!lat || !lng) return this.kendras.slice(0, limit);

    const R = 6371.0;
    const toRad = deg => deg * (Math.PI / 180);

    const withDist = this.kendras.map(k => {
      const dlat = toRad(k.lat - lat);
      const dlon = toRad(k.lng - lng);
      const a = Math.sin(dlat / 2) ** 2 +
                Math.cos(toRad(lat)) * Math.cos(toRad(k.lat)) *
                Math.sin(dlon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Number((R * c).toFixed(1));
      return { ...k, distance_km: dist };
    });

    withDist.sort((a, b) => a.distance_km - b.distance_km);
    return withDist.slice(0, limit);
  }
}

window.offlineMatcher = new OfflineMatcher();
