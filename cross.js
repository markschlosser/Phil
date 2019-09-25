// Modified by jmviz. Original notice follows:
//
// Phil
// ------------------------------------------------------------------------
// Copyright 2017 Keiran King

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// (https://www.apache.org/licenses/LICENSE-2.0)

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ------------------------------------------------------------------------

const letterKeys = [
  "a","b","c","d","e","f","g","h","i","j","k","l","m",
  "n","o","p","q","r","s","t","u","v","w","x","y","z"
];
const ARROW_LEFT = "ArrowLeft";
const ARROW_RIGHT = "ArrowRight";
const ARROW_UP = "ArrowUp";
const ARROW_DOWN = "ArrowDown";
const arrowKeys = [ARROW_LEFT, ARROW_RIGHT, ARROW_UP, ARROW_DOWN];
const ENTER = "Enter";
const DELETE = "Backspace";
const SPACE = " ";
const BLOCK = ".";
const DASH = "-";
const BLANK = " ";
const ACROSS = "across";
const DOWN = "down";
const DEFAULT_SIZE = 15;
const DEFAULT_SUNDAY_SIZE = 21;
const DEFAULT_TITLE = "Untitled";
const DEFAULT_AUTHOR = "Anonymous";
const DEFAULT_CLUE = "(blank clue)";
const DEFAULT_NOTIFICATION_LIFETIME = 10; // in seconds

let history = [];
let isSymmetrical = true;
let isStrictMatching = false;
let isDarkMode = false;
let grid;
let squares;
let isMutated = false;
let forced = null;
// createNewPuzzle();
let solveWorker = null;
let solveWorkerState = null;
let solveTimeout = null;
let solveWordlist = null;
let solvePending = [];

//____________________
// C L A S S E S
class Crossword {
  constructor(rows = DEFAULT_SIZE, cols = DEFAULT_SIZE) {
    this.clues = {};
    this.title = DEFAULT_TITLE;
    this.author = DEFAULT_AUTHOR;
    this.rows = rows;
    this.cols = cols;
    this.fill = [];
    //
    for (let i = 0; i < this.rows; i++) {
      this.fill.push("");
      for (let j = 0; j < this.cols; j++) {
        this.fill[i] += BLANK;
      }
    }
  }
  isDailySize() {
    return this.rows == DEFAULT_SIZE && this.cols == DEFAULT_SIZE;
  }
  isSundaySize() {
    return this.rows == DEFAULT_SUNDAY_SIZE && this.cols == DEFAULT_SUNDAY_SIZE;
  }
  isStandardSize() {
    return this.isDailySize() || this.isSundaySize();
  }
}

class Grid {
  constructor(rows, cols) {
    document.getElementById("grid-container").innerHTML = "";
    let table = document.createElement("TABLE");
    table.setAttribute("id", "grid");
    table.setAttribute("tabindex", "1");
    document.getElementById("grid-container").appendChild(table);

    for (let i = 0; i < rows; i++) {
        let row = document.createElement("TR");
        row.setAttribute("data-row", i);
        document.getElementById("grid").appendChild(row);

      for (let j = 0; j < cols; j++) {
          let col = document.createElement("TD");
          col.setAttribute("data-col", j);

          let label = document.createElement("DIV");
          label.setAttribute("class", "label");
          let labelContent = document.createTextNode("");

          let fill = document.createElement("DIV");
          fill.setAttribute("class", "fill");
          let fillContent = document.createTextNode(xw.fill[i][j]);

          label.appendChild(labelContent);
          fill.appendChild(fillContent);
          col.appendChild(label);
          col.appendChild(fill);
          row.appendChild(col);
        }
    }
    grid = document.getElementById("grid");
    squares = grid.querySelectorAll('td');
    for (const square of squares) {
      square.addEventListener('click', mouseHandler);
    }
    grid.addEventListener('keydown', keyboardHandler);
  }

