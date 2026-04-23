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

// LocalStorage වලට design එක save කිරීම
function autoSave() {
    const designData = {
        html: mainCanvas.innerHTML,
        bg: mainCanvas.style.backgroundImage,
        ratio: mainCanvas.style.aspectRatio || "1/1"
    };
    localStorage.setItem('quoteProDesign', JSON.stringify(designData));
}

// Page එක load වෙද්දී පරණ design එක ගැනීම
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

// New Design Button
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

        // --- Snap to Center Logic ---
        const canvasWidth = mainCanvas.offsetWidth;
        const canvasHeight = mainCanvas.offsetHeight;
        const elWidth = el.offsetWidth;
        const elHeight = el.offsetHeight;

        const elCenterH = newLeft + (elWidth / 2);
        const elCenterV = newTop + (elHeight / 2);
        const canvasCenterH = canvasWidth / 2;
        const canvasCenterV = canvasHeight / 2;

        // Vertical Guide (X-axis snap)
        if (Math.abs(elCenterH - canvasCenterH) < 10) {
            newLeft = canvasCenterH - (elWidth / 2);
            guideX.style.display = 'block';
        } else {
            guideX.style.display = 'none';
        }

        // Horizontal Guide (Y-axis snap)
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

// --- 4. HISTORY & CORE (Keep existing logic with autoSave call) ---

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
            if(resizer) makeResizable(el, resizer);
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

bgUpload.addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        mainCanvas.style.backgroundImage = `url(${event.target.result})`;
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

elementUpload.addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-element image-element';
        wrapper.style.width = '150px';
        wrapper.style.left = '50%';
        wrapper.style.top = '50%';
        const img = document.createElement('img');
        img.src = event.target.result;
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
});

function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    selectedElement.classList.add('selected');
    document.querySelector('.hint').style.display = 'none';
    if (el.classList.contains('text-element')) {
        document.getElementById('textControls').className = 'controls-active';
        document.getElementById('imageControls').className = 'controls-hidden';
    } else {
        document.getElementById('imageControls').className = 'controls-active';
        document.getElementById('textControls').className = 'controls-hidden';
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

function makeResizable(el, resizer) {
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    });
    function resize(e) {
        const width = e.pageX - el.getBoundingClientRect().left;
        if (width > 30) el.style.width = width + 'px';
    }
    function stopResize() {
        window.removeEventListener('mousemove', resize);
        saveState();
    }
}

// Style Listeners (Briefly)
document.getElementById('fontFamily').addEventListener('change', (e) => { if(selectedElement) {selectedElement.style.fontFamily = e.target.value; saveState();} });
document.getElementById('fontSize').addEventListener('input', (e) => { if(selectedElement) selectedElement.style.fontSize = e.target.value + 'px'; });
document.getElementById('fontSize').addEventListener('change', () => saveState());
document.getElementById('textColor').addEventListener('input', (e) => { if(selectedElement) selectedElement.style.color = e.target.value; });
document.getElementById('textColor').addEventListener('change', () => saveState());
document.getElementById('elOpacity').addEventListener('input', (e) => { if(selectedElement) selectedElement.style.opacity = e.target.value; });
document.getElementById('elOpacity').addEventListener('change', () => saveState());

document.getElementById('deleteBtn').addEventListener('click', () => {
    if(selectedElement) {
        selectedElement.remove();
        selectedElement = null;
        saveState();
    }
});

// PNG/PDF Exports (Same as before)
document.getElementById('downloadPNG').addEventListener('click', () => {
    if (selectedElement) selectedElement.classList.remove('selected');
    html2canvas(mainCanvas, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'design.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});

function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb;
    const vals = rgb.match(/\d+/g);
    return "#" + vals.map(x => parseInt(x).toString(16).padStart(2, '0')).join("");
}

const photoSearchInput = document.getElementById('photoSearchInput');
const searchPhotosBtn = document.getElementById('searchPhotosBtn');
const photoResults = document.getElementById('photoResults');

// Unsplash API එකෙන් ලබාගත් Access Key එක මෙතනට දාන්න
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
    photoResults.innerHTML = ''; // පරණ රිසල්ට් මකනවා
    
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.urls.small; // කුඩා රූපය පෙන්වීමට
        img.style.width = '100%';
        img.style.cursor = 'pointer';
        img.style.borderRadius = '5px';
        
        // ඉමේජ් එක ක්ලික් කළාම කැන්වසයට එකතු කිරීම
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

    const img = document.createElement('img');
    img.src = imageUrl;
    img.crossOrigin = "anonymous"; // මේක වැදගත් (Export කරද්දී ප්‍රශ්න නොවෙන්න)
    
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