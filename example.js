const { timeline, wait, remote, processors } = require('.');

// global options
let OPTIONS = {
  // optional, chrome must be running locally with debugging port enabled if omitted
  spawnCommand: ['chromium-browser', ['--remote-debugging-port=9222', '--headless']],
  // optional, wait in msec for spawn to complete, defaults to 3000
  spawnWait: 1000,
  // optional, defaults to `{host: 'localhost', port: 9222}`
  connection: {host: 'localhost', port: 9222},
  // optional, close browser when done (only for newly spawned)
  closeBrowser: true,
  // url to navigate to
  url: 'http://localhost:3000'
}


timeline(OPTIONS, [
  wait(1000),
  remote('TASK1', true, (done, window) => {
    window.term._core.handler('ls -lR /usr/lib\r');
    setTimeout(() => done(), 6000); // TODO: needs better remote event
  }),
  remote('TASK2', true, (done, window) => {
    window.term._core.handler('ls -l\r');
    setTimeout(() => done(), 1000); // TODO: needs better remote event
  })
]).then(data => {
  // get top down list in terminal, depth 3
  processors.reportTopDown(data, 3);
  // save traces to disk, can be inspected with performance tab in chrome
  processors.saveToDisk('traces', data);
  // get summaries
  console.log('summaries:\n', processors.summary(data));
});
