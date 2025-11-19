const NOTE_COLORS = [
    { note: "DÓ", colorName: "Roxo", hex: "#8a2be2", keyIndex: 0 },
    { note: "RÉ", colorName: "Azul Claro", hex: "#add8e6", keyIndex: 1 },
    { note: "MI", colorName: "Rosa/Salmão", hex: "#fa8072", keyIndex: 2 },
    { note: "FÁ", colorName: "Verde", hex: "#008000", keyIndex: 3 },
    { note: "SOL", colorName: "Amarelo", hex: "#ffff00", keyIndex: 4 },
    { note: "LÁ", colorName: "Laranja", hex: "#ffa500", keyIndex: 5 },
    { note: "SI", colorName: "Vermelho", hex: "#ff0000", keyIndex: 6 }
];

let score = 0;
let currentCorrectNote = null;
let noteBag = [];

// --- ELEMENTOS DO DOM ---
const currentNoteEl = document.getElementById('current-note');
const colorOptionsEl = document.getElementById('color-options');
const feedbackMessageEl = document.getElementById('feedback-message');
const nextNoteButton = document.getElementById('next-note-button');
const scoreTextEl = document.getElementById('score-text');

// --- CONFIGURAÇÃO DO CANVAS ---
const canvas = document.getElementById('piano-canvas');
const ctx = canvas.getContext('2d');
const pianoBaseImage = new Image();
pianoBaseImage.src = 'piano_base.png';

// ==================================================================
// 📐 DADOS CANÔNICOS SIMPLIFICADOS (ESTÁVEIS)
// ==================================================================
const PIANO_KEY_VERTICES = [
    // Key 0 (DÓ): 6 pontos (Corte à direita)
    [[15, 195], [80, 195], [80, 130], [65, 130], [65, 12], [15, 12]],
    
    // Key 1 (RÉ): 8 pontos (Corte dos dois lados)
    [[88, 195], [155, 195], [155, 130], [135, 130], [135, 12], [105, 12], [105, 130], [88, 130]],
    
    // Key 2 (MI): 4 pontos (Sem corte - Retângulo)
    [[162, 195], [228, 195], [228, 10], [162, 10]],
    
    // Key 3 (FÁ): 6 pontos (Corte à direita)
    [[232, 195], [298, 195], [298, 130], [275, 130], [275, 12], [232, 12]],
    
    // Key 4 (SOL): 8 pontos (Corte dos dois lados)
    [[308, 195], [373, 195], [373, 130], [350, 130], [350, 12], [320, 12], [320, 130], [308, 130]],
    
    // Key 5 (LÁ): 8 pontos (Corte dos dois lados)
    [[380, 195], [447, 195], [447, 130], [425, 130], [425, 12], [395, 12], [395, 130], [380, 130]],
    
    // Key 6 (SI): 6 pontos (Corte à esquerda)
    [[453, 195], [519, 195], [519, 10], [475, 10], [475, 130], [453, 130]]
];

const keyPaths = []; 
let pianoReady = false;
let allKeyPathsInitialized = false;

// --- FUNÇÃO PARA INICIALIZAR PATH2D (ALTA PERFORMANCE) ---
function initKeyPaths() {
    PIANO_KEY_VERTICES.forEach(vertices => {
        const path = new Path2D();
        
        path.moveTo(vertices[0][0], vertices[0][1]);
        
        for (let i = 1; i < vertices.length; i++) {
            path.lineTo(vertices[i][0], vertices[i][1]);
        }
        path.closePath(); 
        
        keyPaths.push(path);
    });
    allKeyPathsInitialized = true;
}


pianoBaseImage.onload = () => {
    pianoReady = true;
    initKeyPaths();
    startNewRound();
};

pianoBaseImage.onerror = () => {
    console.error("Erro ao carregar piano_base.png. Jogo pode não exibir o piano.");
    pianoReady = false; 
    initKeyPaths();
    startNewRound(); 
};

