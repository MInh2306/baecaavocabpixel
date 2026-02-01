// Global variables để lưu trữ dữ liệu
let currentQuestions = [];
let currentAnswers = {};
let timerInterval = null;
let timeRemaining = 0;
let currentQuizType = 'multiple';
let currentJsonData = null;

/**
 * Switch giữa các tabs trong Screen 1
 */
function switchTab(tabName) {
    // Ẩn tất cả tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tabs .nes-btn').forEach(btn => {
        btn.classList.remove('is-primary');
    });

    // Hiển thị tab được chọn
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Add active class to clicked button
    const clickedBtn = document.getElementById(`tab-${tabName}-btn`);
    if (clickedBtn) {
        clickedBtn.classList.add('is-primary');
    }
}

/**
 * Hiển thị error message với NES style
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.className = 'nes-container is-error error';
    errorDiv.textContent = message;
}

/**
 * Clear error message
 */
function clearError() {
    document.getElementById('error-message').innerHTML = '';
}

/**
 * Validate và load JSON file
 */
async function loadJsonFile() {
    clearError();
    const fileInput = document.getElementById('jsonFile');
    const file = fileInput.files[0];

    if (!file) {
        showError('Vui lòng chọn file JSON!');
        return null;
    }

    // Kiểm tra kích thước file (50MB)
    if (file.size > 50 * 1024 * 1024) {
        showError('File quá lớn! Vui lòng chọn file nhỏ hơn 50MB.');
        return null;
    }

    // Kiểm tra extension
    if (!file.name.endsWith('.json')) {
        showError('Vui lòng chọn file có định dạng .json!');
        return null;
    }

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate JSON structure
        if (!data.results || !Array.isArray(data.results)) {
            showError('Sai format JSON! Cần có trường "results" là array.');
            return null;
        }

        if (data.results.length === 0) {
            showError('File JSON không có câu hỏi nào!');
            return null;
        }

        // Validate từng câu hỏi
        for (let i = 0; i < data.results.length; i++) {
            const q = data.results[i];
            if (!q.question || !q.correct_answer || !q.incorrect_answers) {
                showError(`Câu hỏi ${i + 1} thiếu thông tin bắt buộc!`);
                return null;
            }
            if (!Array.isArray(q.incorrect_answers) || q.incorrect_answers.length !== 3) {
                showError(`Câu hỏi ${i + 1} cần có đúng 3 incorrect_answers!`);
                return null;
            }
        }

        return data;
    } catch (error) {
        showError('Lỗi đọc file JSON! Vui lòng kiểm tra format: ' + error.message);
        return null;
    }
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Start quiz - chuyển từ Screen 1 sang Screen 2
 */
async function startQuiz() {
    // Load và validate JSON
    const jsonData = await loadJsonFile();
    if (!jsonData) return;

    currentJsonData = jsonData;
    currentQuestions = jsonData.results;
    currentQuizType = document.getElementById('quizType').value;
    const timeLimitMinutes = parseInt(document.getElementById('timeLimit').value);

    // Reset answers
    currentAnswers = {};

    // Setup timer
    timeRemaining = timeLimitMinutes * 60;
    
    // Chuyển sang Screen 2
    switchScreen('screen2');
    
    // Render questions
    renderQuestions();
    
    // Start timer
    startTimer();
}

/**
 * Render questions dựa trên quiz type
 */
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    // Nếu là fill-in-blank, hiển thị word bank
    if (currentQuizType === 'fill') {
        renderWordBank();
    } else {
        document.getElementById('wordBank').style.display = 'none';
    }

    currentQuestions.forEach((question, index) => {
        const card = document.createElement('div');
        card.className = 'question-card nes-container is-rounded';

        const questionNum = document.createElement('div');
        questionNum.className = 'question-number';
        questionNum.textContent = `Question ${index + 1}`;

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;

        card.appendChild(questionNum);
        card.appendChild(questionText);

        // Render theo loại quiz
        if (currentQuizType === 'multiple') {
            card.appendChild(renderMultipleChoice(question, index));
        } else {
            card.appendChild(renderFillInBlank(question, index));
        }

        container.appendChild(card);
    });
}

/**
 * Render multiple choice options với NES.css style
 */
function renderMultipleChoice(question, index) {
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options';

    // Combine và shuffle answers
    const allAnswers = [question.correct_answer, ...question.incorrect_answers];
    const shuffledAnswers = shuffleArray(allAnswers);

    shuffledAnswers.forEach((answer, optIndex) => {
        const option = document.createElement('label');
        option.className = 'option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.className = 'nes-radio';
        radio.name = `question-${index}`;
        radio.value = answer;
        radio.id = `q${index}-opt${optIndex}`;
        radio.onchange = () => {
            currentAnswers[index] = answer;
        };

        const labelText = document.createElement('span');
        labelText.textContent = answer;

        option.appendChild(radio);
        option.appendChild(labelText);
        optionsDiv.appendChild(option);
    });

    return optionsDiv;
}

