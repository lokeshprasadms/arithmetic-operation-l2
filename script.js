// Game State
let score = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let timeLeft = 60;
let timer;
let currentProblem = null;
let gameActive = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const answerInput = document.getElementById('answer');
const problemElement = document.getElementById('problem');
const feedbackElement = document.getElementById('feedback');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const correctElement = document.getElementById('correct');
const incorrectElement = document.getElementById('incorrect');
const accuracyElement = document.getElementById('accuracy');
const finalScoreElement = document.getElementById('final-score');
const finalAccuracyElement = document.getElementById('final-accuracy');

// Operations with weights for probability distribution
const operations = [
    { 
        symbol: '+', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `<span class="missing">_</span> + ${b} = ${result}`;
            if (missing === 'b') return `${a} + <span class="missing">_</span> = ${result}`;
            return `${a} + ${b} = <span class="missing">_</span>`;
        },
        func: (a, b) => a + b, 
        weight: 20,
        generate: () => {
            const a = Math.floor(Math.random() * 50) + 1;
            const b = Math.floor(Math.random() * 50) + 1;
            return { a, b, result: a + b };
        }
    },
    { 
        symbol: '-', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `<span class="missing">_</span> - ${b} = ${result}`;
            if (missing === 'b') return `${a} - <span class="missing">_</span> = ${result}`;
            return `${a} - ${b} = <span class="missing">_</span>`;
        },
        func: (a, b) => a - b, 
        weight: 20,
        generate: () => {
            const a = Math.floor(Math.random() * 100) + 1;
            const b = Math.floor(Math.random() * a) + 1;
            return { a, b, result: a - b };
        }
    },
    { 
        symbol: '×', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `<span class="missing">_</span> × ${b} = ${result}`;
            if (missing === 'b') return `${a} × <span class="missing">_</span> = ${result}`;
            return `${a} × ${b} = <span class="missing">_</span>`;
        },
        func: (a, b) => a * b, 
        weight: 25,
        generate: () => {
            const a = Math.floor(Math.random() * 12) + 1;
            const b = Math.floor(Math.random() * 12) + 1;
            return { a, b, result: a * b };
        }
    },
    { 
        symbol: '÷', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `<span class="missing">_</span> ÷ ${b} = ${result}`;
            if (missing === 'b') return `${a} ÷ <span class="missing">_</span> = ${result}`;
            return `${a} ÷ ${b} = <span class="missing">_</span>`;
        },
        func: (a, b) => a / b, 
        weight: 15,
        generate: () => {
            const b = Math.floor(Math.random() * 10) + 1;
            const result = Math.floor(Math.random() * 10) + 1;
            const a = b * result;
            return { a, b, result };
        }
    },
    { 
        symbol: '^', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `<span class="missing">_</span>^${b} = ${result}`;
            if (missing === 'b') return `${a}^<span class="missing">_</span> = ${result}`;
            return `${a}^${b} = <span class="missing">_</span>`;
        },
        func: (a, b) => Math.pow(a, b), 
        weight: 10,
        generate: () => {
            const a = Math.floor(Math.random() * 5) + 2; // Base 2-6
            const b = Math.floor(Math.random() * 3) + 2; // Power 2-4
            return { a, b, result: Math.pow(a, b) };
        }
    },
    { 
        symbol: '√', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `√<span class="missing">_</span> = ${result}`;
            return `√${a} = <span class="missing">_</span>`;
        },
        func: (a, b) => Math.pow(a, 1/b), 
        weight: 5,
        generate: () => {
            const b = 2; // Only square roots for now
            const result = Math.floor(Math.random() * 10) + 1; // 1-10
            const a = Math.pow(result, b);
            return { a, b, result };
        }
    },
    { 
        symbol: '%', 
        display: (a, b, result, missing) => {
            if (missing === 'a') return `<span class="missing">_</span> % ${b} = ${result}`;
            if (missing === 'b') return `${a} % <span class="missing">_</span> = ${result}`;
            return `${a} % ${b} = <span class="missing">_</span>`;
        },
        func: (a, b) => a % b, 
        weight: 5,
        generate: () => {
            const b = Math.floor(Math.random() * 10) + 2; // 2-11
            const result = Math.floor(Math.random() * b); // 0 to b-1
            const a = b * (Math.floor(Math.random() * 10) + 1) + result; // Ensure clean modulo
            return { a, b, result };
        }
    }
];

// Get random operation based on weights
function getRandomOperation() {
    const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const op of operations) {
        if (random < op.weight) return op;
        random -= op.weight;
    }
    return operations[0];
}

