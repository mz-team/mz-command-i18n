var http = require('http'),
    fs = require('fs'),
    globToRegExp = require('glob-to-regexp'),
    colors = require('colors'),
    async = require('async'),
    request = require('request'),
    _ = require('lodash');


//TODO put it in
var config = require('../config');
var syncsApi = config.syncsApi;

var poReg = globToRegExp('/lang/*');

var updatePo = require('./udpo');

var email = 'yekai@meizu.com';


var matches = fis.media().getSortedMatches();

var failedFilesQueue;
var filesNum = 0;

var poSuccessN = 0,
    poFailN = 0,
    fileSuccessN = 0,
    fileFailN = 0;


var Syncs = function(){
  console.log();

  var pattern = fis.media().get('project.files');
  var files = fis.project.getSourceByPatterns(pattern);

  filesNum = files.length;

  var syncsDirRegs = config.syncsDirs.map(function(regs){
    return globToRegExp(regs);
  });

  var seriesRequest = [];
  var seriesPoRequest = [];

  _.tap(Object.keys(files), function(tf){

    tf.map(function(file){
      if ( poReg.test(file) ) {

        var serverCustomPoFile =  files[file].release;
        var scpt = serverCustomPoFile.split('.');
        scpt.splice(-1, 0, 'custom');
        serverCustomPoFile = scpt.join('.');

        seriesPoRequest.push(function(cb){
          requestServer(file.slice(1), serverCustomPoFile, function(exist, content){
            if ( exist ) {
              updatePoFile(content, file.slice(1));
              poSuccessN++;
            } else {
              poFailN++;
              console.log(('INFO:  po文件[ ' + file.slice + ' ]没有需要同步的内容!'));
            }
            cb(null, true);
          });
        });
      }
    });

  }).filter(function(file){
    return syncsDirRegs.some(function(reg){
      return reg.test(file);
    });
  }).map(function(file){
    var filePath = file.slice(1);

    seriesRequest.push(function(cb){
      requestServer(filePath, files[file].release, function(exist, content){
        if ( exist ) {
          updateFile(content, filePath);
          fileSuccessN++;
        } else {
          fileFailN++;
          console.log(('Error:  服务器说线上不存在[ ' + filePath + ' ]这个文件!').red);
        }
        cb(null, true);
      });
    });
  });


  //sync request start
  async.series(seriesPoRequest, function(err, rst){
    async.series(seriesRequest, function(err, rst){
      showRst();
    });
  });
};


var showRst = function(){
  console.log();
  console.log(('PO语言文件同步成功 ' + poSuccessN + ' 个!').bgGreen);
  //console.log(('PO语言文件同步失败 ' + poFailN + ' 个!').bgYellow.red);
  console.log(('文件同步成功 ' + fileSuccessN + ' 个!').bgGreen);
  console.log(('文件同步失败 ' + fileFailN + ' 个!').bgYellow.red);
  console.log();
};

var updateFile = function(newContent, filePath){
  fs.writeFile(filePath, newContent, function(err){
    if ( err ) {
      console.log(('write file[ ' + filePath + '] fail!').underline.red);
    }
  });
};

var updatePoFile = function(newContent, filePath){
  console.log('UPDATE PO FILE'.bgGreen);
  var content;
  try {
    content = JSON.parse(newContent);
  } catch(error) {
    fis.log.error('解析线上PO内容JSON出了点问题，呵呵哒！');
  }
  var poContent = fs.readFileSync(filePath, 'utf-8');
  poContent = replaceMsgstr(poContent, content);
  updateFile(poContent, filePath);
};



var requestServer = function(filePath, fileRelease, cb){

    var t = + new Date();

    request.post({
      url: syncsApi,
      form: {
        to: fileRelease,
        email: getEmail(),
        domain: config.syncsDomain,
        t: t,
        token: getToken(t)
      }
    }, function(err, httpResponse, body) {


      // console.log("response ============================ ".red);
      // console.log(JSON.stringify(httpResponse).yellow);

      // console.log("body ================================ ".red);
      // console.log(body.green);

      // console.log(filePath.blue);

      if ( !checkServerFileExist(httpResponse) ) {

        return cb(false);
      } else {
        //console.log("err = ", err);
        return cb(true, body);
      }
    });
};

var checkServerFileExist = function(response){
  if ( response.statusCode === 404 ) {
    return false;
  } else {
    return true;
  }
};


var replaceMsgstr = function(content, customData){
  console.log(customData);
  Object.keys(customData).map(function(msgid){
    console.log("msgid = ", msgid);
    var reg = new RegExp(msgid + '"[\\s]*\\nmsgstr[\\s]*".*');
    content = content.replace(reg, msgid + '"\nmsgstr ' + customData[msgid]);
  });
  return content;
};

var getToken = function(date){
  var manageKey = process.env.MZ_FIS_MANAGE_SECRET;
  if ( !manageKey || manageKey === '' ) {
    fis.log.error('大哥，俺找不到 MZ_FIS_MANAGE_SECRET 这个环境变量');
    process.exit();
  }
  return fis.util.md5(fis.util.md5(date +  manageKey ,32), 32);
};

var getEmail = function(){
  if ( email ) {
    return email;
  } else {
    email = process.env.MZ_FIS_EMAIL;
    if ( !email || email === '' ) {
      fis.log.error('大哥，俺找不到 MZ_FIS_EMAIL 这个环境变量');
      process.exit();
    }
    return email;
  }
};

module.exports = Syncs;
