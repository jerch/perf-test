const fs = require('fs');
const path = require('path');
const TraceToTimelineModel = require('devtools-timeline-model');

const mkdirSync = function (dirPath) {
  try {
    fs.mkdirSync(dirPath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

const mkdirpSync = function (dir) {
  const parts = dir.split(path.sep);
  for (let i = 1; i <= parts.length; i++) {
    mkdirSync(path.join.apply(null, parts.slice(0, i)))
  }
}

module.exports['saveToDisk'] = (dir, data) => {
  mkdirpSync(dir);
  const date = Date.now();
  for (const el in data) {
    const filename = path.join(dir, `${date}-${el}.trace`);
    fs.writeFileSync(filename, JSON.stringify(data[el], null, 2));
    console.log('trace saved as', filename);
  }
};

function dumpTree(tree, depth, _depth = 0) {
  var result = new Map();
  tree.children.forEach((value, key) => {
    result.set(`${' '.repeat(_depth * 3)}${key}`, [value['totalTime'].toFixed(1), value['selfTime'].toFixed(1)]);
    if (depth !== _depth && value.children) {
      dumpTree(value, depth, _depth + 1).forEach((value, key) => result.set(key, value));
    }
  });
  return result;
}

module.exports['reportTopDown'] = (data, depth) => {
  for (const el in data) {
    const topDown = new TraceToTimelineModel(data[el]).topDown();
    console.log(`\n#Task ${el}:`);
    console.log(`Top down total time: ${topDown.totalTime}\n`);
    const printData = dumpTree(topDown, depth);
    for (var [key, value] of printData) {
      console.log(value[0].padStart(8, ' '), value[1].padStart(10, ' '), key);
    }
  }
}