  update() {
    for (let i = 0; i < xw.rows; i++) {
      for (let j = 0; j < xw.cols; j++) {
        const activeCell = grid.querySelector('[data-row="' + i + '"]').querySelector('[data-col="' + j + '"]');
        let fill = xw.fill[i][j];
        if (fill == BLANK && forced != null) {
          fill = forced[i][j];
          activeCell.classList.add("pencil");
        } else {
          activeCell.classList.remove("pencil");
        }
        activeCell.lastChild.innerHTML = fill;
        if (fill == BLOCK) {
          activeCell.classList.add("block");
        } else {
          activeCell.classList.remove("block");
        }
      }
    }
  }
}

class Button {
  constructor(id) {
    this.id = id;
    this.dom = document.getElementById(id);
    this.tooltip = this.dom.getAttribute("data-tooltip");
    // this.type = type; // "normal", "toggle", "menu", "submenu"
    this.state = this.dom.className; // "normal", "on", "open", "disabled"
  }

  setState(state) {
    this.state = state;
    this.dom.className = (this.state == "normal") ? "" : this.state;
  }

  addEvent(e, func) {
    this.dom.addEventListener(e, func);
    if (this.state == "disabled") {
      this.setState("normal");
    }
  }

  press() {
    // switch (this.type) {
    //   case "toggle":
    //   case "submenu":
    //     this.setState((this.state == "on") ? "normal" : "on");
    //     break;
    //   case "menu":
    //     this.setState((this.state == "open") ? "normal" : "open");
    //     break;
    //   default:
    //     break;
  }
}

class Menu { // in dev
  constructor(id, buttons) {
    this.id = id;
    this.buttons = buttons;

    let div = document.createElement("DIV");
    div.setAttribute("id", this.id);
    for (var button in buttons) {
      div.appendChild(button);
    }
    document.getElementById("toolbar").appendChild(div);
  }
}

class Toolbar {
  constructor(id) {
    this.id = id;
    this.buttons = { // rewrite this programmatically
      "newPuzzle15": new Button("new-grid-15"),
      "newPuzzle21": new Button("new-grid-21"),
      "newPuzzleCustom": new Button("new-grid-custom"),
      "newPuzzle": new Button("new-grid"),
      "openPuzzle": new Button("open-JSON"),
      "exportJSON": new Button("export-JSON"),
      "exportPUZ": new Button("export-PUZ"),
      "exportPDF": new Button("print-puzzle"),
      "exportNYT": new Button("print-NYT-submission"),
      "export": new Button("export"),
      "quickLayout": new Button("quick-layout"),
      "freezeLayout": new Button("toggle-freeze-layout"),
      "clearFill": new Button("clear-fill"),
      "toggleSymmetry": new Button("toggle-symmetry"),
      "strictMatching": new Button("toggle-strict-matching"),
      "openWordlist": new Button("open-wordlist"),
      "autoFill": new Button("auto-fill"),
      "toggleDarkMode": new Button("toggle-dark-mode")
    };
  }
}

class Notification {
  constructor(message, lifetime = undefined) {
    this.message = message;
    this.id = String(randomNumber(1,10000));
    this.post();
    if (lifetime) {
      this.dismiss(lifetime);
    }
  }

  post() {
    let div = document.createElement("DIV");
    div.setAttribute("id", this.id);
    div.setAttribute("class", "notification");
    div.innerHTML = this.message;
    div.addEventListener('click', this.dismiss);
    // document.getElementById("footer").appendChild(div);
    document.body.appendChild(div);

  }

  update(message) {
    document.getElementById(this.id).innerHTML = message;
  }

  dismiss(seconds = 0) {
    let div = document.getElementById(this.id);
    // seconds = (seconds === true) ? 10 : seconds;
    setTimeout(function() { div.remove(); }, seconds * 1000);
  }
}

