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

let wordlist = [
  [], [], [], [], [],
  [], [], [], [], [],
  [], [], [], [], [],
  [], [], [], [], [],
  [], [], [], [], [],
  [], [], [], [], [],
  [], [], [], [], [], []
];

openDefaultWordlist("https://raw.githubusercontent.com/keiranking/Phil/master/WL-SP.txt");

//____________________
// F U N C T I O N S

function addToWordlist(newWords) {
  for (i = 0; i < newWords.length; i++) {
    const word = newWords[i].trim().toUpperCase();
    if (word.length < wordlist.length) { // Make sure we don't access outside the wordlist array
      wordlist[word.length].push(word);
    }
  }
}

function sortWordlist() {
  for (let i = 3; i < wordlist.length; i++) {
    wordlist[i].sort();
  }
}

function openWordlist() {
  document.getElementById("open-wordlist-input").click();
}

function openWordlistFile(e) {
  wordlist = [
    [], [], [], [], [],
    [], [], [], [], [],
    [], [], [], [], [],
    [], [], [], [], [],
    [], [], [], [], [],
    [], [], [], [], [],
    [], [], [], [], [], []
  ];

  const file = e.target.files[0];
  if (!file) {
    return;
  }
  let reader = new FileReader();
  reader.onload = function(e) {
    const words = e.target.result.split(/\s/g);
    addToWordlist(words);
    sortWordlist();
    removeWordlistDuplicates();
    invalidateSolverWordlist();
  };
  reader.readAsText(file);
}

function openDefaultWordlist(url) {
  let textFile = new XMLHttpRequest();
  textFile.open("GET", url, true);
  textFile.onreadystatechange = function() {
    if (textFile.readyState === 4 && textFile.status === 200) {  // Makes sure the document is ready to parse, and it's found the file.
      const words = textFile.responseText.split(/\s/g);
      addToWordlist(words);
      sortWordlist();
      console.log("Loaded default wordlist.")
    }
  }
  textFile.send(null);
}

function removeWordlistDuplicates() {
  for (let i = 3; i < wordlist.length; i++) {
    if (wordlist[i].length >= 2) {
      for (let j = wordlist[i].length - 1; j >0; j--) {
        if (wordlist[i][j] == wordlist[i][j - 1]) {
          wordlist[i].splice(j, 1);
        }
      }
    }
  }
}

function matchFromWordlist(word) {
  const l = word.length;
  const actualLettersInWord = word.replace(/-/g, "").length;
  if (actualLettersInWord >= 1 && actualLettersInWord < l) { // Only search if word isn't completely blank or filled
    word = word.split(DASH).join("\\w");
    const pattern = new RegExp(word);
    let matches = [];
    for (let i = 0; i < wordlist[l].length; i++) {
      if (wordlist[l][i].search(pattern) > -1) {
        matches.push(wordlist[l][i]);
      }
    }
    return matches;
  } else {
    return [];
  }
}

