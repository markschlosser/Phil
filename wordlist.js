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

openDefaultWordlist("https://raw.githubusercontent.com/jmviz/Phil/master/wordlists/peter-broda-wordlist__unscored.txt");

let acrossMatchList = document.getElementById("across-matches");
let downMatchList = document.getElementById("down-matches");

acrossMatchList.addEventListener('dblclick', fillGridWithMatch);
downMatchList.addEventListener('dblclick', fillGridWithMatch);

let acrossMatches = [];
let downMatches = [];

let acrossMatchHyperListConfig = {
  height: "84%",
  itemHeight: 19,
  total: 0,
  generate(index) {
    const el = document.createElement('li');
    el.innerHTML = acrossMatches[index];
    return el;
  }
}

let downMatchHyperListConfig = {
  height: "84%",
  itemHeight: 19,
  total: 0,
  generate(index) {
    const el = document.createElement('li');
    el.innerHTML = downMatches[index];
    return el;
  }
}

let acrossMatchHyperList = HyperList.default.create(acrossMatchList, acrossMatchHyperListConfig);
let downMatchHyperList = HyperList.default.create(downMatchList, downMatchHyperListConfig);


//____________________
// F U N C T I O N S

function addToWordlist(newWords) {
  for (let i = 0; i < newWords.length; i++) {
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
    // Makes sure the document is ready to parse, and it's found the file.
    if (textFile.readyState === 4 && textFile.status === 200) {  
      const words = textFile.responseText.split(/\s/g);
      addToWordlist(words);
      sortWordlist();
      console.log("Loaded default wordlist from remote.");
    } else {}
  };
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
  const wordLength = word.length;
  const actualLettersInWord = word.replace(/-/g, "").length;
  if (actualLettersInWord < wordLength) { // Don't search if already filled
    word = word.split(DASH).join("\\w");
    const pattern = new RegExp(word);
    let matches = [];
    for (let i = 0; i < wordlist[wordLength].length; i++) {
      if (wordlist[wordLength][i].search(pattern) > -1) {
        matches.push(wordlist[wordLength][i]);
      }
    }
    return matches;
  } else {
    return [];
  }
}

function matchWordStrict(square, direction, isFirstCall) {
  let [oppDir, axis, oppAxis] =
    (direction == ACROSS) ? [DOWN, "row", "col"] : [ACROSS, "col", "row"];
  let matches = matchFromWordlist(square[direction + "Word"]);
  let start = square[direction + "StartIndex"];
  let end = square[direction + "EndIndex"];
  let lineIndex = square[axis];
  let line = getLine(direction, lineIndex);
  let array = line.slice(start, end);
  for (let k = start; k < end; k++) {
    if (line[k] == BLANK) {
      let arrayIndex = k - start;
      let index = getStringIndex(array, arrayIndex);
      let cross = (direction == ACROSS) ? getWordAt(lineIndex, k, oppDir): getWordAt(k, lineIndex, oppDir);
      if (!cross.split("").every(c => c == DASH)) {
        let crossLine = getLine(oppDir, k);
        let [crossStart, crossEnd] = getWordIndices(crossLine, oppDir, lineIndex);
        let crossArray = crossLine.slice(crossStart, crossEnd);
        let crossArrayIndex = lineIndex - crossStart;
        let crossIndex = getStringIndex(crossArray, crossArrayIndex);
        let crossSquare = {};
        crossSquare[oppDir + "Word"] = cross;
        crossSquare[oppAxis] = k;
        crossSquare[oppDir + "StartIndex"] = crossStart;
        crossSquare[oppDir + "EndIndex"] = crossEnd;
        if (isFirstCall) {
          crossMatches = matchWordStrict(crossSquare, oppDir, false);
        } else {
          crossMatches = matchFromWordlist(cross);
        }
        let letters = [];
        for (let crossMatch of crossMatches) {
          if (!letters.includes(crossMatch[crossIndex])) {
            letters.push(crossMatch[crossIndex]);
          }
        }
        matches = matches.filter(m => letters.includes(m[index]));
      }
    }
  }
  return matches;
}