class Interface {
  constructor(rows, cols) {
    this.grid = new Grid(rows, cols);
    // this.sidebar;
    this.toolbar = new Toolbar("toolbar");

    this.isSymmetrical = true;
    this.row = 0;
    this.col = 0;
    this.acrossWord = '';
    this.downWord = '';
    this.acrossStartIndex = 0;
    this.acrossEndIndex = cols;
    this.downStartIndex = 0;
    this.downEndIndex = rows;
    this.direction = ACROSS;

    console.log("Grid UI created.");
  }

  toggleDirection() {
    this.direction = (this.direction == ACROSS) ? DOWN : ACROSS;
  }

  update() {
    updateInfoUI();
    updateLabelsAndClues();
    updateActiveWords();
    updateGridHighlights();
    updateSidebarHighlights();
    updateCluesUI();
    updateStatsUI(true);
  }
}

// new Notification(document.getElementById("shortcuts").innerHTML, 300);

let xw = new Crossword(); // model
let current = new Interface(xw.rows, xw.cols); // view-controller
current.update();
if (localStorage.getItem("theme") == "dark") toggleDarkMode();

//____________________
// F U N C T I O N S

function createNewPuzzle(rows, cols) {
  xw.clues = {};
  xw.title = DEFAULT_TITLE;
  xw.author = DEFAULT_AUTHOR;
  xw.rows = rows || DEFAULT_SIZE;
  xw.cols = cols || xw.rows;
  xw.fill = [];
  for (let i = 0; i < xw.rows; i++) {
    xw.fill.push("");
    for (let j = 0; j < xw.cols; j++) {
      xw.fill[i] += BLANK;
    }
  }
  updateInfoUI();
  document.getElementById("grid-container").innerHTML = "";
  createGrid(xw.rows, xw.cols);

  isSymmetrical = true;
  current = {
    "row":        0,
    "col":        0,
    "acrossWord": '',
    "downWord":   '',
    "acrossStartIndex":0,
    "acrossEndIndex":  xw.rows,
    "downStartIndex":  0,
    "downEndIndex":    xw.cols,
    "direction":  ACROSS
  };

  grid = document.getElementById("grid");
  squares = grid.querySelectorAll('td');

  updateActiveWords();
  updateGridHighlights();
  updateSidebarHighlights();
  updateCluesUI();
  updateMatchesUI();
  updateStatsUI(true);

  for (const square of squares) {
    square.addEventListener('click', mouseHandler);
  }
  grid.addEventListener('keydown', keyboardHandler);
  console.log(`New ${xw.rows}×${xw.cols} puzzle created.`);

  // if (!xw.isStandardSize()){
  //   new Notification("Warning, using non-standard grid sizes may cause problems with some features.", 10);
  // }
}

function createNewCustomPuzzle() {
  let rows = parseInt(document.getElementById("custom-rows").value);
  let cols = parseInt(document.getElementById("custom-cols").value);
  createNewPuzzle(rows, cols);
}

function mouseHandler(e) {
  const previousCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.col + '"]');
  previousCell.classList.remove("active");
  const activeCell = e.currentTarget;
  if (activeCell == previousCell) {
    current.direction = (current.direction == ACROSS) ? DOWN : ACROSS;
  }
  current.row = Number(activeCell.parentNode.dataset.row);
  current.col = Number(activeCell.dataset.col);
  console.log("[" + current.row + "," + current.col + "]");
  activeCell.classList.add("active");

  isMutated = false;
  updateUI();
}

