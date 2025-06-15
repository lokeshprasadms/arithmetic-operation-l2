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
    { symbol: '+', func: (a, b) => a + b, weight: 20 },
    { symbol: '-', func: (a, b) => a - b, weight: 20 },
    { symbol: '×', func: (a, b) => a * b, weight: 25 },
    { symbol: '÷', func: (a, b) => a / b, weight: 15 },
    { symbol: '^', func: (a, b) => Math.pow(a, b), weight: 10, maxB: 3 },
    { symbol: '√', func: (a, b) => Math.pow(a, 1/b), weight: 5, maxA: 1000, minB: 2, maxB: 3 },
    { symbol: '%', func: (a, b) => a % b, weight: 5 }
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

// Generate a random number within range, with weighted distribution
function getRandomNumber(min, max, center) {
    // Use normal distribution to get more numbers around the center
    let num;
    do {
        const u = 0.5 - Math.random();
        const v = 0.5 - Math.random();
        num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * 0.2 + 0.5; // Normal distribution
        num = Math.min(Math.max(num, 0), 1); // Clamp between 0 and 1
        num = Math.floor(min + num * (max - min + 1));
    } while (num < min || num > max);
    
    return num;
}

// Generate a math problem
function generateProblem() {
    const operation = getRandomOperation();
    let a, b, result, missingPos, problemStr;
    
    // Special handling for square root
    if (operation.symbol === '√') {
        b = getRandomNumber(operation.minB || 2, operation.maxB || 3); // Root (2 or 3)
        result = getRandomNumber(2, operation.maxA ? Math.min(10, operation.maxA) : 10); // Result (number being rooted)
        a = Math.pow(result, b); // Calculate the radicand
        
        // Randomly decide which part to make missing
        missingPos = Math.floor(Math.random() * 2);
        
        if (missingPos === 0) {
            problemStr = `√<span class="missing">_</span> = ${result}`;
            currentProblem = { a, b, result, operation, missing: 'a' };
        } else {
            problemStr = `√${a} = <span class="missing">_</span>`;
            currentProblem = { a, b, result, operation, missing: 'result' };
        }
    } 
    // Handle exponentiation
    else if (operation.symbol === '^') {
        a = getRandomNumber(2, operation.maxA || 10);
        b = getRandomNumber(2, operation.maxB || 3);
        result = operation.func(a, b);
        
        // Randomly decide which part to make missing
        missingPos = Math.floor(Math.random() * 3);
        
        if (missingPos === 0) {
            problemStr = `<span class="missing">_</span>^${b} = ${result}`;
            currentProblem = { a, b, result, operation, missing: 'a' };
        } else if (missingPos === 1) {
            problemStr = `${a}^<span class="missing">_</span> = ${result}`;
            currentProblem = { a, b, result, operation, missing: 'b' };
        } else {
            problemStr = `${a}^${b} = <span class="missing">_</span>`;
            currentProblem = { a, b, result, operation, missing: 'result' };
        }
    }
    // Handle other operations
    else {
        // For division, ensure clean division
        if (operation.symbol === '÷') {
            b = getRandomNumber(1, 12);
            result = getRandomNumber(1, 20);
            a = b * result;
        } 
        // For modulo, ensure positive results
        else if (operation.symbol === '%') {
            b = getRandomNumber(2, 20);
            result = getRandomNumber(0, b - 1);
            const multiplier = getRandomNumber(1, 10);
            a = b * multiplier + result;
        }
        // For other operations
        else {
            a = getRandomNumber(1, 100);
            b = getRandomNumber(1, 100);
            result = operation.func(a, b);
            
            // Ensure positive results for subtraction
            if (operation.symbol === '-' && result < 0) {
                [a, b] = [b, a]; // Swap to ensure positive result
                result = a - b;
            }
        }
        
        // Randomly decide which part to make missing
        missingPos = Math.floor(Math.random() * 3);
        
        if (missingPos === 0) {
            problemStr = `<span class="missing">_</span> ${operation.symbol} ${b} = ${result}`;
            currentProblem = { a, b, result, operation, missing: 'a' };
        } else if (missingPos === 1) {
            problemStr = `${a} ${operation.symbol} <span class="missing">_</span> = ${result}`;
            currentProblem = { a, b, result, operation, missing: 'b' };
        } else {
            problemStr = `${a} ${operation.symbol} ${b} = <span class="missing">_</span>`;
            currentProblem = { a, b, result, operation, missing: 'result' };
        }
    }
    
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
    
    const userAnswer = parseFloat(answerInput.value);
    if (isNaN(userAnswer)) {
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
    }
    
    // Special handling for floating point comparison
    isCorrect = Math.abs(userAnswer - correctAnswer) < 0.0001;
    
    if (isCorrect) {
        score += 10;
        correctAnswers++;
        showFeedback('Correct!', 'correct');
    } else {
        incorrectAnswers++;
        showFeedback(`Incorrect. The answer was ${correctAnswer}`, 'incorrect');
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
