const CDP = require('chrome-remote-interface');
const { spawn } = require('child_process');

const SPAWN_WAIT = 3000;

const TRACE_CATEGORIES = [
  '-*',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'toplevel',
  'blink.console',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-devtools.screenshot',
  'disabled-by-default-v8.cpu_profile',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-v8.cpu_profiler.hires'
];

const SAMPLING_FREQUENCY = 10000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs the Chrome remote client and returns the profiling data.
 */
async function runner(options) {
  let client;
  let app;
  let data = [];
  try {
    if (options.spawnCommand) {
      app = spawn(...options.spawnCommand);
      await sleep(options.spawnWait || SPAWN_WAIT);
    }
    client = await CDP(options.connection);
    if (options.setupHandler) {
      await options.setupHandler(client);
    }
    await client.Network.enable();
    await client.Runtime.enable();
    await client.Page.enable();
    await client.Page.navigate({url: options.url});
    await client.Page.loadEventFired();
    if (options.afterLoadHandler) {
      data = await options.afterLoadHandler(client);
    }
  } catch (err) {
      console.error(err);
  } finally {
    if (client) {
      if (options.spawnCommand && options.closeBrowser) {
        try {
          await client.Browser.close();
        } catch (e) {
          try {
            process.kill(-app.pid);
          } catch (e) { app.kill(); }
        }
      }
      await client.close();
    }
  }
  return data;
}

/**
 * remote task
 *    - name:       Name of the remote task. Needed to resolve
 *                  `done` correctly when finished.
 *    - profiling:  Set to `true` if the task should be profiled.
 *                  The profiling data can be accessed in the final
 *                  data by the task name.
 *    - task:       Task to run remotely. Gets `done` and `window` as arguments.   
 */
function remote(name, profiling, task) {
  return {name, profiling, task, type: 'remote'};
}

/**
 * local task
 *    - done:   Promise to fullfill the local task or `null`.
 *    - task:   Task to run locally. Gets `client``as argument.
 */
function local(done, task) {
  return {done, task, type: 'local'};
}

/**
 * Convenient function to wait before calling next task.
 */
function wait(ms) {
  return local(null, async () => sleep(ms));
}

/**
 * Registers a method to read remote console calls.
 * On every data event the from remote it checks
 * for a matching task name of a registered
 * remote task and resolves the wait promise.
 * Returns a function to register a name with an resolver.
 */
function waitForConsole(client) {
  const resolvers = {};
  client.Runtime.consoleAPICalled(data => {
    if (data.args.length && data.args[0].value) {
      const value = data.args[0].value;
      const symbols = Object.getOwnPropertyNames(resolvers);
      for (let i = 0; i < symbols.length; ++i) {
        if (value === symbols[i]) {
          resolvers[value]();
          delete resolvers[value];
        }
      }
    }
  });
  return (symbol, resolve) => {
    resolvers[symbol] = resolve;
  }
}

/**
 * Run local and remote tasks.
 * Returns the timeline profiling data as `{remote_task_name: data}`.
 */
async function timeline(options, tasks) {
  const opts = Object.assign({}, options);
  opts.afterLoadHandler = async (client) => {
    const data = {};
    const wait = waitForConsole(client);
    for (let i = 0; i < tasks.length; ++i) {
      const task = tasks[i];
      if (task.type === 'remote') {
        let events = [];
        const taskDone = new Promise(resolve => wait(task.name, resolve));
        if (task.profiling) {
          await client.Tracing.start({
            categories: TRACE_CATEGORIES.join(','),
            options: `sampling-frequency=${SAMPLING_FREQUENCY}`
          });
          client.Tracing.dataCollected(data => { events = events.concat(data.value); });
        }
        await client.Runtime.evaluate({expression: `(${task.task})(() => console.debug("${task.name}"), window)`});
        await taskDone;
        if (task.profiling) {
          await client.Tracing.end();
          await client.Tracing.tracingComplete();
          data[task.name] = events;
        }
      } else {
        await task.task(client);
        await task.done;
      }
    }
    return data;
  }
  return await runner(opts);
}

module.exports = {
  remote,
  local,
  wait,
  timeline,
  processors: require('./processors')
}