function keyboardHandler(e) {
  console.log(e.key);
  isMutated = false;
  let activeCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.col + '"]');
  const symRow = xw.rows - 1 - current.row;
  const symCol = xw.cols - 1 - current.col;

  if (letterKeys.includes(e.key.toLowerCase()) || e.key == SPACE) {
    let oldContent = xw.fill[current.row][current.col];
    xw.fill[current.row] = xw.fill[current.row].slice(0, current.col) + e.key.toUpperCase() + xw.fill[current.row].slice(current.col + 1);
    if (oldContent == BLOCK) {
      if (isSymmetrical) {
        xw.fill[symRow] = xw.fill[symRow].slice(0, symCol) + BLANK + xw.fill[symRow].slice(symCol + 1);
      }
    }
    // move the cursor
    if (current.direction == ACROSS) {
      e = new KeyboardEvent("keydown", {"key": ARROW_RIGHT});
    } else {
      e = new KeyboardEvent("keydown", {"key": ARROW_DOWN});
    }
    isMutated = true;
  }
  if (e.key == BLOCK) {
      if (xw.fill[current.row][current.col] == BLOCK) { // if already block...
        e = new KeyboardEvent("keydown", {"key": DELETE}); // make it a white square
      } else {
        xw.fill[current.row] = xw.fill[current.row].slice(0, current.col) + BLOCK + xw.fill[current.row].slice(current.col + 1);
        if (isSymmetrical) {
          xw.fill[symRow] = xw.fill[symRow].slice(0, symCol) + BLOCK + xw.fill[symRow].slice(symCol + 1);
        }
      }
      isMutated = true;
  }
  if (e.key == ENTER) {
      current.direction = (current.direction == ACROSS) ? DOWN : ACROSS;
  }
  if (e.key == DELETE) {
    e.preventDefault();
    let oldContent = xw.fill[current.row][current.col];
    xw.fill[current.row] = xw.fill[current.row].slice(0, current.col) + BLANK + xw.fill[current.row].slice(current.col + 1);
      if (oldContent == BLOCK) {
        if (isSymmetrical) {
          xw.fill[symRow] = xw.fill[symRow].slice(0, symCol) + BLANK + xw.fill[symRow].slice(symCol + 1);
        }
      } else { // move the cursor
        if (current.direction == ACROSS) {
          e = new KeyboardEvent("keydown", {"key": ARROW_LEFT});
        } else {
          e = new KeyboardEvent("keydown", {"key": ARROW_UP});
        }
      }
      isMutated = true;
  }
  if (arrowKeys.includes(e.key)) {
      e.preventDefault();
      const previousCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.col + '"]');
      previousCell.classList.remove("active");
      let content = xw.fill[current.row][current.col];
      switch (e.key) {
        case ARROW_LEFT:
          if (current.direction == ACROSS || content == BLOCK) {
            current.col -= (current.col == 0) ? 0 : 1;
          }
          current.direction = ACROSS;
          break;
        case ARROW_UP:
          if (current.direction == DOWN || content == BLOCK) {
            current.row -= (current.row == 0) ? 0 : 1;
          }
          current.direction = DOWN;
          break;
        case ARROW_RIGHT:
          if (current.direction == ACROSS || content == BLOCK) {
            current.col += (current.col == xw.cols - 1) ? 0 : 1;
          }
          current.direction = ACROSS;
          break;
        case ARROW_DOWN:
          if (current.direction == DOWN || content == BLOCK) {
            current.row += (current.row == xw.rows - 1) ? 0 : 1;
          }
          current.direction = DOWN;
          break;
      }
      console.log("[" + current.row + "," + current.col + "]");
      activeCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.col + '"]');
      activeCell.classList.add("active");
  }
  updateUI();
}

function mobileKeyboardHandler(char) {
  switch (char) {
    case '⌫':
      e = new KeyboardEvent("keydown", {"key": DELETE});
      break;
    case '␣':
      e = new KeyboardEvent("keydown", {"key": SPACE});
      break;
    case '?':
      e = new KeyboardEvent("keydown", {"key": ENTER});
      break;
    default:
      e = new KeyboardEvent("keydown", {"key": char});

  }
  keyboardHandler(e);
}

function updateUI() {
  updateGridUI();
  updateLabelsAndClues();
  updateActiveWords();
  updateGridHighlights();
  updateSidebarHighlights();
  updateMatchesUI();
  updateCluesUI();
  updateInfoUI();
  if (isMutated) {
    updateStatsUI();
    // autoFill(true);  // quick fill
  }
}

