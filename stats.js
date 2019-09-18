Chart.defaults.global.defaultFontFamily =
  getComputedStyle(document.body).getPropertyValue('--font-family-mono');
Chart.defaults.global.defaultFontColor =
  getComputedStyle(document.body).getPropertyValue('--secondary-color');

var letterChart;
var wordChart;

class BarChartSpec {
  constructor(id, label, labels, data) {
    this.ctx = document.getElementById(id);
    this.config = {
        type: 'horizontalBar',
        // type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--tertiary-color'),
                borderColor: getComputedStyle(document.body).getPropertyValue('--secondary-color'),
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    offset: -2,
                    font: {
                        size: 10
                    }
                }
            },
            tooltips: {
                "enabled": false
            },
            legend: {
                display: false
                // labels: {
                //     fontFamily: getComputedStyle(document.body).getPropertyValue('--font-family-sans')
                // }
            },
            scales: {
                xAxes: [{
                    display: false,
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        max: Math.max(...data) + 10,
                        display: false,
                        beginAtZero: true
                    }
                }],
                yAxes: [{
                    gridLines: {
                        display: false
                    }
                }]
            },
            responsive: true,
            maintainAspectRatio: true
        }
    };
  }
}

class Stats {
  constructor() {
    this.alphabet = [
      'A','B','C','D','E','F','G','H','I','J','K','L','M',
      'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ];
    this.scrabblePoints = [1,3,3,2,1,4,2,4,1,8,5,1,3,1,1,3,10,1,1,1,1,4,4,8,4,10];
    this.letterCounts = new Array(this.alphabet.length).fill(0);
    this.letters = 0;
    this.wordLengths = [...Array(Math.max(xw.rows, xw.cols)).keys()].map(x => ++x);
    this.wordCounts = new Array(this.wordLengths.length).fill(0);
    this.wordCounts[xw.rows-1] += xw.cols;
    this.wordCounts[xw.cols-1] += xw.rows;
    this.squares = xw.rows * xw.cols;
    this.openSquares = this.fullyConnectedSquares = this.squares;
    this.openSquaresPct = this.fullyConnectedSquaresPct = 1;
    this.blocks = 0;
    this.blocksPct = 0;
    this.words = xw.rows + xw.cols;
    this.avgWordLength = 2 * this.openSquares / this.words;
    this.scrabbleTotal = 0;
    this.avgScrabblePoints = 0;
  }
  update() {
    this.wordCounts.fill(0);
    this.letterCounts.fill(0);
    this.letters = 0;
    this.openSquares = 0;
    this.fullyConnectedSquares = 0;
    this.blocks = 0;
    this.words = 0;
    this.scrabbleTotal = 0;
    let wordLengthTotal = 0;
    let onWord = false;
    let length = 0;
    for (let i = 0; i < xw.rows; i++) {
      for (let j = 0; j < xw.cols; j++) {
        let fill = xw.fill[i][j];
        for (let k = 0; k < this.alphabet.length; k++) {
          if (fill == this.alphabet[k]) {
            this.letters++;
            this.letterCounts[k]++;
            this.scrabbleTotal += this.scrabblePoints[k];
          }
        }
        if (fill == BLOCK) {
          this.blocks++;
        }
        if (fill != BLOCK) {
          if (
              (xw.fill[i-1] === undefined || xw.fill[i-1][j] != BLOCK) &&
              (xw.fill[i+1] === undefined || xw.fill[i+1][j] != BLOCK) &&
              (xw.fill[i][j-1] != BLOCK) &&
              (xw.fill[i][j+1] != BLOCK)
          ) {
            this.fullyConnectedSquares++;
            if (
                (xw.fill[i-1] === undefined || xw.fill[i-1][j-1] != BLOCK) &&
                (xw.fill[i-1] === undefined || xw.fill[i-1][j+1] != BLOCK) &&
                (xw.fill[i+1] === undefined || xw.fill[i+1][j-1] != BLOCK) &&
                (xw.fill[i+1] === undefined || xw.fill[i+1][j+1] != BLOCK)
            ) {
              this.openSquares++;
            }
          }
          if (!onWord) {
            onWord = true;
          }
          length++;
        }
        if (fill == BLOCK || j == xw.cols-1) {
          if (onWord) {
            onWord = false;
            this.wordCounts[length-1]++;
            this.words++;
            wordLengthTotal += length;
            length = 0;
          }
        }
      }
    }
    for (let j = 0; j < xw.cols; j++) {
      for (let i = 0; i < xw.rows; i++) {
        let fill = xw.fill[i][j];
        if (fill != BLOCK) {
          if (!onWord) {
            onWord = true;
          }
          length++;
        }
        if (fill == BLOCK || i == xw.rows-1) {
          if (onWord) {
            onWord = false;
            this.wordCounts[length-1]++;
            this.words++;
            wordLengthTotal += length;
            length = 0;
          }
        }
      }
    }
    this.openSquaresPct = this.openSquares / this.squares;
    this.fullyConnectedSquaresPct = this.fullyConnectedSquares / this.squares;
    this.blocksPct = this.blocks / this.squares;
    this.avgWordLength = wordLengthTotal / this.words;
    this.avgScrabblePoints = (this.letters == 0) ? 0 : this.scrabbleTotal / this.letters;
  }
}

function updateStatsUI(init) {
  if (init) {
    if(letterChart) {
      letterChart.destroy();
      wordChart.destroy();
    }
    stats = new Stats();
    let letterChartSpec = new BarChartSpec(
      'letter-chart',
      'Letters',
      // stats.alphabet.map(a => a.toLowerCase()),
      stats.alphabet,
      stats.letterCounts
    );
    letterChart = new Chart(letterChartSpec.ctx, letterChartSpec.config);
    let wordChartSpec = new BarChartSpec(
      'word-chart',
      'Words',
      stats.wordLengths,
      stats.wordCounts
    );
    wordChart = new Chart(wordChartSpec.ctx, wordChartSpec.config);
  } else {
    stats.update();
    letterChart.data.datasets[0].data = stats.letterCounts;
    letterChart.options.scales.xAxes[0].ticks.max = Math.max(...stats.letterCounts) + 10;
    letterChart.update();
    wordChart.data.datasets[0].data = stats.wordCounts;
    wordChart.options.scales.xAxes[0].ticks.max = Math.max(...stats.wordCounts) + 10;
    wordChart.update();
  }
  updateStatsTable();
}

function updateStatsTable() {
  document.getElementById("stats-words").innerHTML =
    stats.words.toString();
  document.getElementById("stats-avg-word-length").innerHTML =
    preciseRound(stats.avgWordLength, 2);
  document.getElementById("stats-blocks").innerHTML =
    stats.blocks.toString().concat(" (", preciseRound(100 * stats.blocksPct, 2), "%)");
  document.getElementById("stats-fully-connected-squares").innerHTML =
    stats.fullyConnectedSquares.toString().concat(" (", preciseRound(100 * stats.fullyConnectedSquaresPct, 2), "%)");
  document.getElementById("stats-open-squares").innerHTML =
    stats.openSquares.toString().concat(" (", preciseRound(100 * stats.openSquaresPct, 2), "%)");
  document.getElementById("stats-letters").innerHTML =
    stats.letters.toString();
  document.getElementById("stats-avg-scrabble-points").innerHTML =
    preciseRound(stats.avgScrabblePoints, 2);
}

function preciseRound(num, decimals) {
    let sign = num >= 0 ? 1 : -1;
    return (Math.round((num*Math.pow(10,decimals)) + (sign*0.001)) / Math.pow(10,decimals)).toFixed(decimals);
}

function updateStatsUIColors() {
  let fontColor = getComputedStyle(document.body).getPropertyValue('--secondary-color');
  let barColor = getComputedStyle(document.body).getPropertyValue('--tertiary-color');
  Chart.defaults.global.defaultFontColor = fontColor;
  letterChart.data.datasets[0].backgroundColor = barColor;
  letterChart.data.datasets[0].borderColor = fontColor;
  wordChart.data.datasets[0].backgroundColor = barColor;
  wordChart.data.datasets[0].borderColor = fontColor;
  letterChart.update();
  wordChart.update();
}
