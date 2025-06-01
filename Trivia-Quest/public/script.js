// Getting references to inportant HTML elements by ID
const categorySelect = document.getElementById('category');
const loadingMessage = document.getElementById('loadingMessage');
const startGameBtn = document.getElementById('startGameBtn');

const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const scoreScreen = document.getElementById('score-screen');

const questionNumberEl = document.getElementById('questionNumber');
const questionTextEl = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
const timerEl = document.getElementById('timer');
const scoreText = document.getElementById('scoreText');
const scoreBreakdown = document.getElementById('scoreBreakdown');
const personalBestText = document.getElementById('personalBestText');
const restartBtn = document.getElementById('restartBtn');
const progressBar = document.getElementById('progressBar');

// Placeholder leaderboard function (empty)
function loadLeaderboard() {
  // Future implementation if needed
}

// Placeholder function for playing audio during the game
function playAudioPlaceholder(type) {
  console.log(`Audio placeholder called for: ${type}`);
}

// Game state variables
let questions = []; // Array to store the fetched questions
let currentQuestionIndex = 0; // Index of the current question
let score = 0; // Number of correct answers
let timer; // Countdown timer
let timeLeft = 0; // Time left for the current question
let totalAnswerTime = 0; // Total time taken to answer all questions

let unansweredCount = 0; // Number of unanswered questions
let incorrectCount = 0; // Number of incorrect answers

// Timer durations (in seconds) for different difficulty levels
const timerDurations = {
  easy: 30,
  medium: 25,
  hard: 15
};

// Function to fetch the trivia categories from Trivia DB API and display them for player to select
async function fetchCategories() {
  try {
    const res = await fetch('https://opentdb.com/api_category.php'); //Online API
    const data = await res.json();
    const categories = data.trivia_categories;

    // Clear existing options
    categorySelect.innerHTML = '';

    // Add "Any Category" option
    const anyOption = document.createElement('option');
    anyOption.value = '';
    anyOption.textContent = 'Any Category';
    categorySelect.appendChild(anyOption);

    // Add category options fetched from API
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      categorySelect.appendChild(option);
    });

    // Enable category selection and error message in case loading failed
    categorySelect.disabled = false;
    loadingMessage.textContent = '';
  } catch (error) {
    loadingMessage.textContent = 'Failed to load categories. Please refresh.';
    console.error('Error fetching categories:', error);
  }
}

// Function call
fetchCategories();

// Utility function to decode HTML entities in question and answer text.
function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

// Randomizer so that a question is barely encountered twice(upto 5000 trivia questions)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Event listener for the "Start Game" button and getting users chosen options
startGameBtn.addEventListener('click', async () => {
  const difficulty = document.getElementById('difficulty').value;
  const amount = document.getElementById('amount').value;
  const category = document.getElementById('category').value;
  const type = document.getElementById('type').value;

  // Build API URL with the selected options
  let apiUrl = `https://opentdb.com/api.php?amount=${amount}`;

  if (category) apiUrl += `&category=${category}`;
  if (difficulty) apiUrl += `&difficulty=${difficulty}`;
  if (type) apiUrl += `&type=${type}`;

  // Disable start button and show loading message
  loadingMessage.textContent = 'Loading questions...';
  startGameBtn.disabled = true;

  // Fetch questions from the API
  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    // Check if the API returned questions successfully
    if (data.response_code !== 0 || !data.results.length) {
      alert('No questions found for the selected options. Please try different settings.');
      loadingMessage.textContent = '';
      startGameBtn.disabled = false;
      return;
    }

    // Initialize game state variables
    questions = data.results;
    currentQuestionIndex = 0;
    score = 0;
    unansweredCount = 0;
    incorrectCount = 0;
    totalAnswerTime = 0;

    loadingMessage.textContent = '';
    startGameBtn.disabled = false;

    startScreen.style.display = 'none';
    scoreScreen.style.display = 'none';
    quizScreen.style.display = 'block';

    // Update progress bar
    updateProgressBar();
    showQuestion();
  } catch (error) {
    alert('Failed to load questions. Please try again.');
    console.error('Error fetching questions:', error);
    loadingMessage.textContent = '';
    startGameBtn.disabled = false;
  }
});

