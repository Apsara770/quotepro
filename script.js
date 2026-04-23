  
/* ═══════════════════════════════════════
   QuotePro — Unified JS
═══════════════════════════════════════ */

const mainCanvas = document.getElementById('mainCanvas');
const guideX = document.getElementById('guide-x');
const guideY = document.getElementById('guide-y');

let selectedElement = null;
let history = [];
let historyStep = -1;

/* ── Auto-save ── */
function autoSave() {
  const data = { html: mainCanvas.innerHTML, bg: mainCanvas.style.backgroundImage, ratio: mainCanvas.dataset.ratio || "1/1" };
  try { localStorage.setItem('qpDesign', JSON.stringify(data)); } catch(e){}
}

window.addEventListener('load', () => {
  try {
    const saved = localStorage.getItem('qpDesign');
    if (saved) {
      const d = JSON.parse(saved);
      mainCanvas.innerHTML = d.html;
      mainCanvas.style.backgroundImage = d.bg;
      setCanvasSize(d.ratio || "1/1");
      reAttachEvents();
    }
  } catch(e) {}
  saveState();
});

/* ── History ── */
function saveState() {
  historyStep++;
  if (historyStep < history.length) history.length = historyStep;
  history.push(mainCanvas.innerHTML);
  autoSave();
}

function undo() {
  if (historyStep > 0) { historyStep--; mainCanvas.innerHTML = history[historyStep]; reAttachEvents(); }
}
function redo() {
  if (historyStep < history.length - 1) { historyStep++; mainCanvas.innerHTML = history[historyStep]; reAttachEvents(); }
}

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('mUndoBtn').addEventListener('click', undo);
document.getElementById('mRedoBtn').addEventListener('click', redo);

/* ── New Design ── */
function newDesign() {
  if (!confirm("Start a new design? Current progress will be lost.")) return;
  mainCanvas.innerHTML = "";
  mainCanvas.style.backgroundImage = "";
  try { localStorage.removeItem('qpDesign'); } catch(e){}
  history = []; historyStep = -1;
  deselectAll();
  saveState();
}
document.getElementById('newDesignBtn').addEventListener('click', newDesign);
document.getElementById('mNewDesignBtn').addEventListener('click', newDesign);

/* ── Canvas Size ── */
function setCanvasSize(ratio) {
  const isMobile = window.innerWidth <= 768;
  mainCanvas.dataset.ratio = ratio;

  if (isMobile) {
    if (ratio === "1/1") { mainCanvas.style.width = ""; mainCanvas.style.height = ""; }
    else if (ratio === "9/16") { mainCanvas.style.width = ""; mainCanvas.style.height = ""; }
    else if (ratio === "16/9") { mainCanvas.style.width = ""; mainCanvas.style.height = ""; }
  } else {
    if (ratio === "1/1")  { mainCanvas.style.width = "500px"; mainCanvas.style.height = "500px"; }
    else if (ratio === "9/16") { mainCanvas.style.width = "337px"; mainCanvas.style.height = "600px"; }
    else if (ratio === "16/9") { mainCanvas.style.width = "640px"; mainCanvas.style.height = "360px"; }
  }

  // Sync all ratio buttons
  document.querySelectorAll('.ratio-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ratio === ratio);
  });
  autoSave();
}

document.querySelectorAll('.ratio-btn').forEach(btn => {
  btn.addEventListener('click', () => setCanvasSize(btn.dataset.ratio));
});

