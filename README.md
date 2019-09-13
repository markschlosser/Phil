# Phil, a crossword maker

<img src="images/screenshot.png" align="right" width="400" height="380">

Phil helps you make crosswords, using client-side JavaScript.
* Import & export .xw ([JSON](https://www.xwordinfo.com/JSON/)) or .puz files.
* Use the built-in dictionary, or any text file you want.
* Print to PDF.
* Create a New York Times submission in seconds.

New to this fork:
* [Bob Copeland's](https://github.com/bcopeland) pure JS auto filler
* NYT Sunday grid (21×21) support
* Custom grid sizes (PDF exports will be wonky)

TODO:
* Cross-checked fill suggestions
* Rebus support
* Stats
* Autofill region

## Related repositories

Phil uses [Font Awesome](https://github.com/FortAwesome/Font-Awesome/) icons and [jsPDF](https://github.com/MrRio/jsPDF/) (along with [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable/)) for generating PDFs.

## Getting started

To use this fork:

1. Go to https://jmviz.github.io/Phil/.

To run this fork locally:

1. Clone this repository.

2. Enter the Phil directory.

3. Run a local webserver. If you have Python 3 installed, then:

   ```
   python3 -m http.server 8000
   ```

   If you have only Python 2 installed, then:

   ```
   python -m SimpleHTTPServer 8000
   ```

4. Point your browser to [localhost:8000](http://localhost:8000).

## Crossword resources

* [OneLook](http://onelook.com/) and [Crossword Tracker](http://crosswordtracker.com/) search engines
* [XWord Info](https://www.xwordinfo.com) (some features require membership)
* [Collected wordlists](http://wiki.puzzlers.org/dokuwiki/doku.php?id=solving:wordlists:about:start) of the National Puzzler's League
* [Crossword theme categories](http://www.cruciverb.com/index.php?action=ezportal;sa=page;p=70)


## License
Licensed under [the Apache License, v2.0](http://www.apache.org/licenses/LICENSE-2.0) (the 'License').

Unless required by law or agreed in writing, software distributed under the License
is distributed on an **'as is' basis, without warranties or conditions**, express or implied.
See the [License](LICENSE.txt) for the specific language governing permissions and limitations.

Original [Phil](https://github.com/keiranking/Phil) Copyright &copy; 2017 [Keiran King](http://www.keiranking.com/).