function updateGridUI() {
  for (let i = 0; i < xw.rows; i++) {
    for (let j = 0; j < xw.cols; j++) {
      const activeCell = grid.querySelector('[data-row="' + i + '"]').querySelector('[data-col="' + j + '"]');
      let fill = xw.fill[i][j];
      if (fill == BLANK && forced != null) {
        fill = forced[i][j];
        activeCell.classList.add("pencil");
      } else {
        activeCell.classList.remove("pencil");
      }
      activeCell.lastChild.innerHTML = fill;
      if (fill == BLOCK) {
        activeCell.classList.add("block");
      } else {
        activeCell.classList.remove("block");
      }
    }
  }
}

function updateCluesUI() {
  let acrossClueNumber = document.getElementById("across-clue-number");
  let downClueNumber = document.getElementById("down-clue-number");
  let acrossClueText = document.getElementById("across-clue-text");
  let downClueText = document.getElementById("down-clue-text");
  // const currentCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.col + '"]');

  // If the current cell is block, empty interface and get out
  if (xw.fill[current.row][current.col] == BLOCK) {
    acrossClueNumber.innerHTML = "";
    downClueNumber.innerHTML = "";
    acrossClueText.innerHTML = "";
    downClueText.innerHTML = "";
    return;
  }
  // Otherwise, assign values
  const acrossCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.acrossStartIndex + '"]');
  const downCell = grid.querySelector('[data-row="' + current.downStartIndex + '"]').querySelector('[data-col="' + current.col + '"]');
  acrossClueNumber.innerHTML = acrossCell.firstChild.innerHTML + "a.";
  downClueNumber.innerHTML = downCell.firstChild.innerHTML + "d.";
  acrossClueText.innerHTML = xw.clues[[current.row, current.acrossStartIndex, ACROSS]];
  downClueText.innerHTML = xw.clues[[current.downStartIndex, current.col, DOWN]];
}

function updateInfoUI() {
  document.getElementById("puzzle-title").innerHTML = xw.title;
  document.getElementById("puzzle-author").innerHTML = xw.author;
}

function createGrid(rows, cols) {
  let table = document.createElement("TABLE");
  table.setAttribute("id", "grid");
  table.setAttribute("tabindex", "1");
  // table.setAttribute("tabindex", "0");
  document.getElementById("grid-container").appendChild(table);

	for (let i = 0; i < rows; i++) {
    	let row = document.createElement("TR");
    	row.setAttribute("data-row", i);
    	document.getElementById("grid").appendChild(row);

		for (let j = 0; j < cols; j++) {
		    let col = document.createElement("TD");
        col.setAttribute("data-col", j);

        let label = document.createElement("DIV");
        label.setAttribute("class", "label");
        let labelContent = document.createTextNode("");

        let fill = document.createElement("DIV");
        fill.setAttribute("class", "fill");
        let fillContent = document.createTextNode(xw.fill[i][j]);

    		// let t = document.createTextNode("[" + i + "," + j + "]");
        label.appendChild(labelContent);
        fill.appendChild(fillContent);
        col.appendChild(label);
        col.appendChild(fill);
        row.appendChild(col);
      }
  }
  updateLabelsAndClues();
}

function updateLabelsAndClues() {
  let count = 1;
  for (let i = 0; i < xw.rows; i++) {
    for (let j = 0; j < xw.cols; j++) {
      let isAcross = false;
      let isDown = false;
      if (xw.fill[i][j] != BLOCK) {
        isDown = i == 0 || xw.fill[i - 1][j] == BLOCK;
        isAcross = j == 0 || xw.fill[i][j - 1] == BLOCK;
      }
      const grid = document.getElementById("grid");
      let currentCell = grid.querySelector('[data-row="' + i + '"]').querySelector('[data-col="' + j + '"]');
      if (isAcross || isDown) {
        currentCell.firstChild.innerHTML = count; // Set square's label to the count
        count++;
      } else {
        currentCell.firstChild.innerHTML = "";
      }

      if (isAcross) {
        xw.clues[[i, j, ACROSS]] = xw.clues[[i, j, ACROSS]] || DEFAULT_CLUE;
      } else {
        delete xw.clues[[i, j, ACROSS]];
      }
      if (isDown) {
        xw.clues[[i, j, DOWN]] = xw.clues[[i, j, DOWN]] || DEFAULT_CLUE;
      } else {
        delete xw.clues[[i, j, DOWN]];
      }
    }
  }
}