function updateMatchesUI() {
  acrossMatches = [];
  downMatches = [];
  if (isStrictMatching) {
    acrossMatches = matchWordStrict(current, ACROSS, true);
    downMatches = matchWordStrict(current, DOWN, true);
  } else {
    acrossMatches = matchFromWordlist(current.acrossWord);
    downMatches = matchFromWordlist(current.downWord);
  }

  acrossMatchHyperListConfig.total = acrossMatches.length;
  acrossMatchHyperList.refresh(acrossMatchList, acrossMatchHyperListConfig);
  acrossMatchList.scrollTop = 0;
  downMatchHyperListConfig.total = downMatches.length;
  downMatchHyperList.refresh(downMatchList, downMatchHyperListConfig);
  downMatchList.scrollTop = 0;

  let row = getLine(ACROSS, current.row);
  let acrossWordUpto = row.slice(current.acrossStartIndex, current.col);
  let acrossIndex = acrossWordUpto.reduce((a,b) => a + b.length, 0);
  let acrossHist = new Array(alphabet.length).fill(0);
  for (let i = 0; i < acrossMatches.length; i++) {
    let match = acrossMatches[i];
    let alphabetIndex = alphabet.indexOf(match[acrossIndex]);
    if (alphabetIndex >= 0) acrossHist[alphabetIndex]++;
  }
  acrossChart.data.datasets[0].data = acrossHist;
  acrossChart.options.scales.xAxes[0].ticks.max = Math.max(1, Math.max(...acrossHist));

  let col = getLine(DOWN, current.col);
  let downWordUpto = col.slice(current.downStartIndex, current.row);
  let downIndex = downWordUpto.reduce((a,b) => a + b.length, 0);
  let downHist = new Array(alphabet.length).fill(0);
  for (let i = 0; i < downMatches.length; i++) {
    let match = downMatches[i];
    let alphabetIndex = alphabet.indexOf(match[downIndex]);
    if (alphabetIndex >= 0) downHist[alphabetIndex]++;
  }
  downChart.data.datasets[0].data = downHist;
  downChart.options.scales.xAxes[0].ticks.max = Math.max(1, Math.max(...downHist));

  let primary = getComputedStyle(document.body).getPropertyValue('--primary-color');
  let zero = getComputedStyle(document.body).getPropertyValue('--chart-label-zero-color');
  let labelColors = acrossHist.map((x, i) => x && downHist[i] ? primary : zero);
  acrossChart.options.plugins.datalabels.color = labelColors;
  downChart.options.plugins.datalabels.color = labelColors;
  acrossChart.update();
  downChart.update();
}

function fillGridWithMatch(e) {
  if (e.target && e.target.matches("li")) {
    const li = e.target;
    const match = li.innerHTML.toUpperCase();
    let k = 0;
    let oldWord = [];
    let newWord = [];
    let start = -1;
    let end = -1;
    const dir = (li.parentNode.id == "across-matches") ? ACROSS : DOWN;
    if (dir == ACROSS) {
      start = current.acrossStartIndex;
      end = current.acrossEndIndex;
      for (let j = start; j < end; j++) {
        oldWord.push(xw.fill[current.row][j]);
        xw.fill[current.row][j] = match.slice(k, k + xw.fill[current.row][j].length);
        newWord.push(xw.fill[current.row][j]);
        k += xw.fill[current.row][j].length;
      }
    } else {
      start = current.downStartIndex;
      end = current.downEndIndex;
      for (let i = start; i < end; i++) {
        oldWord.push(xw.fill[i][current.col]);
        xw.fill[i][current.col] = match.slice(k, k + xw.fill[i][current.col].length);
        newWord.push(xw.fill[i][current.col]);
        k += xw.fill[i][current.col].length;
      }
    }
    isMutated = true;
    let state = {
      "row": current.row,
      "col": current.col,
      "direction": dir,
      "start": start,
      "end": end,
      "old": oldWord,
      "new": newWord
    };
    actionTimeline.record(new Action("fillMatch", state));
    console.log("Filled '" + li.innerHTML + "' going " + dir);
    updateUI();
    grid.focus();
  }
}