/* ── Mobile Tab Switching ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    document.querySelectorAll('.panel-section').forEach(s => {
      s.classList.toggle('active', s.id === 'tab-' + tab);
    });
    // Auto-switch to style tab when element selected
    if (tab === 'style' && selectedElement) {
      showStyleControls(selectedElement);
    }
  });
});

/* ── Dragging ── */
function makeDraggable(el) {
  let p1=0,p2=0,p3=0,p4=0;

  function dragStart(e) {
    if (el.contentEditable === "true" || (e.target && e.target.classList.contains('resizer'))) return;
    const isTouch = e.type === 'touchstart';
    const cx = isTouch ? e.touches[0].clientX : e.clientX;
    const cy = isTouch ? e.touches[0].clientY : e.clientY;
    p3 = cx; p4 = cy;
    if (isTouch) {
      document.addEventListener('touchmove', dragMove, {passive:false});
      document.addEventListener('touchend', dragEnd);
    } else {
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', dragEnd);
    }
    e.stopPropagation();
  }

  function dragMove(e) {
    if (e.cancelable) e.preventDefault();
    const isTouch = e.type === 'touchmove';
    const cx = isTouch ? e.touches[0].clientX : e.clientX;
    const cy = isTouch ? e.touches[0].clientY : e.clientY;
    p1 = p3 - cx; p2 = p4 - cy; p3 = cx; p4 = cy;
    let newTop = el.offsetTop - p2;
    let newLeft = el.offsetLeft - p1;
    const cW = mainCanvas.offsetWidth, cH = mainCanvas.offsetHeight;
    const eW = el.offsetWidth, eH = el.offsetHeight;
    const elCH = newLeft + eW/2, elCV = newTop + eH/2;
    const canCH = cW/2, canCV = cH/2;
    if (Math.abs(elCH - canCH) < 10) { newLeft = canCH - eW/2; guideX.style.display='block'; } else { guideX.style.display='none'; }
    if (Math.abs(elCV - canCV) < 10) { newTop = canCV - eH/2; guideY.style.display='block'; } else { guideY.style.display='none'; }
    el.style.top = newTop + 'px';
    el.style.left = newLeft + 'px';
  }

  function dragEnd() {
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    guideX.style.display='none'; guideY.style.display='none';
    saveState();
  }

  el.addEventListener('mousedown', dragStart);
  el.addEventListener('touchstart', dragStart, {passive:false});
}

/* ── Resizable ── */
function makeResizable(el, resizer) {
  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = el.offsetWidth;
    function resize(e) {
      const w = Math.max(20, startW + (e.clientX - startX));
      el.style.width = w + 'px';
      const shape = el.dataset.shape;
      if (shape === 'circle') el.style.height = w + 'px';
      else if (shape === 'oval') el.style.height = Math.round(w * 0.6) + 'px';
      // sync slider
      syncSizeSliders(w);
    }
    function stopResize() {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      saveState();
    }
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  });
}

function syncSizeSliders(w) {
  const v = Math.round(w);
  const ls = document.getElementById('logoSize'); if(ls){ ls.value = v; }
  const lsv = document.getElementById('logoSizeVal'); if(lsv){ lsv.textContent = v+'px'; }
  const mls = document.getElementById('mLogoSize'); if(mls){ mls.value = v; }
  const mlsv = document.getElementById('mLogoSizeVal'); if(mlsv){ mlsv.textContent = v+'px'; }
}

/* ── Select Element ── */
function selectElement(el) {
  if (selectedElement) selectedElement.classList.remove('selected');
  selectedElement = el;
  el.classList.add('selected');
  showStyleControls(el);
}

function showStyleControls(el) {
  const isText = el.classList.contains('text-element');
  // Desktop
  document.getElementById('editorHint').style.display = 'none';
  document.getElementById('textControls').className = 'ctrl-hidden' + (isText ? ' visible' : '');
  document.getElementById('imageControls').className = 'ctrl-hidden' + (!isText ? ' visible' : '');
  // Mobile hint
  document.getElementById('mEditorHint').style.display = 'none';
  document.getElementById('mTextControls').className = 'm-ctrl' + (isText ? ' visible' : '');
  document.getElementById('mImageControls').className = 'm-ctrl' + (!isText ? ' visible' : '');

  if (!isText) {
    const w = parseInt(el.style.width) || 80;
    syncSizeSliders(w);
    const op = parseFloat(el.style.opacity || 1);
    const eos = document.getElementById('elOpacity'); if(eos) eos.value = op;
    const mop = document.getElementById('mElOpacity'); if(mop) { mop.value = op; }
    const mopv = document.getElementById('mOpacityVal'); if(mopv) mopv.textContent = Math.round(op*100)+'%';
    // sync shape buttons
    const shape = el.dataset.shape || 'square';
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.toggle('active', b.dataset.shape === shape));
  }
}