function updateActiveWords() {
  if (xw.fill[current.row][current.col] == BLOCK) {
    current.acrossWord = '';
    current.downWord = '';
    current.acrossStartIndex = null;
    current.acrossEndIndex = null;
    current.downStartIndex = null;
    current.downEndIndex = null;
  } else {
    current.acrossWord = getWordAt(current.row, current.col, ACROSS, true);
    current.downWord = getWordAt(current.row, current.col, DOWN, true);
  }
  document.getElementById("across-word").innerHTML = current.acrossWord;
  document.getElementById("down-word").innerHTML = current.downWord;
  // console.log("Across:", current.acrossWord, "Down:", current.downWord);
  // console.log(current.acrossWord.split(DASH).join("*"));
}

function getWordAt(row, col, direction, setCurrentWordIndices) {
  let text = "";
  let [start, end] = [0, 0];
  let position = 0;
  if (direction == ACROSS) {
    text = xw.fill[row];
    position = col;
  } else {
    for (let i = 0; i < xw.rows; i++) {
      text += xw.fill[i][col];
    }
    position = row;
  }
  text = text.split(BLANK).join(DASH);
  [start, end] = getWordIndices(text, direction, position);
  // Set global word indices if needed
  if (setCurrentWordIndices) {
    if (direction == ACROSS) {
      [current.acrossStartIndex, current.acrossEndIndex] = [start, end];
    } else {
      [current.downStartIndex, current.downEndIndex] = [start, end];
    }
  }
  return text.slice(start, end);
}

function getWordIndices(text, direction, position) {
  let start = text.slice(0, position).lastIndexOf(BLOCK);
  start = (start == -1) ? 0 : start + 1;
  let limit = (direction == ACROSS) ? xw.cols : xw.rows;
  let end = text.slice(position, limit).indexOf(BLOCK);
  end = (end == -1) ? limit : Number(position) + end;
  return [start, end];
}

function updateGridHighlights() {
  // Clear the grid of any highlights
  for (let i = 0; i < xw.rows; i++) {
    for (let j = 0; j < xw.cols; j++) {
      const square = grid.querySelector('[data-row="' + i + '"]').querySelector('[data-col="' + j + '"]');
      square.classList.remove("highlight", "lowlight");
    }
  }
  // Highlight across squares
  for (let j = current.acrossStartIndex; j < current.acrossEndIndex; j++) {
    const square = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + j + '"]');
    if (j != current.col) {
      square.classList.add((current.direction == ACROSS) ? "highlight" : "lowlight");
    }
  }
  // Highlight down squares
  for (let i = current.downStartIndex; i < current.downEndIndex; i++) {
    const square = grid.querySelector('[data-row="' + i + '"]').querySelector('[data-col="' + current.col + '"]');
    if (i != current.row) {
      square.classList.add((current.direction == DOWN) ? "highlight" : "lowlight");
    }
  }
}

function updateSidebarHighlights() {
  let acrossHeading = document.getElementById("across-heading");
  let downHeading = document.getElementById("down-heading");
  const currentCell = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + current.col + '"]');

  acrossHeading.classList.remove("highlight");
  downHeading.classList.remove("highlight");

  if (!currentCell.classList.contains("block")) {
    if (current.direction == ACROSS) {
      acrossHeading.classList.add("highlight");
    } else {
      downHeading.classList.add("highlight");
    }
  }
}

function setClues() {
    xw.clues[[current.row, current.acrossStartIndex, ACROSS]] = document.getElementById("across-clue-text").innerHTML;
    xw.clues[[current.downStartIndex, current.col, DOWN]] = document.getElementById("down-clue-text").innerHTML;
    // console.log("Stored clue:", xw.clues[[current.row, current.acrossStartIndex, ACROSS]], "at [" + current.row + "," + current.acrossStartIndex + "]");
    // console.log("Stored clue:", xw.clues[[current.downStartIndex, current.col, DOWN]], "at [" + current.downStartIndex + "," + current.col + "]");
}

