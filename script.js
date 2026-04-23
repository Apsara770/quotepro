const mainCanvas = document.getElementById('mainCanvas');
const bgUpload = document.getElementById('bgUpload');
const elementUpload = document.getElementById('elementUpload');
const addTextBtn = document.getElementById('addTextBtn');
const guideX = document.getElementById('guide-x');
const guideY = document.getElementById('guide-y');

let selectedElement = null;
let history = [];
let historyStep = -1;

// --- 1. AUTO-SAVE & NEW DESIGN LOGIC ---

function autoSave() {
    const designData = {
        html: mainCanvas.innerHTML,
        bg: mainCanvas.style.backgroundImage,
        ratio: mainCanvas.style.aspectRatio || "1/1"
    };
    localStorage.setItem('quoteProDesign', JSON.stringify(designData));
}

window.onload = () => {
    const saved = localStorage.getItem('quoteProDesign');
    if (saved) {
        const data = JSON.parse(saved);
        mainCanvas.innerHTML = data.html;
        mainCanvas.style.backgroundImage = data.bg;
        mainCanvas.style.aspectRatio = data.ratio;
        setCanvasSize(data.ratio);
        reAttachEvents();
    }
    saveState();
};

document.getElementById('newDesignBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to start a new design? Current progress will be lost.")) {
        mainCanvas.innerHTML = "";
        mainCanvas.style.backgroundImage = "";
        localStorage.removeItem('quoteProDesign');
        history = [];
        historyStep = -1;
        saveState();
    }
});

// --- 2. ASPECT RATIO LOGIC ---
document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const ratio = btn.dataset.ratio;
        document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setCanvasSize(ratio);
        saveState();
    });
});

function setCanvasSize(ratio) {
    mainCanvas.style.aspectRatio = ratio;
    if (ratio === "1/1") {
        mainCanvas.style.width = "600px";
        mainCanvas.style.height = "600px";
    } else if (ratio === "9/16") {
        mainCanvas.style.width = "337px";
        mainCanvas.style.height = "600px";
    } else if (ratio === "16/9") {
        mainCanvas.style.width = "600px";
        mainCanvas.style.height = "337px";
    }
    autoSave();
}

// --- 3. SMART GUIDES & DRAGGING ---
function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragStart;
    el.ontouchstart = dragStart;

    function dragStart(e) {
        if (el.contentEditable === "true" || e.target.className === 'resizer') return;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        pos3 = clientX; pos4 = clientY;

        if (e.type === 'mousedown') {
            document.onmouseup = dragEnd;
            document.onmousemove = dragMove;
        } else {
            document.ontouchend = dragEnd;
            document.ontouchmove = dragMove;
        }
    }

    function dragMove(e) {
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;

        let newTop = el.offsetTop - pos2;
        let newLeft = el.offsetLeft - pos1;

        const canvasWidth = mainCanvas.offsetWidth;
        const canvasHeight = mainCanvas.offsetHeight;
        const elWidth = el.offsetWidth;
        const elHeight = el.offsetHeight;

        const elCenterH = newLeft + (elWidth / 2);
        const elCenterV = newTop + (elHeight / 2);
        const canvasCenterH = canvasWidth / 2;
        const canvasCenterV = canvasHeight / 2;

        if (Math.abs(elCenterH - canvasCenterH) < 10) {
            newLeft = canvasCenterH - (elWidth / 2);
            guideX.style.display = 'block';
        } else {
            guideX.style.display = 'none';
        }

        if (Math.abs(elCenterV - canvasCenterV) < 10) {
            newTop = canvasCenterV - (elHeight / 2);
            guideY.style.display = 'block';
        } else {
            guideY.style.display = 'none';
        }

        el.style.top = newTop + "px";
        el.style.left = newLeft + "px";
    }

    function dragEnd() {
        document.onmouseup = null; document.onmousemove = null;
        document.ontouchend = null; document.ontouchmove = null;
        guideX.style.display = 'none';
        guideY.style.display = 'none';
        saveState();
    }
}

// --- 4. HISTORY ---

function saveState() {
    historyStep++;
    if (historyStep < history.length) history.length = historyStep;
    history.push(mainCanvas.innerHTML);
    autoSave();
}

function reAttachEvents() {
    const elements = mainCanvas.querySelectorAll('.canvas-element');
    elements.forEach(el => {
        makeDraggable(el);
        attachElementListeners(el);
        if (el.classList.contains('image-element')) {
            const resizer = el.querySelector('.resizer');
            if (resizer) makeResizable(el, resizer);
        }
    });
}

document.getElementById('undoBtn').addEventListener('click', () => {
    if (historyStep > 0) {
        historyStep--;
        mainCanvas.innerHTML = history[historyStep];
        reAttachEvents();
    }
});