function deselectAll() {
  if (selectedElement) selectedElement.classList.remove('selected');
  selectedElement = null;
  document.getElementById('editorHint').style.display = '';
  document.getElementById('mEditorHint').style.display = '';
  document.getElementById('textControls').className = 'ctrl-hidden';
  document.getElementById('imageControls').className = 'ctrl-hidden';
  document.getElementById('mTextControls').className = 'm-ctrl';
  document.getElementById('mImageControls').className = 'm-ctrl';
}

/* ── Attach Element Listeners ── */
function attachElementListeners(el) {
  el.addEventListener('mousedown', (e) => { e.stopPropagation(); selectElement(el); });
  el.addEventListener('touchstart', (e) => { e.stopPropagation(); selectElement(el); }, {passive:true});
  el.addEventListener('dblclick', () => {
    if (el.classList.contains('text-element')) {
      el.contentEditable = "true"; el.focus();
    }
  });
  el.addEventListener('blur', () => { el.contentEditable="false"; saveState(); });
}

mainCanvas.addEventListener('mousedown', (e) => { if (e.target === mainCanvas) deselectAll(); });
mainCanvas.addEventListener('touchstart', (e) => { if (e.target === mainCanvas) deselectAll(); }, {passive:true});

/* ── Re-attach after history restore ── */
function reAttachEvents() {
  mainCanvas.querySelectorAll('.canvas-element').forEach(el => {
    makeDraggable(el);
    attachElementListeners(el);
    if (el.classList.contains('image-element')) {
      const r = el.querySelector('.resizer');
      if (r) makeResizable(el, r);
    }
  });
}

/* ── Background Upload ── */
function handleBgUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    mainCanvas.style.backgroundImage = `url(${ev.target.result})`;
    mainCanvas.style.backgroundSize = 'cover';
    mainCanvas.style.backgroundPosition = 'center';
    saveState();
  };
  reader.readAsDataURL(file);
}
document.getElementById('bgUpload').addEventListener('change', (e) => handleBgUpload(e.target.files[0]));
document.getElementById('bgUploadMobile').addEventListener('change', (e) => { handleBgUpload(e.target.files[0]); e.target.value=''; });

/* ── Add Text ── */
function addText() {
  const el = document.createElement('div');
  el.className = 'canvas-element text-element';
  el.innerText = 'New Text';
  el.style.left = '30%'; el.style.top = '40%';
  el.style.fontSize = '30px'; el.style.color = '#ffffff'; el.style.fontFamily = 'Arial';
  el.style.minWidth = '60px'; el.style.cursor = 'move';
  makeDraggable(el);
  attachElementListeners(el);
  mainCanvas.appendChild(el);
  selectElement(el);
  saveState();
  // Switch to style tab on mobile
  if (window.innerWidth <= 768) switchMobileTab('style');
}
document.getElementById('addTextBtn').addEventListener('click', addText);
document.getElementById('mAddTextBtn').addEventListener('click', addText);

/* ── Add Image/Logo ── */
function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-element image-element';
    wrapper.style.width = '100px'; wrapper.style.left = '30%'; wrapper.style.top = '30%';
    wrapper.style.overflow = 'hidden';
    wrapper.dataset.shape = 'square';

    const img = document.createElement('img');
    img.src = ev.target.result;
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';

    const resizer = document.createElement('div');
    resizer.className = 'resizer';

    wrapper.appendChild(img); wrapper.appendChild(resizer);
    makeDraggable(wrapper); makeResizable(wrapper, resizer);
    attachElementListeners(wrapper);
    mainCanvas.appendChild(wrapper);
    selectElement(wrapper);
    saveState();
    if (window.innerWidth <= 768) switchMobileTab('style');
  };
  reader.readAsDataURL(file);
}
document.getElementById('elementUpload').addEventListener('change', (e) => { handleImageUpload(e.target.files[0]); e.target.value=''; });
document.getElementById('elementUploadMobile').addEventListener('change', (e) => { handleImageUpload(e.target.files[0]); e.target.value=''; });

/* ── Logo Size Slider ── */
function applyLogoSize(val) {
  if (!selectedElement || !selectedElement.classList.contains('image-element')) return;
  const size = parseInt(val);
  selectedElement.style.width = size + 'px';
  const shape = selectedElement.dataset.shape;
  if (shape === 'circle') selectedElement.style.height = size + 'px';
  else if (shape === 'oval') selectedElement.style.height = Math.round(size * 0.6) + 'px';
  syncSizeSliders(size);
}