function setTitle() {
  xw.title = document.getElementById("puzzle-title").innerHTML;
}

function setAuthor() {
  xw.author = document.getElementById("puzzle-author").innerHTML;
}

function suppressEnterKey(e) {
  if (e.key == "Enter") {
    e.preventDefault();
    // console.log("Enter key behavior suppressed.");
  }
}

function generatePattern() {
  let title = xw.title;
  let author = xw.author;
  createNewPuzzle();
  xw.title = title;
  xw.author = author;

  const pattern = patterns[randomNumber(0, patterns.length)]; // select random pattern
  if (!isSymmetrical) { // patterns are encoded as only one half of the grid...
    toggleSymmetry();   // so symmetry needs to be on to populate correctly
  }
  for (let i = 0; i < pattern.length; i++) {
    const row = pattern[i][0];
    const col = pattern[i][1];
    const symRow = xw.rows - 1 - row;
    const symCol = xw.cols - 1 - col;
    xw.fill[row] = xw.fill[row].slice(0, col) + BLOCK + xw.fill[row].slice(col + 1);
    xw.fill[symRow] = xw.fill[symRow].slice(0, symCol) + BLOCK + xw.fill[symRow].slice(symCol + 1);
  }
  isMutated = true;
  updateUI();
  console.log("Generated layout.");
}

function toggleSymmetry() {
  isSymmetrical = !isSymmetrical;
  // Update UI button
  let symButton = document.getElementById("toggle-symmetry");
  symButton.classList.toggle("button-on");
  buttonState = symButton.getAttribute("data-state");
  symButton.setAttribute("data-state", (buttonState == "on") ? "off" : "on");
  symButton.setAttribute("data-tooltip", "Turn " + buttonState + " symmetry");
}

function toggleStrictMatching() {
  isStrictMatching = !isStrictMatching;
  // Update UI button
  let strictButton = document.getElementById("toggle-strict-matching");
  strictButton.classList.toggle("button-on");
  buttonState = strictButton.getAttribute("data-state");
  strictButton.setAttribute("data-state", (buttonState == "on") ? "off" : "on");
  strictButton.setAttribute("data-tooltip", "Turn " + buttonState + " strict matching");
  updateMatchesUI();
}

function toggleDarkMode() {
  if (!isDarkMode) {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }
  isDarkMode = !isDarkMode;
  // Update UI button
  let darkButton = document.getElementById("toggle-dark-mode");
  darkButton.classList.toggle("button-on");
  buttonState = darkButton.getAttribute("data-state");
  darkButton.setAttribute("data-state", (buttonState == "on") ? "off" : "on");
  darkButton.setAttribute("data-tooltip", "Turn " + buttonState + " dark mode");
  updateStatsUIColors();
}

function toggleHelp() {
  document.getElementById("help").classList.toggle("hidden");
  let helpButton = document.getElementById("toggle-help");
  helpButton.classList.toggle("button-on");
  if (helpButton.getAttribute("data-state") == "on") {
    helpButton.setAttribute("data-state", "off");
    helpButton.setAttribute("data-tooltip", "Show help");
  } else {
    helpButton.setAttribute("data-state", "on");
    helpButton.setAttribute("data-tooltip", "Hide help");
  }
}

function clearFill() {
  for (let i = 0; i < xw.rows; i++) {
    xw.fill[i] = xw.fill[i].replace(/\w/g, ' '); // replace letters with spaces
  }
  isMutated = true;
  updateUI();
}

function autoFill(isQuick = false) {
  console.log("Auto-filling...");
  forced = null;
  grid.classList.remove("sat", "unsat");
  if (!solveWorker) {
    solveWorker = new Worker('xw_worker.js');
    solveWorkerState = 'ready';
  }
  if (solveWorkerState != 'ready') {
    cancelSolveWorker();
  }
  solvePending = [isQuick];
  runSolvePending();
}