// Function to show the current question and replenish the timer
function showQuestion() {
  clearInterval(timer);

  // If all questions have been answered, then show scores
  if (currentQuestionIndex >= questions.length) {
    showScore();
    return;
  }

  // Next question animation
  const question = questions[currentQuestionIndex];
  const difficulty = document.getElementById('difficulty').value;

  questionTextEl.classList.add('fade-out');
  answersContainer.classList.add('fade-out');

  // Update question number and text
  setTimeout(() => {
    questionNumberEl.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    questionTextEl.innerHTML = decodeHTML(question.question);

    let answers = [...question.incorrect_answers];
    answers.push(question.correct_answer);
    answers = shuffleArray(answers);

    // Clear previous answers
    answersContainer.innerHTML = '';

    // Add options for each answer option
    answers.forEach(answer => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.innerHTML = decodeHTML(answer);
      btn.onclick = () => selectAnswer(btn, answer, question.correct_answer);
      answersContainer.appendChild(btn);
    });

    // Next question animation
    questionTextEl.classList.remove('fade-out');
    answersContainer.classList.remove('fade-out');
    questionTextEl.classList.add('fade-in');
    answersContainer.classList.add('fade-in');

    // Start timer and timer options based on difficulty
    setTimeout(() => {
      questionTextEl.classList.remove('fade-in');
      answersContainer.classList.remove('fade-in');
    }, 500);

    timeLeft = timerDurations[difficulty] || 25;
    timerEl.textContent = `Time Left: ${timeLeft}s`;

    timer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Time Left: ${timeLeft}s`;

      // If time runs out, move to the next question
      if (timeLeft <= 0) {
        clearInterval(timer);
        unansweredCount++;
        totalAnswerTime += timerDurations[difficulty];
        disableAnswers();
        showCorrectAnswer();
        setTimeout(() => {
          currentQuestionIndex++;
          updateProgressBar();
          showQuestion();
        }, 2000);
      }
    }, 1000);
  }, 500);
}

/* Handling user selection
*checks for correct answer and moves to the next question */
function selectAnswer(button, selected, correct) {
  clearInterval(timer);

  // Calculate time taken to answer
  const difficulty = document.getElementById('difficulty').value;
  const maxTime = timerDurations[difficulty] || 25;
  const timeTaken = maxTime - timeLeft;
  totalAnswerTime += timeTaken;

  // Disable answers to avoid multiple selection
  disableAnswers();

  // Score incrementing for both corect and incorrect answers
  if (selected === correct) {
    button.classList.add('correct');
    score++;
  } else { // Highlights incorrect answer and then shows the correct answer
    button.classList.add('incorrect');
    incorrectCount++;
    showCorrectAnswer();
  }

  // Button animation
  button.style.transform = 'scale(0.95)';
  setTimeout(() => {
    button.style.transform = 'scale(1)';
  }, 150);

  setTimeout(() => {
    currentQuestionIndex++;
    updateProgressBar();
    showQuestion();
  }, 2000);
}

// Function to disable answers
function disableAnswers() {
  const buttons = answersContainer.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });
}

// Function to show the correct answer
function showCorrectAnswer() {
  const buttons = answersContainer.querySelectorAll('button');
  buttons.forEach(btn => {
    if (btn.textContent === decodeHTML(questions[currentQuestionIndex].correct_answer)) {
      btn.classList.add('correct');
    }
  });
}

// Function to update the progress bar
function updateProgressBar() {
  const progressPercent = ((currentQuestionIndex) / questions.length) * 100;
  progressBar.style.width = `${progressPercent}%`;
}

// Function to show the score
function showScore() {
  quizScreen.style.display = 'none';
  scoreScreen.style.display = 'block';

  // Display total score
  scoreText.textContent = `You scored ${score} out of ${questions.length}!`;

  // Display score breakdown 
  const unanswered = unansweredCount;
  const incorrect = incorrectCount;
  const correct = score;

  scoreBreakdown.innerHTML = `
    <p>Correct Answers: <strong>${correct}</strong></p>
    <p>Incorrect Answers: <strong>${incorrect}</strong></p>
    <p>Unanswered: <strong>${unanswered}</strong></p>
  `;

  // Display average time per answer
  const answeredCount = questions.length - unanswered;
  const avgTime = answeredCount > 0 ? (totalAnswerTime / answeredCount).toFixed(2) : 0;

  personalBestText.textContent = `Average Time per Answer: ${avgTime}s`;

  // Fill progress bar to 100%
  progressBar.style.width = '100%';

  // Placeholder to show best scores from other players(curently not implemented)
  loadLeaderboard();

  // Placeholder for background audio
  playAudioPlaceholder();
}

// Event listener to restart the game
restartBtn.addEventListener('click', () => {
  scoreScreen.style.display = 'none';
  startScreen.style.display = 'block';
  progressBar.style.width = '0%';
  personalBestText.textContent = '';
});