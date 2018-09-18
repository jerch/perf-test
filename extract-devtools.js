const { timeline, local } = require('.');
const fse = require('fs-extra');

const pages = [];
const seen = [];

let OPTIONS = {
  spawnCommand: ['chromium-browser', ['--remote-debugging-port=9222']],
  spawnWait: 1000,
  connection: {host: 'localhost', port: 9222},
  closeBrowser: true,
  url: 'chrome-devtools://devtools/bundled/inspector.html',
  setupHandler: client => {
    client.Network.requestWillBeSent((params) => {
      pages.push(params.request.url);
    });
  }
}

async function waitForEnter(msg, release = false) {
  console.log(msg);
  return new Promise(resolve => process.stdin.on('data', () => {
    resolve();
    if (release) {
      process.stdin.end();
    }
  }));
}

async function run() {
  await waitForEnter(`
If the bundled inspector assets are not working for you,
you can try to extract the assets from your local chrome installation.

First delete the folder /static, this script will recreate
the folder with the correct assets for your chrome version.

In the next step Chrome will start up and show the inspector
(if not you need to customize the options in extract-devtools.js).

After the inspector shows up it is important to click through
all tabs to get a hold of the needed assets.

Press [enter]...
  `);
  await timeline(OPTIONS, [
    local(waitForEnter('Press [enter] again...', true), () => null),
    local(null, async client => {
      let page;
      while (page = pages.pop()) {
        if (seen.indexOf(page) !== -1) {
          continue;
        }
        console.log('retrieving:', page.split('://')[1]);
        await client.Page.navigate({url: page});
        seen.push(page);
        try {
          const frameTree = await client.Page.getFrameTree();
          const content = await client.Page.getResourceContent({
            frameId: frameTree.frameTree.frame.id,
            url: page
          });
          if (content.base64Encoded) {
            const buf = Buffer.from(content.content, 'base64');
            fse.outputFileSync('static/' + page.split('://')[1], buf);
          } else {
            fse.outputFileSync('static/' + page.split('://')[1], content.content);
          }
        } catch (e) { console.log('...skipped'); }
      }
    })
  ]);
  console.log('Done extracting inspector assets.');
}

run();