document.getElementById('redoBtn').addEventListener('click', () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        mainCanvas.innerHTML = history[historyStep];
        reAttachEvents();
    }
});

bgUpload.addEventListener('change', function (e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        mainCanvas.style.backgroundImage = `url(${event.target.result})`;
        mainCanvas.style.backgroundSize = 'cover';
        mainCanvas.style.backgroundPosition = 'center';
        saveState();
    };
    reader.readAsDataURL(e.target.files[0]);
});

addTextBtn.addEventListener('click', () => {
    const textEl = document.createElement('div');
    textEl.className = 'canvas-element text-element';
    textEl.innerText = 'New Text';
    textEl.style.left = '50%';
    textEl.style.top = '50%';
    textEl.style.fontSize = '30px';
    textEl.style.color = '#ffffff';
    textEl.style.fontFamily = 'Arial';
    makeDraggable(textEl);
    attachElementListeners(textEl);
    mainCanvas.appendChild(textEl);
    selectElement(textEl);
    saveState();
});

// --- 5. IMAGE / LOGO UPLOAD (small default + size slider + shapes) ---
elementUpload.addEventListener('change', function (e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-element image-element';
        // ✅ Default size කුඩාව (80px)
        wrapper.style.width = '80px';
        wrapper.style.left = '50%';
        wrapper.style.top = '50%';
        wrapper.style.overflow = 'hidden';

        const img = document.createElement('img');
        img.src = event.target.result;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';

        const resizer = document.createElement('div');
        resizer.className = 'resizer';

        wrapper.appendChild(img);
        wrapper.appendChild(resizer);
        makeDraggable(wrapper);
        makeResizable(wrapper, resizer);
        attachElementListeners(wrapper);
        mainCanvas.appendChild(wrapper);
        selectElement(wrapper);
        saveState();
    };
    reader.readAsDataURL(e.target.files[0]);
    // File input reset (same file re-upload allow)
    e.target.value = '';
});

// --- 6. SELECT ELEMENT & SHOW CONTROLS ---
function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    selectedElement.classList.add('selected');
    document.querySelector('.hint').style.display = 'none';

    if (el.classList.contains('text-element')) {
        document.getElementById('textControls').className = 'controls-hidden visible';
        document.getElementById('imageControls').className = 'controls-hidden';
    } else {
        document.getElementById('imageControls').className = 'controls-hidden visible';
        document.getElementById('textControls').className = 'controls-hidden';

        // ✅ Size slider sync: selected image එකේ current width show කරනවා
        const currentWidth = parseInt(el.style.width) || 80;
        document.getElementById('logoSize').value = currentWidth;
        document.getElementById('logoSizeValue').textContent = currentWidth + 'px';

        // Opacity sync
        document.getElementById('elOpacity').value = el.style.opacity || 1;
    }
}

function attachElementListeners(el) {
    el.addEventListener('mousedown', () => selectElement(el));
    el.addEventListener('dblclick', () => {
        if (el.classList.contains('text-element')) {
            el.contentEditable = "true";
            el.focus();
        }
    });
    el.addEventListener('blur', () => {
        el.contentEditable = "false";
        saveState();
    });
}

// Click on canvas background = deselect
mainCanvas.addEventListener('mousedown', (e) => {
    if (e.target === mainCanvas) {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            selectedElement = null;
            document.querySelector('.hint').style.display = '';
            document.getElementById('textControls').className = 'controls-hidden';
            document.getElementById('imageControls').className = 'controls-hidden';
        }
    }
});

function makeResizable(el, resizer) {
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    });
    function resize(e) {
        const width = e.pageX - el.getBoundingClientRect().left;
        if (width > 20) {
            el.style.width = width + 'px';
            el.style.height = width + 'px'; // Square/Circle maintain aspect
            // ✅ Slider sync while resizing
            if (selectedElement === el) {
                document.getElementById('logoSize').value = width;
                document.getElementById('logoSizeValue').textContent = Math.round(width) + 'px';
            }
        }
    }
    function stopResize() {
        window.removeEventListener('mousemove', resize);
        saveState();
    }
}

// --- 7. LOGO SIZE SLIDER ---
const logoSizeSlider = document.getElementById('logoSize');
const logoSizeValue = document.getElementById('logoSizeValue');

if (logoSizeSlider) {
    logoSizeSlider.addEventListener('input', (e) => {
        if (selectedElement && selectedElement.classList.contains('image-element')) {
            const size = e.target.value;
            selectedElement.style.width = size + 'px';
            // Height: only set if circle/oval shape (maintain ratio)
            const shape = selectedElement.dataset.shape;
            if (shape === 'circle') {
                selectedElement.style.height = size + 'px';
            } else if (shape === 'oval') {
                selectedElement.style.height = Math.round(size * 0.6) + 'px';
            }
            logoSizeValue.textContent = size + 'px';
        }
    });
    logoSizeSlider.addEventListener('change', () => saveState());
}