document.getElementById('logoSize').addEventListener('input', (e) => applyLogoSize(e.target.value));
document.getElementById('logoSize').addEventListener('change', () => saveState());
document.getElementById('mLogoSize').addEventListener('input', (e) => applyLogoSize(e.target.value));
document.getElementById('mLogoSize').addEventListener('change', () => saveState());

/* ── Opacity ── */
function applyOpacity(val) {
  if (!selectedElement) return;
  const op = parseFloat(val);
  selectedElement.style.opacity = op;
  const mopv = document.getElementById('mOpacityVal');
  if (mopv) mopv.textContent = Math.round(op*100)+'%';
}
document.getElementById('elOpacity').addEventListener('input', (e) => applyOpacity(e.target.value));
document.getElementById('elOpacity').addEventListener('change', () => saveState());
document.getElementById('mElOpacity').addEventListener('input', (e) => applyOpacity(e.target.value));
document.getElementById('mElOpacity').addEventListener('change', () => saveState());

/* ── Shape Buttons ── */
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!selectedElement || !selectedElement.classList.contains('image-element')) return;
    const shape = btn.dataset.shape;
    selectedElement.dataset.shape = shape;
    const w = parseInt(selectedElement.style.width) || 100;
    selectedElement.style.borderRadius = '0'; selectedElement.style.height = '';
    if (shape === 'circle') { selectedElement.style.height = w+'px'; selectedElement.style.borderRadius='50%'; }
    else if (shape === 'oval') { selectedElement.style.height = Math.round(w*0.6)+'px'; selectedElement.style.borderRadius='50%'; }
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.toggle('active', b.dataset.shape === shape));
    saveState();
  });
});

/* ── Text Font Family ── */
function applyFont(val) { if(selectedElement) selectedElement.style.fontFamily = val; }
document.getElementById('fontFamily').addEventListener('change', (e) => { applyFont(e.target.value); saveState(); });
document.getElementById('mFontFamily').addEventListener('change', (e) => { applyFont(e.target.value); saveState(); });

/* ── Font Size ── */
function applyFontSize(val) {
  if(selectedElement) selectedElement.style.fontSize = val+'px';
  const fsv = document.getElementById('fontSizeVal'); if(fsv) fsv.textContent = val+'px';
  const mfsv = document.getElementById('mFontSizeVal'); if(mfsv) mfsv.textContent = val+'px';
  const fs = document.getElementById('fontSize'); if(fs) fs.value = val;
  const mfs = document.getElementById('mFontSize'); if(mfs) mfs.value = val;
}
document.getElementById('fontSize').addEventListener('input', (e) => applyFontSize(e.target.value));
document.getElementById('fontSize').addEventListener('change', () => saveState());
document.getElementById('mFontSize').addEventListener('input', (e) => applyFontSize(e.target.value));
document.getElementById('mFontSize').addEventListener('change', () => saveState());

/* ── Text Color ── */
function applyTextColor(val) { if(selectedElement) selectedElement.style.color = val; }
document.getElementById('textColor').addEventListener('input', (e) => applyTextColor(e.target.value));
document.getElementById('textColor').addEventListener('change', () => saveState());
document.getElementById('mTextColor').addEventListener('input', (e) => applyTextColor(e.target.value));
document.getElementById('mTextColor').addEventListener('change', () => saveState());

/* ── Bold / Italic ── */
function toggleBold() {
  if(!selectedElement) return;
  selectedElement.style.fontWeight = selectedElement.style.fontWeight==='bold' ? 'normal' : 'bold';
  saveState();
}
function toggleItalic() {
  if(!selectedElement) return;
  selectedElement.style.fontStyle = selectedElement.style.fontStyle==='italic' ? 'normal' : 'italic';
  saveState();
}
document.getElementById('boldBtn').addEventListener('click', toggleBold);
document.getElementById('mBoldBtn').addEventListener('click', toggleBold);
document.getElementById('italicBtn').addEventListener('click', toggleItalic);
document.getElementById('mItalicBtn').addEventListener('click', toggleItalic);