// Generate a math problem
function generateProblem() {
    const operation = getRandomOperation();
    let { a, b, result } = operation.generate();
    let missingPos, missing;
    
    // Randomly decide which part to make missing (0: a, 1: b, 2: result)
    missingPos = Math.floor(Math.random() * 3);
    
    // Determine which part is missing
    if (missingPos === 0) missing = 'a';
    else if (missingPos === 1) missing = 'b';
    else missing = 'result';
    
    // Generate the problem string using the operation's display function
    const problemStr = operation.display(a, b, result, missing);
    
    // Set up the current problem
    currentProblem = { a, b, result, operation, missing };
    
    problemElement.innerHTML = problemStr;
    answerInput.value = '';
    answerInput.focus();
    
    // Update time display when low
    if (timeLeft <= 10) {
        timeElement.classList.add('time-warning');
    }
    
    return currentProblem;
}

// Check answer
function checkAnswer() {
    if (!gameActive) return;
    
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) {
        showFeedback('Please enter an answer', 'incorrect');
        return;
    }
    
    const userNum = parseFloat(userAnswer);
    if (isNaN(userNum)) {
        showFeedback('Please enter a valid number', 'incorrect');
        return;
    }
    
    const { a, b, result, operation, missing } = currentProblem;
    let correctAnswer, isCorrect;
    
    // Calculate the correct answer based on what's missing
    switch (missing) {
        case 'a':
            correctAnswer = a;
            break;
        case 'b':
            correctAnswer = b;
            break;
        case 'result':
            correctAnswer = result;
            break;
        default:
            correctAnswer = result;
    }
    
    // Handle floating point comparison with tolerance
    const tolerance = 0.0001;
    isCorrect = Math.abs(userNum - correctAnswer) < tolerance;
    
    // For modulo operations, also accept equivalent answers
    if (operation.symbol === '%' && !isCorrect) {
        const modResult = correctAnswer % 1 === 0 ? Math.round(userNum) % b : userNum % b;
        isCorrect = Math.abs(modResult - correctAnswer) < tolerance;
    }
    
    if (isCorrect) {
        score += 10;
        correctAnswers++;
        showFeedback('Correct!', 'correct');
    } else {
        // For division, show fraction if answer is close to a fraction
        let correctAnswerStr = correctAnswer.toString();
        if (operation.symbol === '÷' && !Number.isInteger(correctAnswer)) {
            const [whole, decimal] = correctAnswer.toString().split('.');
            if (decimal && decimal.length > 2) {
                correctAnswerStr = correctAnswer.toFixed(2);
            }
        }
        incorrectAnswers++;
        showFeedback(`Incorrect. The answer was ${correctAnswerStr}`, 'incorrect');
    }
    
    // Update score display
    updateScore();
    
    // Generate new problem after a short delay
    setTimeout(generateProblem, 1500);
}

// Show feedback to user
function showFeedback(message, type) {
    feedbackElement.textContent = message;
    feedbackElement.className = 'feedback ' + type;
    
    // Clear feedback after delay
    setTimeout(() => {
        feedbackElement.textContent = '';
        feedbackElement.className = 'feedback';
    }, 1500);
}

// Update score display
function updateScore() {
    scoreElement.textContent = score;
    correctElement.textContent = correctAnswers;
    incorrectElement.textContent = incorrectAnswers;
    
    const total = correctAnswers + incorrectAnswers;
    const accuracy = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    accuracyElement.textContent = accuracy;
}

// Timer function
function updateTimer() {
    timeLeft--;
    timeElement.textContent = timeLeft;
    
    if (timeLeft <= 10) {
        timeElement.classList.add('time-warning');
    }
    
    if (timeLeft <= 0) {
        endGame();
    }
}

// Start the game
function startGame() {
    // Reset game state
    score = 0;
    correctAnswers = 0;
    incorrectAnswers = 0;
    timeLeft = 60;
    gameActive = true;
    
    // Update UI
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    timeElement.classList.remove('time-warning');
    
    // Start timer
    clearInterval(timer);
    timer = setInterval(updateTimer, 1000);
    
    // Generate first problem
    generateProblem();
    updateScore();
}

// End the game
function endGame() {
    gameActive = false;
    clearInterval(timer);
    
    // Calculate final stats
    const total = correctAnswers + incorrectAnswers;
    const accuracy = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    
    // Update final score display
    finalScoreElement.textContent = score;
    finalAccuracyElement.textContent = accuracy;
    
    // Show result screen
    gameScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', checkAnswer);

// Allow pressing Enter to submit
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// Prevent form submission on Enter
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target === answerInput) {
        e.preventDefault();
    }
});

// Focus the answer input when the game screen is shown
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && gameActive) {
        answerInput.focus();
    }
});