// --- FUNÇÃO DE DESENHO COM MÁSCARA ---
function drawPiano(keyIndexToHighlight, revealColor = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Desenha a imagem base do piano COMPLETO
    if (pianoReady) {
        ctx.drawImage(pianoBaseImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ccc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Aplica o Path2D pré-calculado
    if (keyIndexToHighlight !== null && allKeyPathsInitialized) {
        const currentKeyPath = keyPaths[keyIndexToHighlight];

        ctx.save(); 
        
        // Define o Path como uma Máscara (corte preciso)
        ctx.clip(currentKeyPath);

        // Define a cor
        if (revealColor) {
            ctx.fillStyle = NOTE_COLORS[keyIndexToHighlight].hex; 
        } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
        }
        
        // Preenche o Canvas (somente dentro da Máscara)
        ctx.fillRect(0, 0, canvas.width, canvas.height); 

        ctx.restore(); 

        // Desenha a borda (se acertou)
        if (revealColor) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.stroke(currentKeyPath); 
        }
    }
}


// --- SISTEMA DE BARALHO (MANTIDO) ---
function getNextNoteWithoutRepetition() {
    if (noteBag.length === 0) {
        noteBag = [...NOTE_COLORS];
        for (let i = noteBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [noteBag[i], noteBag[j]] = [noteBag[j], noteBag[i]];
        }
        if (currentCorrectNote && noteBag[noteBag.length - 1].note === currentCorrectNote.note) {
            const last = noteBag.pop();
            noteBag.unshift(last);
        }
    }
    return noteBag.pop();
}

// --- LÓGICA DO JOGO (MANTIDA) ---
function getRandomNotesForButtons(count, excludeNote = null) {
    let availableNotes = NOTE_COLORS.filter(n => n.note !== excludeNote);
    if (availableNotes.length < count) availableNotes = NOTE_COLORS;
    for (let i = availableNotes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableNotes[i], availableNotes[j]] = [availableNotes[j], availableNotes[i]];
    }
    return availableNotes.slice(0, count);
}

function startNewRound() {
    currentNoteEl.classList.remove('note-error', 'note-correct');
    colorOptionsEl.innerHTML = '';
    feedbackMessageEl.textContent = '';
    nextNoteButton.style.display = 'none';
    nextNoteButton.classList.remove('next-button-animate');
    currentNoteEl.classList.remove('note-show'); 

    currentCorrectNote = getNextNoteWithoutRepetition();
    
    if (pianoReady) {
        drawPiano(currentCorrectNote.keyIndex, false); 
    } else {
        drawPiano(null); 
    }

    currentNoteEl.textContent = currentCorrectNote.note;
    setTimeout(() => {
        currentNoteEl.classList.add('note-show');
    }, 50);

    const correctOption = currentCorrectNote;
    const incorrectOptions = getRandomNotesForButtons(3, correctOption.note);
    let options = [correctOption, ...incorrectOptions];

    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'color-button';
        button.style.backgroundColor = option.hex;
        button.style.animationDelay = `${index * 0.1}s`;
        button.dataset.note = option.note;
        button.addEventListener('click', handleAnswer);
        colorOptionsEl.appendChild(button);
    });
}

function handleAnswer(event) {
    Array.from(colorOptionsEl.children).forEach(button => {
        button.removeEventListener('click', handleAnswer);
    });
    const selectedNote = event.target.dataset.note;

    if (selectedNote === currentCorrectNote.note) {
        feedbackMessageEl.textContent = "Correto! 🎉";
        feedbackMessageEl.style.color = 'green';
        currentNoteEl.classList.add('note-correct');
        event.target.style.boxShadow = '0 0 15px 5px gold';
        score++;
        if(pianoReady) {
            drawPiano(currentCorrectNote.keyIndex, true); 
        }
    } else {
        feedbackMessageEl.textContent = "Tente Novamente! 😔";
        currentNoteEl.classList.add('note-error');
        Array.from(colorOptionsEl.children).forEach(button => {
            if (button.dataset.note === currentCorrectNote.note) {
                button.style.border = '6px dashed green';
            }
        });
    }
    scoreTextEl.textContent = `Pontuação: ${score}`;
    nextNoteButton.style.display = 'block';
    nextNoteButton.classList.add('next-button-animate');
}

nextNoteButton.addEventListener('click', startNewRound);