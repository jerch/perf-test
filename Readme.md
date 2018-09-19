## Perf test

Evaluating timeline profiling with Chrome for xterm.js.


### What it already does:

- extract timeline profiling data
- top down view in terminal
- summary (like the pie chart in inspector)
- load multiple inspector instances it into a Webpage:

    - run `npm start`
    - open 'localhost:3000' in Chrome
    - place different trace files on the iframes (from `example.js` output)

If the bundled inspector does not work with your Chrome version, try to reextract
the assets of your local installation by running `node extract-devtools.js`.

### TODO:

- better tree view
- eval puppeteer
- dashboard comparison over long time and branches
- viewer for saved profile data
- better test case API
