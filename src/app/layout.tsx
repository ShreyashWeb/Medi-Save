import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediSave • Same Medicine. A Fraction of the Price.",
  description:
    "Find verified Jan Aushadhi generic equivalents, compare regulated prices, and scan prescriptions with Gemma 4 OCR.",
  openGraph: {
    title: "MediSave • Same Medicine. A Fraction of the Price.",
    description:
      "Find verified Jan Aushadhi generic equivalents, compare regulated prices, and scan prescriptions with Gemma 4 OCR.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediSave • Same Medicine. A Fraction of the Price.",
    description:
      "Find verified Jan Aushadhi generic equivalents, compare regulated prices, and scan prescriptions with Gemma 4 OCR.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html data-wf-domain="budgetrx.webflow.io" data-wf-page="6375a1fe1054d4bfd80053e6" data-wf-site="6375a1fe1054d4cf080053e5" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link href="https://assets-global.website-files.com" rel="preconnect" crossOrigin="anonymous" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link
          href="https://assets-global.website-files.com/6375a1fe1054d4cf080053e5/css/budgetrx.be30c3d13.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          href="https://cdn.prod.website-files.com/6375a1fe1054d4cf080053e5/63939ef58743daaf43f72287_favicon.png"
          rel="shortcut icon"
          type="image/x-icon"
        />
        <link
          href="https://cdn.prod.website-files.com/6375a1fe1054d4cf080053e5/63939ef90fc162a33c7d69dd_web-img.png"
          rel="apple-touch-icon"
        />
        <Script
          src="https://use.typekit.net/vzd3cvi.js"
          strategy="beforeInteractive"
        />
        <Script id="typekit-load" strategy="beforeInteractive">
          {`try{Typekit.load();}catch(e){}`}
        </Script>
        <Script id="wf-mod" strategy="beforeInteractive">
          {`!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);`}
        </Script>
        {/* jQuery */}
        <Script
          src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"
          strategy="beforeInteractive"
        />
        {/* Webflow Safety Guard */}
        <Script id="wf-shim" strategy="beforeInteractive">{`
          window.Webflow = window.Webflow || [];
          (function() {
            var _wf = window.Webflow;
            try {
              Object.defineProperty(window, 'Webflow', {
                configurable: true,
                enumerable: true,
                get: function() { return _wf; },
                set: function(v) {
                  _wf = v;
                  if (_wf && typeof _wf.define === 'function') {
                    var origDefine = _wf.define;
                    _wf.define = function(name, fn, options) {
                      if (typeof fn !== 'function') return {};
                      try {
                        return origDefine.call(this, name, fn, options);
                      } catch(e) {
                        return {};
                      }
                    };
                  }
                }
              });
            } catch(e) {}
          })();
        `}</Script>
        {/* MediSave Full Integration Script */}
        <Script id="medisave-app" strategy="afterInteractive">{`
(function() {
  // Prescription basket state in localStorage
  let basket = JSON.parse(localStorage.getItem('medisave_basket') || '[]');
  let currentUser = JSON.parse(localStorage.getItem('medisave_user') || 'null');
  let currentToken = localStorage.getItem('medisave_token') || null;

  function saveBasket() {
    localStorage.setItem('medisave_basket', JSON.stringify(basket));
    updateBasketBadge();
    syncBasketToCloud();
  }

  function updateBasketBadge() {
    const count = basket.length;
    const badge = document.getElementById('basket-count-badge');
    if (badge) badge.textContent = count;
  }

  async function syncBasketToCloud() {
    if (!currentToken || basket.length === 0) return;
    try {
      for (const item of basket) {
        if (!item.synced) {
          await fetch('/api/prescriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({
              brand_id: item.brand_name.toLowerCase().replace(/\\s+/g, '-'),
              brand_name: item.brand_name,
              generic_name: item.generic_name,
              ja_code: item.ja_code || 0,
              pack_count: item.pack_count || 10,
              brand_mrp: item.brand_mrp || 0,
              generic_equivalent_price: item.generic_price || 0,
              saving_amount: item.saving_amount || 0,
              molecules: item.molecules || [],
              strengths: item.strengths || [],
              form: item.form || 'tablet',
              data_date: new Date().toISOString().slice(0, 10)
            })
          });
          item.synced = true;
        }
      }
      localStorage.setItem('medisave_basket', JSON.stringify(basket));
    } catch (e) {
      console.warn('Cloud prescription sync deferred:', e);
    }
  }

  function initUI() {
    if (typeof window.$ === 'undefined') {
      setTimeout(initUI, 50);
      return;
    }

    const $ = window.$;

    // --- ELEVENLABS & ACCESSIBILITY VOICE ASSISTANT ---
    let activeAudio = null;

    window.speakText = async function(text, btnElement) {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      if (btnElement) {
        $(btnElement).addClass('speaking').find('span').text('Speaking...');
      }

      function resetBtn() {
        if (btnElement) {
          $(btnElement).removeClass('speaking').find('span').text('Listen / सुनें (Voice AI)');
        }
      }

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('audio/mpeg')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          activeAudio = new Audio(url);
          activeAudio.onended = function() {
            resetBtn();
            URL.revokeObjectURL(url);
            activeAudio = null;
          };
          activeAudio.onerror = function() {
            fallbackBrowserSpeech(text, resetBtn);
          };
          await activeAudio.play();
          return;
        }
      } catch (err) {
        console.warn('ElevenLabs API fetch error, using Web Speech fallback:', err);
      }

      fallbackBrowserSpeech(text, resetBtn);
    };

    function fallbackBrowserSpeech(text, onEnd) {
      if (!('speechSynthesis' in window)) {
        if (onEnd) onEnd();
        return;
      }
      const cleanText = text.replace(/[₹•]/g, ' rupees ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
      window.speechSynthesis.speak(utterance);
    }

    // Voice Input for Non-writers & Accessibility
    window.startVoiceSearch = function() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      const micBtns = $('.voice-search-btn, .voice-assistant-fab, #btn-voice-search-action');
      micBtns.addClass('is-listening');

      let toast = $('#voice-toast');
      if (toast.length === 0) {
        $('body').append(\`
          <div id="voice-toast" style="position:fixed; top:24px; left:50%; transform:translateX(-50%); z-index:999999; background:#1B0A66; color:#ffffff; padding:12px 24px; border-radius:999px; box-shadow:0 8px 30px rgba(0,0,0,0.3); display:flex; align-items:center; gap:12px; font-weight:700; font-size:14px; border:2px solid #A6D63A;">
            <span style="display:inline-block; width:10px; height:10px; background:#FF3B30; border-radius:50%; animation:voice-pulse 1s infinite;"></span>
            <span>Listening... बोलिए (e.g. "Dolo 650", "Augmentin", "Sugar ki dawai")</span>
          </div>
        \`);
        toast = $('#voice-toast');
      } else {
        toast.show();
      }

      recognition.onresult = async function(event) {
        micBtns.removeClass('is-listening');
        toast.hide();

        let transcript = event.results[0][0].transcript.trim();
        console.log('Voice recognized:', transcript);

        // 1. Clean conversational prefixes and punctuation
        let cleaned = transcript
          .replace(/^[,\.\?!;:]+|[,\.\?!;:]+$/g, '')
          .replace(/^(explain(\s+me)?(\s+about)?|tell\s+me\s+about|what\s+is(\s+the\s+price\s+of)?|price\s+of|cost\s+of|search\s+for|find\s+me|find|show\s+me|dawa\s+for|dawai\s+for|medicine\s+for|give\s+me|i\s+need|i\s+want)\s+/i, '')
          .trim();

        // 2. Phonetic & common speech-to-text corrections for Indian medicines
        const lower = cleaned.toLowerCase();
        let searchQuery = cleaned;

        if (/^(the\s+)?(doll?ar|dolor|dolo|dollo)(\s+650)?$/i.test(lower) || lower.includes('dollar') || lower.includes('dolor')) {
          searchQuery = 'Dolo 650';
        } else if (/^(crocin|crosin|crossin)/i.test(lower)) {
          searchQuery = 'Crocin';
        } else if (/^(calpol|call\s*pol)/i.test(lower)) {
          searchQuery = 'Calpol';
        } else if (/^(augmentin|oxmentin|agmentin)/i.test(lower)) {
          searchQuery = 'Augmentin 625 Duo';
        } else if (/^(pan(\s+|-)?d|pandy|pandey)/i.test(lower)) {
          searchQuery = 'Pan-D';
        } else if (/^(shelcal|shell(\s+)?cal)/i.test(lower)) {
          searchQuery = 'Shelcal 500';
        } else if (/^(allegra|a\s+legra)/i.test(lower)) {
          searchQuery = 'Allegra';
        } else if (/^(combiflam|combi\s+flam)/i.test(lower)) {
          searchQuery = 'Combiflam';
        } else if (/^(azithral|azithro|azithromycin|azee)/i.test(lower)) {
          searchQuery = 'Azithral';
        } else if (lower.includes('sugar') || lower.includes('diabetes')) {
          searchQuery = 'Metformin';
        } else if (lower.includes('blood pressure') || lower.includes('bp') || lower.includes('high pressure')) {
          searchQuery = 'Telmisartan';
        } else if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('dard') || lower.includes('headache')) {
          searchQuery = 'Paracetamol';
        } else if (lower.includes('gas') || lower.includes('acidity') || lower.includes('pet')) {
          searchQuery = 'Pantoprazole';
        } else if (lower.includes('allergy') || lower.includes('khujli') || lower.includes('cough') || lower.includes('sardi')) {
          searchQuery = 'Cetirizine';
        } else if (lower.includes('cholesterol') || lower.includes('heart')) {
          searchQuery = 'Atorvastatin';
        }

        $('input#drug-search').val(searchQuery).trigger('input');

        const searchInput = document.getElementById('drug-search');
        if (searchInput) {
          searchInput.focus({ preventScroll: true });
        }

        // Announce top matching medicine aloud using Voice AI
        try {
          const res = await fetch('/api/search?q=' + encodeURIComponent(searchQuery) + '&limit=1');
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const topDrug = data.results[0];
            let announcement = '';
            if (topDrug.saving_pct) {
              announcement = \`Found generic alternative for \${topDrug.brand_name}. Official Jan Aushadhi price is \${topDrug.generic_price} rupees, saving you \${topDrug.saving_pct} percent.\`;
            } else {
              announcement = \`Found \${topDrug.brand_name} at Jan Aushadhi price of \${topDrug.generic_price} rupees.\`;
            }
            window.speakText(announcement);
          } else {
            window.speakText(\`Searched for \${searchQuery}. Please see available options on screen.\`);
          }
        } catch (e) {
          console.warn('Voice announcement fetch error:', e);
        }
      };

      recognition.onerror = function(event) {
        micBtns.removeClass('is-listening');
        toast.hide();
        // Ignore standard lifecycle terminations (silence or user abort)
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
      };

      recognition.onend = function() {
        micBtns.removeClass('is-listening');
        toast.hide();
      };

      try {
        recognition.start();
      } catch (err) {
        micBtns.removeClass('is-listening');
        toast.hide();
      }
    };

    // 1. Inject Camera & Action Buttons if not already present
    if ($('#btn-camera-scan').length === 0) {
      const cameraBtnHtml = \`
        <div style="display:flex; align-items:center; gap:8px; margin-top:10px; justify-content:center; flex-wrap:wrap;">
          <button id="btn-camera-scan" type="button" style="background:#1B0A66; color:#ffffff; border:none; padding:10px 20px; border-radius:999px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(27,10,102,0.25); transition:all 0.2s;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A6D63A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Scan Prescription (Gemma 4 OCR)
          </button>
          <button id="btn-voice-search-action" type="button" style="background:#EBF7EE; color:#1FAE6B; border:1.5px solid #1FAE6B; padding:9px 18px; border-radius:999px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 8px rgba(31,174,107,0.15);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            Voice Assistant (बोलकर खोजें)
          </button>
          <button id="btn-open-basket" type="button" style="background:#FFFFFF; color:#1B0A66; border:1.5px solid #1B0A66; padding:9px 18px; border-radius:999px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            My List (<span id="basket-count-badge">\${basket.length}</span>)
          </button>
          <button id="btn-open-kendra" type="button" style="background:#EBF7EE; color:#1FAE6B; border:1.5px solid #1FAE6B; padding:9px 18px; border-radius:999px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Find Kendras
          </button>
          <input type="file" id="camera-file-input" accept="image/*" capture="environment" style="display:none;" />
        </div>
      \`;
      $('#drug-form').after(cameraBtnHtml);
      $('#btn-voice-search-action').on('click', window.startVoiceSearch);
    }

    // Inject Microphone icon directly into search bar
    if ($('#btn-mic-search').length === 0) {
      const searchForm = $('form#wf-form-drug-form');
      if (searchForm.length > 0) {
        searchForm.css('position', 'relative');
        searchForm.append(\`
          <button id="btn-mic-search" class="voice-search-btn" type="button" title="Speak to Search (बोलकर दवा खोजें)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
        \`);
        $('input#drug-search').css('padding-right', '56px');
        $('#btn-mic-search').on('click', window.startVoiceSearch);
      }
    }

    // Auto-remove Webflow badge if dynamically created
    $('.w-webflow-badge').remove();
    setInterval(function() {
      $('.w-webflow-badge, a[href*="webflow.com"]').remove();
    }, 400);

    // Inject Pinned Floating Voice Assistant FAB for people who cannot write
    if ($('#voice-assistant-fab').length === 0) {
      $('body').append(\`
        <button id="voice-assistant-fab" class="voice-assistant-fab" type="button" title="Speak to Search Medicine / बोलकर दवा खोजें (ElevenLabs Accessibility)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A6D63A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <span>Voice Assistant / बोलें</span>
        </button>
      \`);
      $('#voice-assistant-fab').on('click', window.startVoiceSearch);
    }

    // Update navbar login button if user is already signed in
    function updateAuthNav() {
      if (currentUser && currentUser.email) {
        $('#open-login-btn').html(\`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          \${currentUser.email.split('@')[0]}
        \`);
        $('#open-login-mobile-btn').text(currentUser.email.split('@')[0]);
      }
    }
    updateAuthNav();

    // 2. Real-time Search Autocomplete against /api/search
    let searchTimeout = null;
    $('#drug-form').submit(function(e) { e.preventDefault(); });

    $('input#drug-search').on('input keyup', function() {
      const q = $(this).val().trim();
      const container = $('#autofill-container');

      if (q.length < 2) {
        container.empty();
        return;
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async function() {
        try {
          const res = await fetch('/api/search?q=' + encodeURIComponent(q) + '&limit=8');
          const data = await res.json();
          container.empty();

          if (!data.results || data.results.length === 0) {
            container.append('<div style="padding:14px; color:#575279; font-size:14px; background:#FFFFFF; border-radius:12px; margin-top:8px; border:1px solid #E4E5DD;">Not found in catalog. Ask your pharmacist or Kendra for the generic molecule.</div>');
            return;
          }

          data.results.forEach(drug => {
            const isBrand = drug.type === 'brand';
            const clone = $('#autofill-entry').clone();
            clone.css('display', 'flex');

            const moleculeSubtitle = drug.molecules && drug.molecules.length > 0
              ? ' (' + drug.molecules.join(' + ') + ' ' + (drug.strengths || []).join(' + ') + ')'
              : '';

            clone.find('#autofill-value').html('<strong>' + drug.brand_name + '</strong> <span style="font-size:13px; color:#575279;">' + moleculeSubtitle + '</span>');

            if (isBrand && drug.generic_price) {
              clone.find('.autofill-button_text').html(
                '<span style="color:#1FAE6B; font-weight:800; font-size:14px;">₹' + drug.generic_price + '</span> ' +
                '<span style="text-decoration:line-through; color:#575279; font-size:12px;">₹' + drug.brand_mrp + '</span> ' +
                '<span style="background:#A6D63A; color:#1B0A66; padding:2px 8px; border-radius:999px; font-weight:800; font-size:11px; margin-left:6px;">Save ' + (drug.saving_pct || 0) + '%</span>'
              );
            } else if (drug.generic_price) {
              clone.find('.autofill-button_text').html('<span style="color:#1FAE6B; font-weight:800; font-size:14px;">Jan Aushadhi ₹' + drug.generic_price + '</span>');
            } else {
              clone.find('.autofill-button_text').html('<span style="color:#1B0A66; font-size:13px;">View Generic</span>');
            }

            clone.find('#autofill-package-size').text(drug.pack_count || '10');
            clone.find('#autofill-package-size-label').text((drug.form || 'tablet') + 's');

            clone.click(function() {
              openMedicineDetailModal(drug);
            });

            container.append(clone);
          });
        } catch (err) {
          console.warn('Search query error:', err);
        }
      }, 200);
    });

    // 3. Medicine Details Modal
    window.openMedicineDetailModal = function(drug) {
      let modal = document.getElementById('detail-modal');
      if (!modal) {
        $('body').append(\`
          <div id="detail-modal" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(18, 6, 70, 0.65); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:20px;">
            <div style="background:#FFFFFF; width:100%; max-width:500px; border-radius:24px; padding:32px; box-shadow:0 24px 60px rgba(18,6,70,0.3); position:relative; color:#1B0A66;">
              <button id="close-detail-btn" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#575279;">✕</button>
              <div id="detail-content"></div>
            </div>
          </div>
        \`);
        modal = document.getElementById('detail-modal');
        $('#close-detail-btn').click(function() { modal.style.display = 'none'; });
        $('#detail-modal').click(function(e) { if (e.target === modal) modal.style.display = 'none'; });
      }

      const savingHeadline = drug.saving_pct
        ? \`<div style="background:#EBF7EE; border:1.5px solid #1FAE6B; border-radius:14px; padding:14px; margin:16px 0; display:flex; justify-content:space-between; align-items:center;">
             <div>
               <div style="font-size:12px; font-weight:700; color:#1FAE6B; text-transform:uppercase;">Verified Government Savings</div>
               <div style="font-size:22px; font-weight:800; color:#1B0A66;">Save ₹\${drug.saving_amount} (\${drug.saving_pct}%)</div>
             </div>
             <div style="text-align:right;">
               <div style="font-size:12px; color:#575279; text-decoration:line-through;">Commercial ₹\${drug.brand_mrp}</div>
               <div style="font-size:18px; font-weight:800; color:#1FAE6B;">Jan Aushadhi ₹\${drug.generic_price}</div>
             </div>
           </div>\`
        : \`<div style="background:#F7F8F2; border-radius:14px; padding:14px; margin:16px 0;">
             <div style="font-size:14px; font-weight:700; color:#1B0A66;">Official Jan Aushadhi Generic</div>
             <div style="font-size:22px; font-weight:800; color:#1FAE6B;">₹\${drug.generic_price} (Regulated Price)</div>
           </div>\`;

      $('#detail-content').html(\`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#1B0A66; color:#A6D63A; padding:3px 10px; border-radius:999px; font-weight:800; font-size:11px; text-transform:uppercase;">
              \${drug.type === 'brand' ? 'Commercial Brand' : 'Generic Product'}
            </span>
            <span style="font-size:13px; color:#575279;">PMBI Code #\${drug.ja_code || 'N/A'}</span>
          </div>
          <button id="btn-speak-modal" class="btn-speak-tts" type="button" title="Listen Aloud with Voice AI">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            <span>Listen / सुनें (Voice AI)</span>
          </button>
        </div>
        <h3 style="font-size:24px; font-weight:800; margin:0 0 6px 0; color:#1B0A66;">\${drug.brand_name}</h3>
        <p style="font-size:14px; color:#575279; margin:0 0 14px 0;">
          <strong>Active Chemical:</strong> \${(drug.molecules || []).join(' + ')} \${(drug.strengths || []).join(' + ')} • \${drug.pack_count} \${drug.form || 'tablet'}s
        </p>

        \${savingHeadline}

        <div style="font-size:12px; color:#575279; background:#F7F8F2; border-radius:10px; padding:12px; margin-bottom:20px; line-height:1.5;">
          <strong>Bioequivalence Guarantee:</strong> Both medicines contain the exact same active pharmaceutical ingredient, therapeutic action, and safety profile in accordance with Central Drugs Standard Control Organisation (CDSCO) standards.
        </div>

        <div style="display:flex; gap:10px;">
          <button id="btn-add-to-basket-modal" style="flex:1; background:#1FAE6B; color:#ffffff; font-weight:700; font-size:15px; padding:12px; border:none; border-radius:999px; cursor:pointer;">
            + Add to My List
          </button>
          <button id="btn-locate-from-modal" style="background:#1B0A66; color:#ffffff; font-weight:700; font-size:15px; padding:12px 18px; border:none; border-radius:999px; cursor:pointer;">
            Find Kendra
          </button>
        </div>
      \`);

      $('#btn-speak-modal').click(function() {
        const textToSpeak = drug.saving_pct
          ? \`Medicine \${drug.brand_name}. Active molecule: \${(drug.molecules || []).join(' ')}. Commercial price is ₹\${drug.brand_mrp}. Official Jan Aushadhi generic equivalent is ₹\${drug.generic_price}. You save \${drug.saving_pct} percent.\`
          : \`Medicine \${drug.brand_name}. Active chemical: \${(drug.molecules || []).join(' ')}. Jan Aushadhi generic price is ₹\${drug.generic_price}.\`;
        window.speakText(textToSpeak, this);
      });

      $('#btn-add-to-basket-modal').click(function() {
        basket.push(drug);
        saveBasket();
        alert(\`Added \${drug.brand_name} to your prescription list!\`);
        modal.style.display = 'none';
      });

      $('#btn-locate-from-modal').click(function() {
        modal.style.display = 'none';
        openKendraModal();
      });

      modal.style.display = 'flex';
    };

    // 4. Camera OCR Scan Handler (Gemma 4 via /api/ocr)
    $('#btn-camera-scan').click(function() {
      $('#camera-file-input').click();
    });

    $('#camera-file-input').on('change', async function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // Downscale image via canvas to save bandwidth (< 1280px)
      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.onload = async function() {
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64Only = dataUrl.split(',')[1];

          // Show loading modal
          showOcrLoadingModal();

          try {
            const res = await fetch('/api/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64Only })
            });
            const data = await res.json();
            hideOcrLoadingModal();

            if (data.ok && data.names && data.names.length > 0) {
              openOcrConfirmModal(data.names, data.model_used);
            } else {
              alert(data.warning || 'No clear medicine names could be detected. Please type the name directly in search.');
            }
          } catch (err) {
            hideOcrLoadingModal();
            alert('Error contacting OCR perception service. Please type your medicine name directly.');
          }
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });

    function showOcrLoadingModal() {
      let loader = document.getElementById('ocr-loader-modal');
      if (!loader) {
        $('body').append(\`
          <div id="ocr-loader-modal" style="display:none; position:fixed; inset:0; z-index:999999; background:rgba(18, 6, 70, 0.7); backdrop-filter:blur(6px); align-items:center; justify-content:center; color:#ffffff; text-align:center; padding:20px;">
            <div style="background:#FFFFFF; color:#1B0A66; padding:32px 40px; border-radius:24px; box-shadow:0 24px 60px rgba(0,0,0,0.3); max-width:380px;">
              <div style="font-size:32px; margin-bottom:12px;">🔍</div>
              <h3 style="font-size:20px; font-weight:800; margin:0 0 8px 0;">Reading with Gemma 4 Vision</h3>
              <p style="font-size:13px; color:#575279; margin:0; line-height:1.5;">Extracting medicine brand names & active molecules from your photo. Running in-memory with strict patient privacy.</p>
            </div>
          </div>
        \`);
        loader = document.getElementById('ocr-loader-modal');
      }
      loader.style.display = 'flex';
    }

    function hideOcrLoadingModal() {
      const loader = document.getElementById('ocr-loader-modal');
      if (loader) loader.style.display = 'none';
    }

    function openOcrConfirmModal(names, modelUsed) {
      let confirmModal = document.getElementById('ocr-confirm-modal');
      if (!confirmModal) {
        $('body').append(\`
          <div id="ocr-confirm-modal" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(18, 6, 70, 0.65); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:20px;">
            <div style="background:#FFFFFF; width:100%; max-width:460px; border-radius:24px; padding:32px; box-shadow:0 24px 60px rgba(18,6,70,0.3); position:relative; color:#1B0A66;">
              <button id="close-confirm-btn" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#575279;">✕</button>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="background:#1FAE6B; color:#ffffff; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:800;">VERIFIED OCR</span>
                <span style="font-size:12px; color:#575279;">\${modelUsed || 'Gemma 4'}</span>
              </div>
              <h3 style="font-size:22px; font-weight:800; margin:0 0 6px 0;">Detected Prescription Items</h3>
              <p style="font-size:13px; color:#575279; margin-bottom:16px;">Verify or edit detected medicine text before searching Jan Aushadhi generic equivalents:</p>
              <div id="ocr-items-inputs"></div>
              <button id="btn-run-ocr-search" style="width:100%; margin-top:16px; background:#1FAE6B; color:#ffffff; font-weight:700; font-size:15px; padding:12px; border:none; border-radius:999px; cursor:pointer;">
                Find Generic Equivalents & Savings →
              </button>
            </div>
          </div>
        \`);
        confirmModal = document.getElementById('ocr-confirm-modal');
        $('#close-confirm-btn').click(function() { confirmModal.style.display = 'none'; });
      }

      const container = $('#ocr-items-inputs');
      container.empty();
      names.forEach((name, idx) => {
        container.append(\`
          <div style="margin-bottom:10px;">
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:#575279;">Medicine #\${idx + 1}</label>
            <input type="text" class="ocr-edit-input" value="\${name}" style="width:100%; padding:10px 14px; border:1.5px solid #E4E5DD; border-radius:10px; font-size:14px; font-weight:600; color:#1B0A66; outline:none;" />
          </div>
        \`);
      });

      $('#btn-run-ocr-search').off('click').on('click', function() {
        const firstVal = $('.ocr-edit-input').first().val();
        confirmModal.style.display = 'none';
        if (firstVal) {
          $('input#drug-search').val(firstVal).trigger('keyup');
          $('html, body').animate({ scrollTop: $('#drug-search').offset().top - 100 }, 400);
        }
      });

      confirmModal.style.display = 'flex';
    }

    // 5. Prescription Basket Modal ("My List")
    $('#btn-open-basket').click(function() {
      openBasketModal();
    });

    window.openBasketModal = function() {
      let modal = document.getElementById('basket-modal');
      if (!modal) {
        $('body').append(\`
          <div id="basket-modal" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(18, 6, 70, 0.65); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:20px;">
            <div style="background:#FFFFFF; width:100%; max-width:540px; border-radius:24px; padding:32px; box-shadow:0 24px 60px rgba(18,6,70,0.3); position:relative; color:#1B0A66; max-height:90vh; overflow-y:auto;">
              <button id="close-basket-btn" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#575279;">✕</button>
              <h3 style="font-size:22px; font-weight:800; margin:0 0 6px 0;">My Prescription Basket</h3>
              <p style="font-size:13px; color:#575279; margin:0 0 16px 0;">Print this slip and present it at any Jan Aushadhi Kendra to purchase generic bio-equivalents.</p>
              <div id="basket-items-list" style="margin-bottom:16px;"></div>
              <div id="basket-summary" style="background:#F7F8F2; border-radius:14px; padding:16px; margin-bottom:20px;"></div>
              <div style="display:flex; gap:10px;">
                <button id="btn-print-basket" style="flex:1; background:#1B0A66; color:#ffffff; font-weight:700; font-size:14px; padding:12px; border:none; border-radius:999px; cursor:pointer;">
                  🖨️ Print Prescription Slip
                </button>
                <button id="btn-clear-basket" style="background:#FFF0F0; color:#E53E3E; font-weight:700; font-size:14px; padding:12px 18px; border:none; border-radius:999px; cursor:pointer;">
                  Clear
                </button>
              </div>
            </div>
          </div>
        \`);
        modal = document.getElementById('basket-modal');
        $('#close-basket-btn').click(function() { modal.style.display = 'none'; });
        $('#btn-clear-basket').click(function() {
          basket = [];
          saveBasket();
          renderBasketItems();
        });
        $('#btn-print-basket').click(function() {
          window.print();
        });
      }

      renderBasketItems();
      modal.style.display = 'flex';
    };

    function renderBasketItems() {
      const container = $('#basket-items-list');
      const summary = $('#basket-summary');
      container.empty();

      if (basket.length === 0) {
        container.html('<div style="text-align:center; padding:30px 0; color:#575279; font-size:14px;">Your prescription list is empty.<br/>Search any medicine above and click "+ Add to My List".</div>');
        summary.hide();
        return;
      }

      summary.show();
      let totalBrand = 0;
      let totalGeneric = 0;

      basket.forEach((item, idx) => {
        const brandPrice = parseFloat(item.brand_mrp) || 0;
        const genericPrice = parseFloat(item.generic_price) || 0;
        totalBrand += brandPrice;
        totalGeneric += genericPrice;

        container.append(\`
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #E4E5DD;">
            <div>
              <div style="font-weight:700; font-size:14px; color:#1B0A66;">\${item.brand_name}</div>
              <div style="font-size:12px; color:#575279;">→ \${item.generic_name} (\${item.pack_count || 10} \${item.form || 'tablet'}s)</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:15px; color:#1FAE6B;">₹\${genericPrice}</div>
              \${brandPrice ? '<div style="font-size:11px; color:#575279; text-decoration:line-through;">₹' + brandPrice + '</div>' : ''}
              <button class="btn-remove-basket-item" data-idx="\${idx}" style="background:none; border:none; color:#E53E3E; font-size:11px; cursor:pointer; padding:0; text-decoration:underline;">Remove</button>
            </div>
          </div>
        \`);
      });

      const totalSaving = Math.max(0, Math.round((totalBrand - totalGeneric) * 100) / 100);
      const totalSavingPct = totalBrand > 0 ? Math.round((totalSaving / totalBrand) * 100) : 0;

      summary.html(\`
        <div style="display:flex; justify-content:space-between; font-size:13px; color:#575279; margin-bottom:6px;">
          <span>Commercial Brands Total:</span>
          <span>₹\${totalBrand.toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:13px; color:#575279; margin-bottom:10px;">
          <span>Jan Aushadhi Generic Total:</span>
          <span style="font-weight:700; color:#1FAE6B;">₹\${totalGeneric.toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:800; color:#1B0A66; border-top:1.5px solid #E4E5DD; padding-top:8px;">
          <span>Total Patient Savings:</span>
          <span style="color:#1FAE6B;">₹\${totalSaving.toFixed(2)} (\${totalSavingPct}% saved)</span>
        </div>
      \`);

      $('.btn-remove-basket-item').click(function() {
        const i = parseInt($(this).data('idx'), 10);
        basket.splice(i, 1);
        saveBasket();
        renderBasketItems();
      });
    }

    // 6. Nearest Kendra Locator Modal
    $('#btn-open-kendra').click(function() {
      openKendraModal();
    });

    window.openKendraModal = function() {
      let modal = document.getElementById('kendra-modal');
      if (!modal) {
        $('body').append(\`
          <div id="kendra-modal" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(18, 6, 70, 0.65); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:20px;">
            <div style="background:#FFFFFF; width:100%; max-width:540px; border-radius:24px; padding:32px; box-shadow:0 24px 60px rgba(18,6,70,0.3); position:relative; color:#1B0A66; max-height:85vh; overflow-y:auto;">
              <button id="close-kendra-btn" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#575279;">✕</button>
              <h3 style="font-size:22px; font-weight:800; margin:0 0 6px 0;">Find Jan Aushadhi Kendra</h3>
              <p style="font-size:13px; color:#575279; margin:0 0 16px 0;">Locate your nearest PMBJP government Kendra store:</p>
              <div style="display:flex; gap:8px; margin-bottom:16px;">
                <input type="text" id="kendra-search-input" placeholder="Search city or pincode (e.g. Delhi, Mumbai, 110029)..." style="flex:1; padding:10px 14px; border:1.5px solid #E4E5DD; border-radius:10px; font-size:14px; outline:none;" />
                <button id="btn-gps-locate" style="background:#1B0A66; color:#ffffff; font-weight:700; font-size:13px; padding:10px 14px; border:none; border-radius:10px; cursor:pointer;">
                  📍 GPS
                </button>
              </div>
              <div id="kendra-results-list"></div>
            </div>
          </div>
        \`);
        modal = document.getElementById('kendra-modal');
        $('#close-kendra-btn').click(function() { modal.style.display = 'none'; });

        $('#kendra-search-input').on('input', function() {
          fetchKendras({ q: $(this).val().trim() });
        });

        $('#btn-gps-locate').click(function() {
          if (navigator.geolocation) {
            $('#btn-gps-locate').text('Locating...');
            navigator.geolocation.getCurrentPosition(
              function(pos) {
                $('#btn-gps-locate').text('📍 GPS');
                fetchKendras({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              },
              function() {
                $('#btn-gps-locate').text('📍 GPS');
                alert('GPS location permission denied. Please enter your city or pincode.');
              }
            );
          }
        });
      }

      fetchKendras({});
      modal.style.display = 'flex';
    };

    async function fetchKendras(params) {
      const qs = new URLSearchParams(params).toString();
      try {
        const res = await fetch('/api/kendras' + (qs ? '?' + qs : ''));
        const data = await res.json();
        const container = $('#kendra-results-list');
        container.empty();

        if (!data.results || data.results.length === 0) {
          container.html('<div style="color:#575279; font-size:13px; text-align:center; padding:20px;">No Kendras found for this query. Try a nearby city.</div>');
          return;
        }

        data.results.forEach(k => {
          const distBadge = k.distance_km !== null
            ? \`<span style="background:#EBF7EE; color:#1FAE6B; font-weight:800; font-size:11px; padding:2px 8px; border-radius:999px;">\${k.distance_km} km away</span>\`
            : '';

          container.append(\`
            <div style="border:1.5px solid #E4E5DD; border-radius:12px; padding:14px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:4px;">
                <div style="font-weight:700; font-size:15px; color:#1B0A66;">\${k.name}</div>
                \${distBadge}
              </div>
              <div style="font-size:13px; color:#575279; margin-bottom:6px;">\${k.address}, \${k.city}, \${k.state} - \${k.pincode}</div>
              <div style="display:flex; justify-content:space-between; font-size:12px; color:#575279;">
                <span>📞 \${k.phone}</span>
                <span>⏰ \${k.timings}</span>
              </div>
            </div>
          \`);
        });
      } catch (e) {
        console.warn('Kendra fetch error:', e);
      }
    }

    // 7. Supabase Auth Form Integration
    $('#auth-form').off('submit').on('submit', async function(e) {
      e.preventDefault();
      const emailInput = $(this).find('input[type="text"]').val().trim();
      const passInput = $(this).find('input[type="password"]').val().trim();
      const submitBtn = $(this).find('button[type="submit"]');

      submitBtn.text('Signing in...').prop('disabled', true);

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signin_password',
            email: emailInput,
            password: passInput
          })
        });

        const data = await res.json();
        submitBtn.text('Sign In to MediSave').prop('disabled', false);

        if (data.ok && data.session) {
          currentUser = data.session.user;
          currentToken = data.session.access_token;
          localStorage.setItem('medisave_user', JSON.stringify(currentUser));
          localStorage.setItem('medisave_token', currentToken);
          alert('Signed in successfully! Your prescriptions will now automatically sync to your account.');
          document.getElementById('auth-modal').style.display = 'none';
          updateAuthNav();
          syncBasketToCloud();
        } else {
          // If password login fails, try OTP sign-in
          const otpRes = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_otp', email: emailInput })
          });
          const otpData = await otpRes.json();
          if (otpData.ok) {
            alert('A login OTP / magic link has been sent to ' + emailInput + '. Please check your inbox.');
            document.getElementById('auth-modal').style.display = 'none';
          } else {
            alert(data.error || 'Login failed. Please check credentials or register.');
          }
        }
      } catch (err) {
        submitBtn.text('Sign In to MediSave').prop('disabled', false);
        alert('Network error connecting to authentication service.');
      }
    });

  }

  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUI);
    } else {
      initUI();
    }
  }
})();
`}</Script>
        {/* Webflow JS */}
        <Script
          src="https://assets-global.website-files.com/6375a1fe1054d4cf080053e5/js/budgetrx.ba14818d5.js"
          strategy="lazyOnload"
        />
      </head>
      <body suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
