var i18nFile = '_i18n.json';

module.exports = {
    i18nFile: i18nFile,
    defaultExclude: [
        '*/' + i18nFile,
        '*.custom.*',
        '*/fis-conf.js'
    ],
    defaultInclude: [
        '*'
    ],
    syncsDirs: [
        '/page/*',
        '/test/*',
        '/widget/*'
    ],
    needMappingDirs: [
        '/page/products'
    ],
    frameworkConfigFile:'fis-conf.js',
    syncsDomain: 'www.meizu.com'
};
