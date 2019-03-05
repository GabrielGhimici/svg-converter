const convert = require('xml-js');
const fs = require('fs');
const path = require('path');
let dirPath;
let convertedDirPath;

function init() {
  console.log('Init...');
  const args = process.argv;
  if (args.length > 2) {
    const arg = args[2];
    const argsChunks = arg.split('=');
    if (argsChunks.length < 2) {
      console.log('Please provide filePath argument...');
      process.exit(1);
    } else {
      if (argsChunks[0] != "filePath") {
          console.log('Please provide filePath argument...');
          process.exit(1);
      } else {
          dirPath = path.resolve(argsChunks[1]);
      }
    }
  } else {
    console.log('Please provide file path in format filePath="Path to file"...');
    process.exit(1);
  }
}

function processDir() {
  if (!dirPath) {
    console.log('No directory path');
    process.exit(0);
  }
  fs.readdir(dirPath, function(err, items) {
    if (err) {
      console.log('Unable to find directory: ' + dirPath);
      process.exit(1);
    }
    const targetItems = items.filter((element) => {
      return element.endsWith('.svg')
    });
    if (targetItems.length > 0) {
      convertedDirPath = `${dirPath}/converted_${Date.now()}`;
      fs.mkdirSync(convertedDirPath);
      console.log(`${convertedDirPath} has been created...`);
    }
    for (let i=0; i<targetItems.length; i++) {
      const fileInProcess = targetItems[i]
      fs.open(`${dirPath}/${targetItems[i]}`, 'r', (err, fileToRead) => {
        if (!err){
          fs.readFile(fileToRead, {encoding: 'utf-8'}, (err, data)=> {
            if (!err){
              console.log(`${fileInProcess} opened...`);
              processFile(data, fileInProcess);
              fs.close(fileToRead, () => {
                console.log(`${fileInProcess} closed...`);
              })
            } else {
              console.log(err);
              process.exit(1);
            }
          });
        } else {
          console.log(err);
          process.exit(1);
        }
      });
    }
  });
}

function processFile(fileContent, fileName) {
  console.log(`${fileName} processing...`);
  const parsedJSON = JSON.parse(convert.xml2json(fileContent, {compact: true, spaces: 4}));
  const resultJSON = {
    _declaration: {
      _attributes: {
        version: "1.0",
        encoding: "UTF-8"
      }
    },
    svg: {
      _attributes: {
        viewBox: "0 0 24 24",
        version: "1.1",
        xmlns: "http://www.w3.org/2000/svg",
        'xmlns:xlink': "http://www.w3.org/1999/xlink"
      },
      path: [
        {
          _attributes: {
            d: "M0 0h24v24H0z",
            fill: "none"
          }
        }
      ]
    }
  }
  const foundPath = findPath(parsedJSON);
  if (foundPath) {
    resultJSON.svg.path.push(foundPath);
    const newXML = convert.json2xml(resultJSON, {compact: true, ignoreComment: true, spaces: 4});
    const buffer = new Buffer(newXML);
    
    fs.open(`${convertedDirPath}/${fileName}`, 'w', (err, fileToWrite) => {
      if (err) {
        console.log(err);
      }
      fs.write(fileToWrite, buffer, 0, buffer.length, null, (err) => {
        if (err) {
          console.log(err);
        }
        fs.close(fileToWrite, () => {
          console.log(`${fileName} written...`);
        })
      });
    });
  }
}

function findPath(data) {
  if (!data.svg) return null;
  if (data.svg.path && data.svg.path instanceof Array && data.svg.path.length == 2) {
    return data.svg.path.find(el => el._attributes.d !== "M0 0h24v24H0z") || null;
  }
  if (data.svg.defs && data.svg.defs.path && data.svg.defs.path instanceof Array) {
    return data.svg.defs.path.find(el => el._attributes.d !== "M0 0h24v24H0z") || null;
  } else {
    return data.svg.defs.path;
  }
  return null;
}

function app() {
  init();
  console.log("Processing directory: " + dirPath);
  processDir()
}

app();