function runSolvePending() {
  if (solveWorkerState != 'ready' || solvePending.length == 0) return;
  let isQuick = solvePending[0];
  solvePending = [];
  solveTimeout = window.setTimeout(cancelSolveWorker, 30000);
  if (solveWordlist == null) {
    console.log('Rebuilding wordlist...');
    solveWordlist = '';
    for (let i = 3; i < wordlist.length; i++) {
      solveWordlist += wordlist[i].join('\n') + '\n';
    }
  }
  //console.log(wordlist_str);
  let puz = xw.fill.join('\n') + '\n';
  solveWorker.postMessage(['run', solveWordlist, puz, isQuick]);
  solveWorkerState = 'running';
  solveWorker.onmessage = function(e) {
    switch (e.data[0]) {
      case 'sat':
        if (solveWorkerState == 'running') {
          if (isQuick) {
            console.log("Autofill: Solution found.");
            grid.classList.add("sat");
          } else {
            xw.fill = e.data[1].split('\n');
            xw.fill.pop();  // strip empty last line
            updateGridUI();
            updateStatsUI();
            grid.focus();
          }
        }
        break;
      case 'unsat':
        if (solveWorkerState == 'running') {
          if (isQuick) {
            console.log("Autofill: No quick solution found.");
            grid.classList.add("unsat");
          } else {
            console.log('Autofill: No solution found.');
            // TODO: indicate on UI
          }
        }
        break;
      case 'forced':
        if (solveWorkerState == 'running') {
          forced = e.data[1].split('\n');
          forced.pop();  // strip empty last line
          updateGridUI();
        }
        break;
      case 'done':
        console.log('Autofill: returning to ready, state was ', solveWorkerState);
        solveWorkerReady();
        break;
      case 'ack_cancel':
        console.log('Autofill: Cancel acknowledged.');
        solveWorkerReady();
        break;
      default:
        console.log('Autofill: Unexpected return,', e.data);
        break;
    }
  };
}

function solveWorkerReady() {
  if (solveTimeout) {
    window.clearTimeout(solveTimeout);
    solveTimeout = null;
  }
  solveWorkerState = 'ready';
  runSolvePending();
}

function cancelSolveWorker() {
  if (solveWorkerState == 'running') {
    solveWorker.postMessage(['cancel']);
    solveWorkerState = 'cancelwait';
    console.log("Autofill: Cancel sent.");  // TODO: indicate on UI
    window.clearTimeout(solveTimeout);
    solveTimeout = null;
  }
}

function invalidateSolverWordlist() {
  solveWordlist = null;
}

function showMenu(e) {
  let menus = document.querySelectorAll("#toolbar .menu");
  for (let i = 0; i < menus.length; i++) {
    menus[i].classList.add("hidden");
  }
  const id = e.target.getAttribute("id");
  let menu = document.getElementById(id + "-menu");
  if (menu) {
    menu.classList.remove("hidden");
  }
}

function hideMenu(e) {
  e.target.classList.add("hidden");
}

function setDefault(e) {
  let button = e.target.closest("button");
  let d = button.parentNode.querySelector(".default");
  d.classList.remove("default");
  button.classList.add("default");
  menuButton = document.getElementById(button.parentNode.getAttribute("id").replace("-menu", ""));
  menuButton.innerHTML = button.innerHTML;
}

function doDefault(e) {
  const id = e.target.parentNode.getAttribute("id");
  let menu = document.getElementById(id + "-menu");
  if (menu) {
    let d = menu.querySelector(".default");
    d.click();
  }
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * max) + min;
}

function randomLetter() {
  let alphabet = "AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMMNNNNNNOOOOOOOOPPQRRRRRRSSSSSSTTTTTTUUUUVVWWXYYZ";
  return alphabet[randomNumber(0, alphabet.length)];
}