// --- 8. SHAPE BUTTONS (Square / Circle / Oval) ---
document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!selectedElement || !selectedElement.classList.contains('image-element')) return;

        const shape = btn.dataset.shape;
        selectedElement.dataset.shape = shape;
        const currentWidth = parseInt(selectedElement.style.width) || 80;

        // Reset
        selectedElement.style.borderRadius = '0';
        selectedElement.style.height = '';

        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (shape === 'circle') {
            selectedElement.style.height = currentWidth + 'px';
            selectedElement.style.borderRadius = '50%';
        } else if (shape === 'oval') {
            selectedElement.style.height = Math.round(currentWidth * 0.6) + 'px';
            selectedElement.style.borderRadius = '50%';
        } else {
            // Square - no rounding
            selectedElement.style.height = '';
            selectedElement.style.borderRadius = '0';
        }

        saveState();
    });
});

// --- 9. TEXT STYLE LISTENERS ---
document.getElementById('fontFamily').addEventListener('change', (e) => {
    if (selectedElement) { selectedElement.style.fontFamily = e.target.value; saveState(); }
});
document.getElementById('fontSize').addEventListener('input', (e) => {
    if (selectedElement) selectedElement.style.fontSize = e.target.value + 'px';
});
document.getElementById('fontSize').addEventListener('change', () => saveState());
document.getElementById('textColor').addEventListener('input', (e) => {
    if (selectedElement) selectedElement.style.color = e.target.value;
});
document.getElementById('textColor').addEventListener('change', () => saveState());
document.getElementById('elOpacity').addEventListener('input', (e) => {
    if (selectedElement) selectedElement.style.opacity = e.target.value;
});
document.getElementById('elOpacity').addEventListener('change', () => saveState());

// Bold / Italic
document.getElementById('boldBtn').addEventListener('click', () => {
    if (selectedElement) {
        selectedElement.style.fontWeight = selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold';
        saveState();
    }
});
document.getElementById('italicBtn').addEventListener('click', () => {
    if (selectedElement) {
        selectedElement.style.fontStyle = selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic';
        saveState();
    }
});

// --- 10. DELETE ---
document.getElementById('deleteBtn').addEventListener('click', () => {
    if (selectedElement) {
        selectedElement.remove();
        selectedElement = null;
        saveState();
    }
});

// --- 11. EXPORT ---
document.getElementById('downloadPNG').addEventListener('click', () => {
    if (selectedElement) selectedElement.classList.remove('selected');
    html2canvas(mainCanvas, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'design.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});

document.getElementById('downloadPDF').addEventListener('click', () => {
    if (selectedElement) selectedElement.classList.remove('selected');
    html2canvas(mainCanvas, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({
            orientation: mainCanvas.offsetWidth > mainCanvas.offsetHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [mainCanvas.offsetWidth, mainCanvas.offsetHeight]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, mainCanvas.offsetWidth, mainCanvas.offsetHeight);
        pdf.save('design.pdf');
    });
});

// --- 12. UNSPLASH STOCK PHOTOS ---
const photoSearchInput = document.getElementById('photoSearchInput');
const searchPhotosBtn = document.getElementById('searchPhotosBtn');
const photoResults = document.getElementById('photoResults');

const UNSPLASH_KEY = '6qkKLcYIWPr901G4on7wawI_a4tpAW8iAs8GLXukMlI';

searchPhotosBtn.addEventListener('click', async () => {
    const query = photoSearchInput.value;
    if (!query) return;
    searchPhotosBtn.innerText = "Searching...";
    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=10&client_id=${UNSPLASH_KEY}`);
        const data = await response.json();
        displayPhotos(data.results);
    } catch (error) {
        console.error("Error fetching photos:", error);
        alert("Failed to load photos. Please check your API key.");
    } finally {
        searchPhotosBtn.innerText = "Search";
    }
});

function displayPhotos(photos) {
    photoResults.innerHTML = '';
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.urls.small;
        img.style.width = '100%';
        img.style.cursor = 'pointer';
        img.style.borderRadius = '5px';
        img.onclick = () => addStockPhotoToCanvas(photo.urls.regular);
        photoResults.appendChild(img);
    });
}

function addStockPhotoToCanvas(imageUrl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-element image-element';
    wrapper.style.width = '200px';
    wrapper.style.left = '50%';
    wrapper.style.top = '50%';
    wrapper.style.overflow = 'hidden';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.crossOrigin = "anonymous";
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';

    const resizer = document.createElement('div');
    resizer.className = 'resizer';

    wrapper.appendChild(img);
    wrapper.appendChild(resizer);

    makeDraggable(wrapper);
    makeResizable(wrapper, resizer);
    attachElementListeners(wrapper);

    mainCanvas.appendChild(wrapper);
    selectElement(wrapper);
    saveState();
}
