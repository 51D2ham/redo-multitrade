window._imageFiles = window._imageFiles || {};
function renderImagePreviews(previewId, inputName) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const files = window._imageFiles[inputName] || [];
  preview.innerHTML = '';
  if (!files.length) {
    preview.innerHTML = '<div class="text-gray-400 col-span-3">No images selected.</div>';
    return;
  }
  files.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const thumb = document.createElement('div');
      thumb.className = 'image-thumb';
      thumb.style.position = 'relative'; // Ensure stacking context for remove button
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = 'Preview';
      img.style.zIndex = '0';
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'remove-btn';
      btn.title = 'Remove image';
      btn.textContent = '×';
      btn.style.cssText = 'z-index:2;position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.98);color:#ef4444;border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;cursor:pointer;box-shadow:0 1px 4px rgba(99,102,241,0.10);transition:background 0.2s;opacity:1;';
      
      thumb.appendChild(img);
      thumb.appendChild(btn);
      btn.onclick = function() {
        window._imageFiles[inputName].splice(idx, 1);
        renderImagePreviews(previewId, inputName);
        updateInputFiles(inputName);
      };
      preview.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });
}
function updateInputFiles(inputName) {
  const input = document.querySelector(`input[name='${inputName}']`);
  if (!input) return;
  const dt = new DataTransfer();
  (window._imageFiles[inputName] || []).forEach(f => dt.items.add(f));
  input.files = dt.files;
}
function handleImageSelect(event, previewId, inputName) {
  window._imageFiles[inputName] = Array.from(event.target.files);
  renderImagePreviews(previewId, inputName);
  updateInputFiles(inputName);
}
window.onload = function() {
  var thumbInput = document.querySelector('input[type=file][name="thumbnails"]');
  var variantInput = document.querySelector('input[type=file][name="variantImages"]');
  if (thumbInput) {
    thumbInput.addEventListener('click', function(e) { e.target.value = ''; });
    thumbInput.addEventListener('change', function(e) {
      handleImageSelect(e, 'thumb-preview', 'thumbnails');
    });
  }
  if (variantInput) {
    variantInput.addEventListener('click', function(e) { e.target.value = ''; });
    variantInput.addEventListener('change', function(e) {
      handleImageSelect(e, 'variant-preview', 'variantImages');
    });
  }
  // Initial render
  renderImagePreviews('thumb-preview', 'thumbnails');
  renderImagePreviews('variant-preview', 'variantImages');
};

// -------------------------
// Category/Subcategory plumbing
// -------------------------
(function setupCategoryFilters(){
  // Read data from the non-executing JSON script block if present (works with strict CSP)
  var pageData = {};
  try {
    var el = document.getElementById('product-data');
    if (el && el.textContent) {
      const sanitizedContent = el.textContent.replace(/[<>"'&]/g, '');
      pageData = JSON.parse(sanitizedContent || '{}');
    }
  } catch (e) {
    // fall back to window-provided globals for backward compatibility
    pageData = {
      categories: window._CATEGORIES || [],
      subCategories: window._SUBCATEGORIES || [],
      miniSubs: window._MINISUBS || [],
      initial: { category: '', subCategory: '', miniSubCategory: '' }
    };
  }

  // Normalize entries to strings for reliable comparison
  const categories = (pageData.categories || []).map(c => ({ _id: (c._id||c.id||'').toString(), name: c.name }));
  const subCategories = (pageData.subCategories || []).map(s => ({ _id: (s._id||s.id||'').toString(), name: s.name, parent: (s.parent||'').toString() }));
  const miniSubs = (pageData.miniSubs || []).map(m => ({ _id: (m._id||m.id||'').toString(), name: m.name, parent: (m.parent||'').toString() }));

  const categorySelect = document.getElementById('category-select');
  const subSelect = document.getElementById('subCategory-select');
  const miniSelect = document.getElementById('miniSubCategory-select');

  if (!categorySelect || !subSelect || !miniSelect) return;

  function clearOptions(select) {
    while (select.options.length > 0) select.remove(0);
  }

  function addOption(select, value, text, selected) {
    const opt = document.createElement('option');
    opt.value = value || '';
    opt.text = text || '';
    if (selected) opt.selected = true;
    select.appendChild(opt);
  }

  function populateSubCategories(categoryId, preserveSelectedId) {
    clearOptions(subSelect);
    addOption(subSelect, '', '— None —');
  const filtered = subCategories.filter(s => (s.parent || '') === (categoryId || ''));
  filtered.forEach(s => addOption(subSelect, s._id, s.name, (s._id||'').toString() === (preserveSelectedId || '').toString()));
  // update count display if present
  const subCountEl = document.getElementById('sub-count');
  if (subCountEl) subCountEl.textContent = `${filtered.length} option(s)`;
  }

  function populateMiniSubs(subId, preserveSelectedId) {
    clearOptions(miniSelect);
    addOption(miniSelect, '', '— None —');
  const filtered = miniSubs.filter(m => (m.parent || '') === (subId || ''));
  filtered.forEach(m => addOption(miniSelect, m._id, m.name, (m._id||'').toString() === (preserveSelectedId || '').toString()));
  // update count display if present
  const miniCountEl = document.getElementById('mini-count');
  if (miniCountEl) miniCountEl.textContent = `${filtered.length} option(s)`;
  }

  // Capture initial values: prefer values set as data attributes (server-side) otherwise fall back to pageData.initial
  const initialCategory = categorySelect.getAttribute('data-initial') || (pageData.initial && pageData.initial.category) || categorySelect.value || '';
  const initialSub = subSelect.getAttribute('data-initial') || (pageData.initial && pageData.initial.subCategory) || '';
  const initialMini = miniSelect.getAttribute('data-initial') || (pageData.initial && pageData.initial.miniSubCategory) || '';

  // Populate sub and mini based on initial values
  if (initialCategory) {
    populateSubCategories(initialCategory, initialSub);
    if (initialSub) populateMiniSubs(initialSub, initialMini);
  } else {
    // nothing selected yet, keep empty selects
    clearOptions(subSelect);
    addOption(subSelect, '', '— None —');
    clearOptions(miniSelect);
    addOption(miniSelect, '', '— None —');
  }

  // Ensure counts show current options when the page loads
  (function initCounts(){
    const subCountEl = document.getElementById('sub-count');
    const miniCountEl = document.getElementById('mini-count');
    if (subCountEl) {
      // count current options excluding the placeholder
      const subCount = Math.max(0, subSelect.options.length - 1);
      subCountEl.textContent = `${subCount} option(s)`;
    }
    if (miniCountEl) {
      const miniCount = Math.max(0, miniSelect.options.length - 1);
      miniCountEl.textContent = `${miniCount} option(s)`;
    }
  })();

  // Wire events
  categorySelect.addEventListener('change', function(e){
    const cid = e.target.value;
    populateSubCategories(cid);
    // reset mini
    clearOptions(miniSelect);
    addOption(miniSelect, '', '— None —');
  });

  subSelect.addEventListener('change', function(e){
    const sid = e.target.value;
    populateMiniSubs(sid);
  });
})();