function matchWordStrict(square, direction, isFirstCall) {
  let matches = [];
  if (direction == ACROSS) {
    matches = matchFromWordlist(square.acrossWord);
    let row = square.row;
    let start = square.acrossStartIndex;
    let end = square.acrossEndIndex;
    for (let j = start; j < end; j++) {
      if (xw.fill[row][j] == BLANK) {
        let cross = getWordAt(row, j, DOWN);
        if (!cross.split("").every(c => c == DASH)) {
          let colText = "";
          for (let i = 0; i < xw.rows; i++) {
            colText += xw.fill[i][j];
          }
          let [crossStart, crossEnd] = getWordIndices(colText, DOWN, row);
          let index = row - crossStart;
          let crossMatches = [];
          let crossSquare = {
            "downWord": cross,
            "col":j,
            "downStartIndex": crossStart,
            "downEndIndex": crossEnd
          };
          if (isFirstCall) {
            crossMatches = matchWordStrict(crossSquare, DOWN, false);
          } else {
            crossMatches = matchFromWordlist(cross);
          }
          let letters = [];
          for (let c of crossMatches) {
            if (!letters.includes(c[index])) letters.push(c[index]);
          }
          matches = matches.filter(m => letters.includes(m[j-start]));
        }
      }
    }
  } else {
    matches = matchFromWordlist(square.downWord);
    let col = square.col;
    let start = square.downStartIndex;
    let end = square.downEndIndex;
    for (let i = start; i < end; i++) {
      if (xw.fill[i][col] == BLANK) {
        let cross = getWordAt(i, col, ACROSS);
        if (!cross.split("").every(c => c == DASH)) {
          let rowText = xw.fill[i];
          let [crossStart, crossEnd] = getWordIndices(rowText, ACROSS, col);
          let index = col - crossStart;
          let crossMatches = [];
          let crossSquare = {
            "acrossWord": cross,
            "row":i,
            "acrossStartIndex": crossStart,
            "acrossEndIndex": crossEnd
          };
          if (isFirstCall) {
            crossMatches = matchWordStrict(crossSquare, ACROSS, false);
          } else {
            crossMatches = matchFromWordlist(cross);
          }          
          let letters = [];
          for (let c of crossMatches) {
            if (!letters.includes(c[index])) letters.push(c[index]);
          }
          matches = matches.filter(m => letters.includes(m[i-start]));
        }
      }
    }
  }
  return matches;
}

function updateMatchesUI() {
  let acrossMatchList = document.getElementById("across-matches");
  let downMatchList = document.getElementById("down-matches");
  acrossMatchList.innerHTML = "";
  downMatchList.innerHTML = "";
  let acrossMatches = [];
  let downMatches = [];
  if (isStrictMatching) {
    acrossMatches = matchWordStrict(current, ACROSS, true);
    downMatches = matchWordStrict(current, DOWN, true);
  } else {
    acrossMatches = matchFromWordlist(current.acrossWord);
    downMatches = matchFromWordlist(current.downWord);
  }
  for (i = 0; i < acrossMatches.length; i++) {
    let li = document.createElement("LI");
    li.innerHTML = acrossMatches[i].toLowerCase();
    li.className = "";
    // li.addEventListener('click', printScore);
    li.addEventListener('dblclick', fillGridWithMatch);
    acrossMatchList.appendChild(li);
  }
  for (i = 0; i < downMatches.length; i++) {
    let li = document.createElement("LI");
    li.innerHTML = downMatches[i].toLowerCase();
    li.className = "";
    li.addEventListener('dblclick', fillGridWithMatch);
    downMatchList.appendChild(li);
  }
}

function fillGridWithMatch(e) {
  const li = e.currentTarget;
  const fill = li.innerHTML.toUpperCase();
  const dir = (li.parentNode.id == "across-matches") ? ACROSS : DOWN;

  if (dir == ACROSS) {
    xw.fill[current.row] = xw.fill[current.row].slice(0, current.acrossStartIndex) + fill + xw.fill[current.row].slice(current.acrossEndIndex);
    for (let i = current.acrossStartIndex; i < current.acrossEndIndex; i++) {
      const square = grid.querySelector('[data-row="' + current.row + '"]').querySelector('[data-col="' + i + '"]');
      square.lastChild.innerHTML = fill[i - current.acrossStartIndex];
    }
  } else {
    for (let j = current.downStartIndex; j < current.downEndIndex; j++) {
      xw.fill[j] = xw.fill[j].slice(0, current.col) + fill[j - current.downStartIndex] + xw.fill[j].slice(current.col + 1);
      const square = grid.querySelector('[data-row="' + j + '"]').querySelector('[data-col="' + current.col + '"]');
      square.lastChild.innerHTML = fill[j - current.downStartIndex];
    }
  }
  isMutated = true;
  console.log("Filled '" + li.innerHTML + "' going " + dir);
  // updateActiveWords();
  // updateMatchesUI();
  updateUI();
  grid.focus();
}
