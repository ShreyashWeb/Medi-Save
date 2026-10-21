/**
 * MediSave Main Application Logic
 * Integrates search, camera/OCR perception, barcode lookup,
 * prescription basket, Kendra store locator, and offline fallbacks.
 */

document.addEventListener('DOMContentLoaded', async () => {
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 1. Initialize PWA Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker registered successfully.');
    } catch (e) {
      console.log('[PWA] Service Worker registration failed:', e);
    }
  }

  // 2. Initialize Offline Matcher
  await window.offlineMatcher.loadData();

  // 3. Setup Network Status Watcher
  const statusDot = document.getElementById('network-status-dot');
  const statusText = document.getElementById('network-status-text');

  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusDot.classList.remove('offline');
      statusText.textContent = 'Live Connected';
    } else {
      statusDot.classList.add('offline');
      statusText.textContent = 'Offline Mode (Local DB)';
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // 4. Prescription Basket State
  let prescriptionBasket = [];

  function updateBasketBadge() {
    const badge = document.getElementById('basket-count-badge');
    if (badge) {
      badge.textContent = prescriptionBasket.length;
    }
  }

  // 5. Search Elements
  const searchInput = document.getElementById('main-search-input');
  const searchDropdown = document.getElementById('autocomplete-dropdown');
  const searchBtn = document.getElementById('btn-main-search');
  const resultsArea = document.getElementById('results-area');

  let debounceTimer = null;

  async function executeSearch(query) {
    if (!query || query.trim().length === 0) {
      searchDropdown.classList.remove('active');
      return;
    }

    let searchResult = null;

    // Try backend API first if online, fallback to offlineMatcher
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          searchResult = await res.json();
        }
      } catch (e) {
        console.warn('API error, falling back to client-side matcher:', e);
      }
    }

    if (!searchResult || !searchResult.matches) {
      searchResult = window.offlineMatcher.search(query, 8);
    }

    renderAutocomplete(searchResult);
  }

  function renderAutocomplete(data) {
    searchDropdown.innerHTML = '';
    if (!data.matches || data.matches.length === 0) {
      searchDropdown.innerHTML = `
        <div style="padding: 1.25rem; text-align: center; color: #64748b; font-size: 0.9rem;">
          No matching medicine found. Please check spelling or confirm with your pharmacist.
        </div>
      `;
      searchDropdown.classList.add('active');
      return;
    }

    data.matches.forEach(item => {
      const med = item.medicine;
      const el = document.createElement('div');
      el.className = 'autocomplete-item';

      const savingPct = med.saving_percentage ? `Save ${med.saving_percentage}%` : 'Generic Available';
      const genPrice = med.generic_match ? `₹${med.generic_match.ja_unit_price_inr}/unit` : 'See details';

      el.innerHTML = `
        <div class="autocomplete-item-left">
          <span class="ac-brand-name">${med.brand_name}</span>
          <span class="ac-molecule">${med.molecule} • ${med.strength}</span>
        </div>
        <div class="autocomplete-item-right">
          <span class="ac-saving-badge">${savingPct}</span>
          <span class="ac-price-tag">${genPrice}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        searchDropdown.classList.remove('active');
        searchInput.value = med.brand_name;
        renderResultCard(med);
      });

      searchDropdown.appendChild(el);
    });

    searchDropdown.classList.add('active');
  }

  // Search input typing
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchDropdown.classList.remove('active');
      return;
    }
    debounceTimer = setTimeout(() => executeSearch(q), 220);
  });

  // Search button click
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q) {
      const res = window.offlineMatcher.search(q, 1);
      if (res.matches && res.matches.length > 0) {
        renderResultCard(res.matches[0].medicine);
        searchDropdown.classList.remove('active');
      }
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.classList.remove('active');
    }
  });

  // Quick suggestion chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      searchInput.value = query;
      const res = window.offlineMatcher.search(query, 1);
      if (res.matches && res.matches.length > 0) {
        renderResultCard(res.matches[0].medicine);
      }
    });
  });

  // 6. Render Medicine Result Card
  function renderResultCard(med) {
    resultsArea.innerHTML = '';
    const gen = med.generic_match;

    const brandUnitPrice = med.brand_unit_price_inr;
    const genUnitPrice = gen ? gen.ja_unit_price_inr : brandUnitPrice;
    const savingPct = med.saving_percentage || (brandUnitPrice > genUnitPrice ? Math.round(((brandUnitPrice - genUnitPrice) / brandUnitPrice) * 100) : 0);
    const savingRupees = Math.max(0, (brandUnitPrice - genUnitPrice).toFixed(2));

    const card = document.createElement('div');
    card.className = 'result-card-comparison';

    card.innerHTML = `
      <div class="card-header-saving">
        <div>
          <span style="font-size: 0.85rem; opacity: 0.9; display: block; text-transform: uppercase; letter-spacing: 0.05em;">Indicative Price Comparison</span>
          <div class="hero-saving-text">₹${med.brand_mrp_inr} (Brand) → ₹${gen ? gen.ja_price_inr : 'N/A'} (Generic)</div>
        </div>
        <div class="saving-pill-tag">Save ${savingPct}% (₹${savingRupees} per unit)</div>
      </div>

      <div class="comparison-split-body">
        <!-- Brand Side -->
        <div class="side-brand">
          <div class="col-badge-label">Prescribed Branded Medicine</div>
          <h3 class="item-main-title">${med.brand_name}</h3>
          <div class="item-sub-meta">${med.manufacturer}</div>
          <div class="price-display-box">
            <span class="price-main">₹${med.brand_mrp_inr}</span>
            <span class="price-per-unit">for ${med.pack_size} (₹${brandUnitPrice} / unit)</span>
          </div>
          <div class="meta-details-list">
            <div><strong>Active Molecule:</strong> ${med.molecule}</div>
            <div><strong>Strength:</strong> ${med.strength}</div>
            <div><strong>Dosage Form:</strong> ${med.form}</div>
            ${med.nppa_ceiling_price_inr ? `<div><strong>NPPA Ceiling:</strong> ₹${med.nppa_ceiling_price_inr}/unit</div>` : ''}
          </div>
          <div class="provenance-tag">Source: ${med.source} (${med.source_date})</div>
        </div>

        <!-- Generic Side -->
        <div class="side-generic">
          <div class="col-badge-label">Equivalent Jan Aushadhi Generic</div>
          <h3 class="item-main-title">${med.molecule}</h3>
          <div class="item-sub-meta">PMBJP (Govt. of India Scheme)</div>
          <div class="price-display-box">
            <span class="price-main">₹${gen ? gen.ja_price_inr : 'Not Listed'}</span>
            <span class="price-per-unit">for ${gen ? gen.pack_size : med.pack_size} (₹${genUnitPrice} / unit)</span>
          </div>
          <div class="meta-details-list">
            <div><strong>Jan Aushadhi Code:</strong> ${gen ? gen.jan_aushadhi_code : 'N/A'}</div>
            <div><strong>Bio-equivalent Molecule:</strong> Same API chemical entity</div>
            <div><strong>Quality Standard:</strong> WHO-GMP certified manufacturing</div>
          </div>
          <div class="provenance-tag">Source: ${gen ? gen.source : 'N/A'} (${gen ? gen.source_date : ''})</div>
        </div>
      </div>

      <div class="card-footer-actions">
        <div class="safety-disclaimer-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>Price and molecule information only, not medical advice. Confirm any change with your doctor or pharmacist.</span>
        </div>
        <button id="btn-add-card" class="btn-add-prescription">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>
          Add to Prescription Slip
        </button>
      </div>
    `;

    resultsArea.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Handle Add to Prescription Slip
    document.getElementById('btn-add-card').addEventListener('click', () => {
      addToPrescriptionBasket(med);
    });
  }

  // 7. Prescription Basket Functions
  function addToPrescriptionBasket(med) {
    const existing = prescriptionBasket.find(item => item.medicine.id === med.id);
    if (existing) {
      existing.quantity_units += 10;
    } else {
      prescriptionBasket.push({
        medicine: med,
        quantity_units: 10
      });
    }
    updateBasketBadge();
    showToast(`Added ${med.brand_name} to Prescription Slip!`);
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #ffffff;
      padding: 12px 20px; border-radius: 9999px; font-size: 0.9rem; font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 3000; animation: fadeIn 0.2s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // 8. Whole Prescription Basket Modal
  const modalPrescription = document.getElementById('modal-prescription');
  const openBasketBtn = document.getElementById('btn-open-basket');
  const closeBasketBtn = document.getElementById('btn-close-basket');
  const basketItemsTableBody = document.getElementById('basket-items-tbody');
  const printSlipBtn = document.getElementById('btn-print-slip');

  openBasketBtn.addEventListener('click', () => {
    renderPrescriptionBasketModal();
    modalPrescription.classList.add('active');
  });

  closeBasketBtn.addEventListener('click', () => {
    modalPrescription.classList.remove('active');
  });

  printSlipBtn.addEventListener('click', () => {
    window.print();
  });

  function renderPrescriptionBasketModal() {
    basketItemsTableBody.innerHTML = '';
    if (prescriptionBasket.length === 0) {
      basketItemsTableBody.innerHTML = `
        <tr><td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
          Your prescription slip is empty. Search for medicines and click "Add to Prescription Slip".
        </td></tr>
      `;
      document.getElementById('basket-total-brand').textContent = '₹0.00';
      document.getElementById('basket-total-generic').textContent = '₹0.00';
      document.getElementById('basket-total-saving').textContent = '₹0.00';
      document.getElementById('basket-total-pct').textContent = '0%';
      return;
    }

    const itemsForCompare = prescriptionBasket.map(it => ({
      medicine_id: it.medicine.id,
      quantity_units: it.quantity_units
    }));

    const comp = window.offlineMatcher.compare(itemsForCompare);

    comp.items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.brand_name}</strong><br><small style="color: #64748b;">${item.molecule} (${item.strength})</small></td>
        <td>${item.quantity_units}</td>
        <td>₹${item.brand_total_cost}</td>
        <td style="color: #047857; font-weight: 700;">₹${item.generic_total_cost} (${item.jan_aushadhi_code})</td>
        <td style="color: #065f46; font-weight: 700;">₹${item.total_saving_inr} (${item.saving_percentage}%)</td>
      `;
      basketItemsTableBody.appendChild(tr);
    });

    document.getElementById('basket-total-brand').textContent = `₹${comp.total_brand_cost}`;
    document.getElementById('basket-total-generic').textContent = `₹${comp.total_generic_cost}`;
    document.getElementById('basket-total-saving').textContent = `₹${comp.total_saving_inr}`;
    document.getElementById('basket-total-pct').textContent = `${comp.overall_saving_percentage}%`;
  }

  // 9. Camera Scan & Confirmation
  const cameraInput = document.getElementById('camera-file-input');
  const triggerCameraBtn = document.getElementById('btn-camera-scan');
  const modalConfirm = document.getElementById('modal-confirm-ocr');
  const closeConfirmBtn = document.getElementById('btn-close-confirm');
  const confirmForm = document.getElementById('form-confirm-ocr');

  triggerCameraBtn.addEventListener('click', () => {
    cameraInput.click();
  });

  cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('Reading medicine text with Gemma 4...');

    const res = await window.cameraScanner.scanImage(file);

    // Populate confirm modal
    if (res.items && res.items.length > 0) {
      const topItem = res.items[0];
      document.getElementById('confirm-brand-input').value = topItem.brand || topItem.raw_text || '';
      document.getElementById('confirm-molecule-input').value = topItem.molecule || '';
      document.getElementById('confirm-strength-input').value = topItem.strength || '';
      document.getElementById('confirm-confidence-val').textContent = `${Math.round(topItem.confidence * 100)}%`;
      document.getElementById('confirm-confidence-bar').style.width = `${Math.round(topItem.confidence * 100)}%`;
    } else {
      document.getElementById('confirm-brand-input').value = '';
      document.getElementById('confirm-molecule-input').value = '';
      document.getElementById('confirm-strength-input').value = '';
      document.getElementById('confirm-confidence-val').textContent = 'Manual Entry';
      document.getElementById('confirm-confidence-bar').style.width = '30%';
    }

    modalConfirm.classList.add('active');
  });

  closeConfirmBtn.addEventListener('click', () => {
    modalConfirm.classList.remove('active');
  });

  confirmForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const brand = document.getElementById('confirm-brand-input').value.trim();
    const molecule = document.getElementById('confirm-molecule-input').value.trim();
    const strength = document.getElementById('confirm-strength-input').value.trim();

    modalConfirm.classList.remove('active');

    const searchStr = `${brand} ${molecule} ${strength}`.trim();
    searchInput.value = searchStr;
    const res = window.offlineMatcher.search(searchStr, 1);
    if (res.matches && res.matches.length > 0) {
      renderResultCard(res.matches[0].medicine);
    } else {
      showToast('No exact medicine matched in dataset. Please refine text.');
    }
  });

  // 10. Barcode Scanner Button
  const barcodeBtn = document.getElementById('btn-barcode-scan');
  barcodeBtn.addEventListener('click', () => {
    const code = prompt('Enter or Scan Medicine Barcode (e.g. 8901117001015 for Dolo 650):', '8901117001015');
    if (code) {
      const medId = window.barcodeScanner.lookupBarcode(code);
      if (medId) {
        const med = window.offlineMatcher.medicines.find(m => m.id === medId);
        if (med) {
          renderResultCard(med);
          showToast(`Barcode matched: ${med.brand_name}`);
          return;
        }
      }
      showToast(`Barcode ${code} not in registry. Try typing name.`);
    }
  });

  // 11. Nearest Kendra Locator
  const gpsBtn = document.getElementById('btn-gps-locate');
  const citySelect = document.getElementById('kendra-city-select');
  const kendrasGrid = document.getElementById('kendras-grid');

  function renderKendras(kendrasList) {
    kendrasGrid.innerHTML = '';
    kendrasList.forEach(k => {
      const el = document.createElement('div');
      el.className = 'kendra-card';
      const distTag = k.distance_km !== undefined ? `📍 ${k.distance_km} km away` : k.city;
      el.innerHTML = `
        <div class="kendra-card-name">${k.name}</div>
        <div class="kendra-card-address">${k.address}, ${k.city} - ${k.pincode}</div>
        <div class="kendra-card-meta">
          <span>${distTag}</span>
          <span>📞 ${k.phone}</span>
        </div>
      `;
      kendrasGrid.appendChild(el);
    });
  }

  gpsBtn.addEventListener('click', () => {
    if ('geolocation' in navigator) {
      showToast('Acquiring GPS location...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const nearby = window.offlineMatcher.findNearbyKendras(lat, lng, 6);
          renderKendras(nearby);
          showToast('Found nearest Jan Aushadhi Kendras!');
        },
        (err) => {
          showToast('GPS unavailable. Select your city instead.');
        }
      );
    }
  });

  citySelect.addEventListener('change', (e) => {
    const city = e.target.value;
    if (city === 'all') {
      renderKendras(window.offlineMatcher.kendras.slice(0, 8));
    } else {
      const filtered = window.offlineMatcher.kendras.filter(k => k.city.toLowerCase() === city.toLowerCase());
      renderKendras(filtered);
    }
  });

  // Initial render of Kendras
  renderKendras(window.offlineMatcher.kendras.slice(0, 6));

  // 12. Popular Savings Cards Click Handlers
  document.querySelectorAll('.savings-card').forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      if (query) {
        searchInput.value = query;
        const res = window.offlineMatcher.search(query, 1);
        if (res.matches && res.matches.length > 0) {
          renderResultCard(res.matches[0].medicine);
        }
      }
    });
  });

  // 13. FAQ Accordion Toggle
  document.querySelectorAll('.faq-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer-content');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-accordion-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-answer-content').classList.remove('active');
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.classList.add('active');
      }
    });
  });

  // 14. Gemma 4 Explainer Modal
  const gemmaBadge = document.getElementById('gemma-explainer-badge');
  const modalGemma = document.getElementById('modal-gemma-explainer');
  const closeGemmaBtn = document.getElementById('btn-close-gemma');

  if (gemmaBadge && modalGemma) {
    gemmaBadge.addEventListener('click', () => {
      modalGemma.classList.add('active');
    });
  }

  if (closeGemmaBtn && modalGemma) {
    closeGemmaBtn.addEventListener('click', () => {
      modalGemma.classList.remove('active');
    });
  }
});
