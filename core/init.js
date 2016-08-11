var inquirer = require('inquirer'),
    path = require('path'),
    colors = require('colors'),
    _ = require('lodash'),
    fs = require('fs');
var emptyDir = require('empty-dir');
var Util = require('./util');

var COMMON_CONGIG_FILE_PATH = '../../lib/mz-i18n-conf.json';
var IGNORE_SOURCE_DIRS = ['i18n-php-server'];
var allVersion = [];


var i18nFilePath = '_i18n.json';
var fisConfPath = 'fis-conf.js';
var commonPhpPath = 'test/common.php';
var commonConfig; 

var parentPath = process.cwd().split('/').slice(0, -1).join('/'),
    currentPath = process.cwd(),
    currentDirName = currentPath.split('/').slice(-1)[0];


var Init = function(){  
    if (!/source.[\w]+$/.test(currentPath)) {
        fis.log.warn('请先创建新国家文件夹并进入操作!'); return;
    }
    if (emptyDir.sync('.')) {
        askToInit();
    } else {
        checkContinue(function(){
            askToInit();  
        });
    }
};


var askToInit = function(){
    allVersion = fs.readdirSync('..').filter(function(path) {
        return (fs.lstatSync('../' + path).isDirectory() && 
                IGNORE_SOURCE_DIRS.indexOf(path) < 0 &&
                currentDirName !== path);
    });
    commonConfig = JSON.parse(fs.readFileSync(COMMON_CONGIG_FILE_PATH));
    ask();
};


var checkContinue = function(cb){
    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: '你这个文件夹不是空的哦，覆盖吗?'
    }], function(answers){
        if ( answers.confirm ) {
            cb();
        } else {
            console.log('Bye~');
        }
    });
};


var ask = function(){
    //not remove
    console.log();  
    var answers = {};
    var needMapping = function(){
        return  function(){
            
        };
    };
    
    var questions = [
        {
            type: 'input',
            name: 'originName',
            message: '你想从那个国家同步?',
            filter: function(value){
                return value.trim();
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else if ( allVersion.indexOf(value.trim()) < 0 ) {
                    return '没有这个国家';
                } else {
                    return true; 
                }
            }
        },
        {
            type: 'input',
            name: 'urlprefix',
            message: 'what is urlprex?',
            filter: function(value){
                if ( /^\//.test(value) ) {
                    return value.trim();
                } else {
                    return '/' + value.trim();
                }
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else {
                    return true; 
                }
            }
        }, {
            type: 'input',
            name: 'lang',
            message: 'what is lang? (e.x zh-CN)?',
            filter: function(value){
                return value.trim();
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else {
                    return true; 
                }
            }
        }, {
            type: 'input',
            name: 'namespace',
            message: 'what is namespace?',
            filter: function(value){
                return value.trim();
            },
            validate: function(value){
                if ( value.trim() === '' || value === null ) {
                    return false;
                } else {
                    return true; 
                }
            }
        }
    ];
    
    inquirer.prompt(questions, function( answers ) {
        var targetPath = parentPath + '/' + answers.originName;
        var toWriteAnswers = _.clone(answers, true);
        var excludes = [
            '**/products/**',
        ];

        fis.util.copy(targetPath, currentPath, null, excludes);

        // fis-conf
        fis.util.copy(targetPath + '/' + fisConfPath, currentPath + '/' + fisConfPath, null, null);
        rewriteFisConf(answers);

        // common.php
        var commonText = fs.readFileSync(commonPhpPath, 'utf-8');

        fs.writeFileSync(
            commonPhpPath, 
            commonText.replace(/([\'\"])i18n[\'\"]\s*\=>\s*[\'\"]\w+[\'\"]\,/,'$1i18n$1 => $1' + answers.lang + '$1,')
        );

        // i18n
        fs.writeFileSync(i18nFilePath, JSON.stringify(toWriteAnswers, null, "  ") );
    });
};

var rewriteFisConf = function(answers){
    var oldContent = fs.readFileSync(fisConfPath, 'utf-8');
    var newContent = oldContent;
    newContent = newContent.replace(/([\'\"]namespace[\'\"]\s*,\s*[\'\"])\w*([\'\"])/g, function($0, $1, $2){
        return $1 + answers.namespace + $2;
    });
    
    newContent = newContent.replace(/([\'\"]urlprefix[\'\"]\s*,\s*[\'\"])\w*([\'\"])/g, function($0, $1, $2){
        return $1 + answers.urlprefix + $2;
    });
    
    newContent = newContent.replace(/([\'\"]lang[\'\"]\s*,\s*[\'\"])[\w-]*([\'\"])/g, function($0, $1, $2){
        return $1 + answers.lang + $2;
    });
    
    fs.writeFileSync(fisConfPath, newContent);
};


module.exports = Init;