/* ── Delete ── */
function deleteSelected() {
  if(selectedElement) { selectedElement.remove(); deselectAll(); saveState(); }
}
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
document.getElementById('mDeleteBtn').addEventListener('click', deleteSelected);

/* ── Export ── */
function exportPNG() {
  if(selectedElement) selectedElement.classList.remove('selected');
  html2canvas(mainCanvas, {scale:2, useCORS:true}).then(canvas => {
    const a = document.createElement('a');
    a.download = 'design.png'; a.href = canvas.toDataURL(); a.click();
  });
}
function exportPDF() {
  if(selectedElement) selectedElement.classList.remove('selected');
  html2canvas(mainCanvas, {scale:2, useCORS:true}).then(canvas => {
    const img = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      orientation: mainCanvas.offsetWidth > mainCanvas.offsetHeight ? 'landscape' : 'portrait',
      unit:'px', format:[mainCanvas.offsetWidth, mainCanvas.offsetHeight]
    });
    pdf.addImage(img,'PNG',0,0,mainCanvas.offsetWidth, mainCanvas.offsetHeight);
    pdf.save('design.pdf');
  });
}
document.getElementById('downloadPNG').addEventListener('click', exportPNG);
document.getElementById('downloadPDF').addEventListener('click', exportPDF);
document.getElementById('mDownloadPNG').addEventListener('click', exportPNG);
document.getElementById('mDownloadPDF').addEventListener('click', exportPDF);

/* ── Unsplash Photo Search ── */
const UNSPLASH_KEY = '6qkKLcYIWPr901G4on7wawI_a4tpAW8iAs8GLXukMlI';

async function searchPhotos(query, resultContainer) {
  if(!query) return;
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&client_id=${UNSPLASH_KEY}`);
    const data = await res.json();
    displayPhotos(data.results, resultContainer);
  } catch(e) { console.error(e); }
}

function displayPhotos(photos, container) {
  container.innerHTML='';
  photos.forEach(p => {
    const img = document.createElement('img');
    img.src = p.urls.small;
    img.onclick = () => addStockPhoto(p.urls.regular);
    container.appendChild(img);
  });
}

function addStockPhoto(url) {
  const wrapper = document.createElement('div');
  wrapper.className = 'canvas-element image-element';
  wrapper.style.cssText = 'width:200px; left:20%; top:20%; overflow:hidden;';
  wrapper.dataset.shape = 'square';
  const img = document.createElement('img');
  img.src = url; img.crossOrigin='anonymous';
  img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
  const resizer = document.createElement('div'); resizer.className='resizer';
  wrapper.appendChild(img); wrapper.appendChild(resizer);
  makeDraggable(wrapper); makeResizable(wrapper, resizer);
  attachElementListeners(wrapper);
  mainCanvas.appendChild(wrapper);
  selectElement(wrapper);
  saveState();
}

document.getElementById('searchPhotosBtn').addEventListener('click', () => {
  searchPhotos(document.getElementById('photoSearchInput').value, document.getElementById('photoResults'));
});
document.getElementById('photoSearchInput').addEventListener('keydown', (e) => {
  if(e.key==='Enter') searchPhotos(e.target.value, document.getElementById('photoResults'));
});

document.getElementById('searchPhotosMobile').addEventListener('click', () => {
  searchPhotos(document.getElementById('photoSearchMobile').value, document.getElementById('photoResultsMobile'));
});
document.getElementById('photoSearchMobile').addEventListener('keydown', (e) => {
  if(e.key==='Enter') searchPhotos(e.target.value, document.getElementById('photoResultsMobile'));
});

/* ── Mobile Tab Helper ── */
function switchMobileTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===tabId));
  document.querySelectorAll('.panel-section').forEach(s => s.classList.toggle('active', s.id==='tab-'+tabId));
}
const toggleBtn = document.getElementById("toggleMobileUI");
const mobileUI = document.querySelector(".mobile-ui");

toggleBtn.addEventListener("click", () => {
  mobileUI.classList.toggle("active");

  // icon change ☰ → ✖
  if (mobileUI.classList.contains("active")) {
    toggleBtn.innerHTML = "✖";
  } else {
    toggleBtn.innerHTML = "☰";
  }
});

/* ── Initial canvas size ── */
setCanvasSize("1/1");