/**
 * Render fill in the blank input
 */
function renderFillInBlank(question, index) {
    const inputDiv = document.createElement('div');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nes-input fill-input';
    input.placeholder = 'Type your answer here...';
    input.oninput = (e) => {
        currentAnswers[index] = e.target.value;
    };

    inputDiv.appendChild(input);
    return inputDiv;
}

/**
 * Render word bank cho fill-in-blank
 */
function renderWordBank() {
    const wordBank = document.getElementById('wordBank');
    const wordList = document.getElementById('wordList');
    
    wordBank.style.display = 'block';
    wordList.innerHTML = '';

    // Lấy tất cả correct answers và shuffle
    const words = currentQuestions.map(q => q.correct_answer);
    const wrongWords = currentQuestions.flatMap(q => q.incorrect_answers);
    words.push(...wrongWords);
    const shuffledWords = shuffleArray(words);

    shuffledWords.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.textContent = word;
        wordList.appendChild(wordItem);
    });
}

/**
 * Timer function
 */
function startTimer() {
    const timerDisplay = document.getElementById('timer');
    
    // Clear existing timer nếu có
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        timeRemaining--;

        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Warning khi còn 1 phút
        if (timeRemaining <= 60) {
            timerDisplay.classList.add('warning');
        }

        // Hết giờ
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
        }
    }, 1000);
}

/**
 * Submit quiz và chuyển sang Screen 3
 */
function submitQuiz() {
    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Chuyển sang Screen 3
    switchScreen('screen3');

    // Calculate và display results
    displayResults();
}

/**
 * Display results trên Screen 3
 */
function displayResults() {
    let correctCount = 0;
    const totalQuestions = currentQuestions.length;

    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';

    currentQuestions.forEach((question, index) => {
        const userAnswer = currentAnswers[index];
        const correctAnswer = question.correct_answer;
        
        // Check answer - trim spaces cho fill-in-blank
        let isCorrect = false;
        if (currentQuizType === 'fill') {
            // Trim spaces và so sánh (case-sensitive)
            isCorrect = userAnswer && userAnswer.trim() === correctAnswer;
        } else {
            isCorrect = userAnswer === correctAnswer;
        }

        if (isCorrect) correctCount++;

        // Create result card
        const card = document.createElement('div');
        card.className = `result-card nes-container is-rounded ${isCorrect ? 'correct' : 'incorrect'}`;

        const status = document.createElement('div');
        status.className = `answer-status ${isCorrect ? 'correct' : 'incorrect'}`;
        status.textContent = isCorrect ? '✓ Correct' : '✗ Incorrect';

        const questionNum = document.createElement('div');
        questionNum.className = 'question-number';
        questionNum.textContent = `Question ${index + 1}`;

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;

        card.appendChild(status);
        card.appendChild(questionNum);
        card.appendChild(questionText);

        // Show user answer
        const userAnswerDiv = document.createElement('div');
        userAnswerDiv.className = 'user-answer';
        userAnswerDiv.innerHTML = `
            <strong>Your answer:</strong> ${userAnswer || '<em>Not answered</em>'}<br>
            ${!isCorrect ? `<strong>Correct answer:</strong> ${correctAnswer}` : ''}
        `;
        card.appendChild(userAnswerDiv);

        resultsContainer.appendChild(card);
    });

    // Display score
    document.getElementById('scoreDisplay').textContent = `${correctCount}/${totalQuestions}`;
    const percentage = ((correctCount / totalQuestions) * 100).toFixed(1);
    document.getElementById('scorePercentage').textContent = `${percentage}% correct`;
}

/**
 * Switch giữa các screens
 */
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

/**
 * Go back to home (Screen 1)
 */
function goHome() {
    switchScreen('screen1');
    
    // Reset form
    document.getElementById('jsonFile').value = '';
    clearError();
    
    // Clear current data
    currentQuestions = [];
    currentAnswers = {};
    currentJsonData = null;
}

/**
 * Retry quiz với cùng JSON file
 */
function retryQuiz() {
    if (!currentJsonData) {
        goHome();
        return;
    }

    // Reset answers
    currentAnswers = {};

    // Setup timer
    const timeLimitMinutes = parseInt(document.getElementById('timeLimit').value);
    timeRemaining = timeLimitMinutes * 60;
    
    // Chuyển sang Screen 2
    switchScreen('screen2');
    
    // Render questions
    renderQuestions();
    
    // Start timer
    startTimer();
}

// Initialize active tab on load
document.addEventListener('DOMContentLoaded', function() {
    const mainTabBtn = document.getElementById('tab-main-btn');
    if (mainTabBtn) {
        mainTabBtn.classList.add('is-primary');
    }
});