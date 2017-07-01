var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var postcss = require('postcss');

var BaseClass = require('../../base').BaseClass;

var _appWrapper;
var appState;


class StaticFilesHelper extends BaseClass {
    constructor() {
        super();

        _appWrapper = window.getAppWrapper();
        appState = _appWrapper.getAppState();

        this.jsFileLoadResolves = {};
        this.cssFileLoadResolves = {};

        this.boundMethods = {
            cssFileChanged: null
        };

        this.timeouts = {
            removeOldCssTags: null
        };

        return this;
    }

    async initialize () {
        return await super.initialize();
    }

    async loadCss (href, noWatch) {
        let utilHelper = _appWrapper.getHelper('util');

        let cssFilePath = href;
        let cssContents = '';
        let compiledCssPath = this.getConfig('appConfig.cssCompiledFile');

        let processDir = process.cwd();
        let processDirRegex = new RegExp('^' + utilHelper.quoteRegex(processDir));

        if (!href.match(processDirRegex)){
            cssFilePath  = path.resolve(path.join('.' + href));
        }

        if (await _appWrapper.fileManager.isFile(cssFilePath)){
            cssContents = await _appWrapper.fileManager.loadFile(cssFilePath);
            if (cssContents){
                cssContents = postcss().process(cssContents, { from: href, to: compiledCssPath });
            }

            if (!noWatch && this.getConfig('liveCss') && this.getConfig('debug.enabled')){
                _appWrapper.fileManager.watch(cssFilePath, {}, this.boundMethods.cssFileChanged);
            }
        } else {
            this.log('Problem loading CSS file "{1}" - file does not exist', 'error', [cssFilePath]);
        }

        return cssContents;
    }

    async addCss (href, noWatch, silent) {
        let utilHelper = _appWrapper.getHelper('util');

        let parentEl = document.getElementsByTagName('head')[0];

        let processDir = process.cwd();
        let processDirRegex = new RegExp('^' + utilHelper.quoteRegex(processDir));

        let hrefPath = href;

        if (href.match(processDirRegex)){
            href = href.replace(processDirRegex, '');
        } else {
            hrefPath = path.join(processDir, href);
        }

        if (!noWatch && this.getConfig('liveCss') && this.getConfig('debug.enabled')){
            _appWrapper.fileManager.watch(hrefPath, {}, this.boundMethods.cssFileChanged);
        }

        var returnPromise = new Promise((resolve) => {
            this.cssFileLoadResolves[href] = resolve;
        });

        if (!parentEl){
            throw new Error('No <head> element!');
        } else {
            if (!silent){
                this.log('Adding CSS file "{1}"...', 'debug', [href]);
            }
            let cssNode = document.createElement('link');

            cssNode.onload = () => {
                // this.log('Loaded CSS file "{1}"...', 'debug', [href]);
                this.cssFileLoadResolves[href](true);
                this.cssFileLoadResolves[href] = null;
            };

            cssNode.setAttribute('rel', 'stylesheet');
            cssNode.setAttribute('type', 'text/css');
            cssNode.setAttribute('href', href);

            parentEl.appendChild(cssNode);
        }
        return returnPromise;
    }

    async refreshCss () {
        var links = window.document.querySelectorAll('link');
        if (links && links.length){
            this.refreshLinkTags(links);
        } else {
            this.log('No CSS files to reload.', 'warning', []);
        }
    }

    async refreshCssFiles (changedFiles) {
        let processDir = process.cwd();
        let processDirRegex = new RegExp('^' + processDir);
        let changedHrefs = _.map(changedFiles, (filePath) => {
            return filePath.replace(processDirRegex, '');
        });

        let linkSelectors = [];
        for(let i=0;i<changedHrefs.length;i++){
            linkSelectors.push('link[href*="' + changedHrefs[i] + '"]');
        }

        let links = window.document.querySelectorAll(linkSelectors.join(', '));

        if (links && links.length){
            this.refreshLinkTags(links);
        } else {
            this.log('No CSS files to reload (1).', 'warning', []);
        }
    }

    refreshLinkTags(links){
        this.log('Reloading {1} CSS files.', 'group', [links.length]);
        let headEl = document.querySelector('head');
        let linkCount = links.length;
        let loadedLinks = 0;
        let newLinks = [];
        for (let i=0; i<links.length; i++) {
            if (links[i].type && links[i].type == 'text/css'){
                this.log('Reloading CSS file "{1}"', 'info', [links[i].href.replace(/^[^/]+\/\/[^/]+/, '').replace(/\?.*$/, '')]);
                let newHref = links[i].href.replace(/\?rand=.*$/, '') + '?rand=' + (Math.random() * 100);
                newLinks[i] = document.createElement('link');

                newLinks[i].onload = (e) => {
                    let newLink = e.target;
                    loadedLinks++;
                    this.log('Reloaded CSS file "{1}"', 'info', [newLink.href.replace(/^[^/]+\/\/[^/]+/, '').replace(/\?.*$/, '')]);
                    if (loadedLinks >= linkCount){
                        clearTimeout(this.timeouts.removeOldCssTags);
                        this.timeouts.removeOldCssTags = setTimeout( () => {
                            clearTimeout(this.timeouts.removeOldCssTags);
                            this.log('Removing {1} old CSS tags', 'group', [linkCount]);
                            for (let j=0; j<links.length;j++){
                                this.log('Removing old CSS file "{1}" tag', 'info', [links[j].href.replace(/^[^/]+\/\/[^/]+/, '').replace(/\?.*$/, '')]);
                                headEl.removeChild(links[j]);
                            }
                            this.log('Removing {1} old CSS tags', 'groupend', [linkCount]);
                            this.log('Reloading {1} CSS files.', 'groupend', [links.length]);
                        }, 100);
                    }
                };

                newLinks[i].setAttribute('rel', 'stylesheet');
                newLinks[i].setAttribute('type', 'text/css');
                newLinks[i].setAttribute('href', newHref);
                headEl.appendChild(newLinks[i]);

            }
        }

    }


    async loadJs (href) {

        var parentEl = document.getElementsByTagName('head')[0];
        if (!href.match(/^\//)){
            href = '../js/' + href;
        }

        var returnPromise = new Promise((resolve) => {
            this.jsFileLoadResolves[href] = resolve;
        });

        if (!parentEl){
            throw new Error('No <head> element!');
        } else {
            this.log('Adding JS file "{1}"...', 'debug', [href]);
            var jsNode = document.createElement('script');

            jsNode.setAttribute('type', 'text/javascript');
            jsNode.setAttribute('src', href);

            jsNode.onload = () => {
                // this.log('Loaded JS file "{1}"...', 'debug', [href]);
                this.jsFileLoadResolves[href](true);
                this.jsFileLoadResolves[href] = null;
            };

            parentEl.appendChild(jsNode);
        }
        return returnPromise;
    }


    async loadCssFiles(silent) {
        this.log('Preparing css files...', 'group', []);
        await this.generateCss(false, silent);
        if (this.getConfig('compileCss')){
            this.addCss(this.getConfig('appConfig.cssCompiledFile'), true, silent);
        }
        this.log('Preparing css files...', 'groupend', []);
    }

    async generateCss(noWatch, silent) {
        if (this.getConfig('compileCss')){
            let compiledCss = await this.compileCss(noWatch, silent);
            if (compiledCss) {
                let compiledCssPath = path.resolve(path.join('.', this.getConfig('appConfig.cssCompiledFile')));
                await this.writeCss(compiledCssPath, compiledCss);
            }
        } else {
            var cssFileData = await this.getCssFileData();

            if (cssFileData.counts.totalCssFileCount){
                if (!silent){
                    this.log('Adding {1} CSS files', 'group', [cssFileData.counts.totalCssFileCount]);
                }

                if (cssFileData.counts.themeInitCssFileCount){
                    for (let i=0; i<cssFileData.files.themeInitCssFiles.length; i++){
                        this.addCss(cssFileData.files.themeInitCssFiles[i], noWatch, silent);
                    }
                }

                if (cssFileData.counts.cssFileCount){
                    for (let i=0; i<cssFileData.files.cssFiles.length; i++){
                        this.addCss(cssFileData.files.cssFiles[i], noWatch, silent);
                    }
                }

                if (cssFileData.counts.themeCssFileCount){
                    for (let i=0; i<cssFileData.files.themeCssFiles.length; i++){
                        this.addCss(cssFileData.files.themeCssFiles[i], noWatch, silent);
                    }
                }

                if (cssFileData.counts.appCssFileCount){
                    for (let i=0; i<cssFileData.files.appCssFiles.length; i++){
                        this.addCss(cssFileData.files.appCssFiles[i], noWatch, silent);
                    }
                }

                if (appState.isDebugWindow){
                    if (cssFileData.counts.debugCssFileCount){
                        for (let i=0; i<cssFileData.files.debugCssFiles.length; i++){
                            this.addCss(cssFileData.files.debugCssFiles[i], noWatch, silent);
                        }
                    }
                    if (cssFileData.counts.appDebugCssFileCount){
                        for (let i=0; i<cssFileData.files.appDebugCssFiles.length; i++){
                            this.addCss(cssFileData.files.appDebugCssFiles[i], noWatch, silent);
                        }
                    }
                }

                if (cssFileData.counts.themeOverrideCssFileCount){
                    for (let i=0; i<cssFileData.files.themeOverrideCssFiles.length; i++){
                        this.addCss(cssFileData.files.themeOverrideCssFiles[i], noWatch, silent);
                    }
                }

                if (!silent){
                    this.log('Adding {1} CSS files', 'groupend', [cssFileData.counts.totalCssFileCount]);
                }
            }
        }
    }

    async writeCss(filePath, cssContents){
        await _appWrapper.fileManager.createDirRecursive(path.dirname(filePath));
        fs.writeFileSync(filePath, cssContents, {flag: 'w'});
    }

    async getCssFileData () {
        let cssFiles = this.getConfig('appConfig.initCssFiles') || [];
        let appCssFiles = this.getConfig('appConfig.cssFiles') || [];
        let debugCssFiles = this.getConfig('appConfig.debugCssFiles') || [];
        let appDebugCssFiles = this.getConfig('appConfig.appDebugCssFiles') || [];

        appCssFiles = _.union(appCssFiles, appState.componentCssFiles);

        cssFiles = _.uniq(_.compact(cssFiles));
        appCssFiles = _.uniq(_.compact(appCssFiles));
        debugCssFiles = _.uniq(_.compact(debugCssFiles));
        appDebugCssFiles = _.uniq(_.compact(appDebugCssFiles));



        let themeInitCssFiles = [];
        let themeCssFiles = [];
        let themeOverrideCssFiles = [];

        let totalCssFileCount = 0;

        let cssFileCount = 0;
        let appCssFileCount = 0;
        let debugCssFileCount = 0;
        let appDebugCssFileCount = 0;

        let themeInitCssFileCount = 0;
        let themeCssFileCount = 0;
        let themeOverrideCssFileCount = 0;

        let themeName = this.getConfig('theme');
        let themeConfig;
        if (themeName){
            themeConfig = await this.getThemeConfig(themeName);
            if (themeConfig && themeConfig.name){
                if (themeConfig.initCssFiles && themeConfig.initCssFiles.length){
                    themeInitCssFiles = _.map(themeConfig.initCssFiles, (file) => {
                        return path.resolve(path.join(themeConfig.path, file));
                    });
                    themeInitCssFileCount += themeConfig.initCssFiles.length;
                    totalCssFileCount += themeConfig.initCssFiles.length;
                }

                if (themeConfig.cssFiles && themeConfig.cssFiles.length){
                    themeCssFiles = _.map(themeConfig.cssFiles, (file) => {
                        return path.resolve(path.join(themeConfig.path, file));
                    });
                    themeCssFileCount += themeConfig.cssFiles.length;
                    totalCssFileCount += themeConfig.cssFiles.length;
                }

                if (themeConfig.overrideCssFiles && themeConfig.overrideCssFiles.length){
                    themeOverrideCssFiles = _.map(themeConfig.overrideCssFiles, (file) => {
                        return path.resolve(path.join(themeConfig.path, file));
                    });
                    themeOverrideCssFileCount += themeConfig.overrideCssFiles.length;
                    totalCssFileCount += themeConfig.overrideCssFiles.length;
                }
            }
        }


        if (cssFiles && cssFiles.length){
            cssFileCount = cssFiles.length;
        }
        if (appCssFiles && appCssFiles.length){
            appCssFileCount = appCssFiles.length;
        }

        if (debugCssFiles && debugCssFiles.length){
            debugCssFileCount = debugCssFiles.length;
        }

        if (appDebugCssFiles && appDebugCssFiles.length){
            appDebugCssFileCount = appDebugCssFiles.length;
        }

        totalCssFileCount += cssFileCount + appCssFileCount;

        if (appState.isDebugWindow){
            totalCssFileCount += debugCssFileCount + appDebugCssFileCount;
        }

        let cssFileData = {
            files: {
                cssFiles,
                appCssFiles,
                debugCssFiles,
                appDebugCssFiles,
                themeInitCssFiles,
                themeCssFiles,
                themeOverrideCssFiles
            },
            counts: {
                cssFileCount,
                appCssFileCount,
                debugCssFileCount,
                appDebugCssFileCount,
                themeInitCssFileCount,
                themeCssFileCount,
                themeOverrideCssFileCount,
                totalCssFileCount
            }
        };

        return cssFileData;
    }

    async getCssFiles () {
        let cssFiles = [];
        let fileData = await this.getCssFileData();
        if (fileData && fileData.files){
            for(let fileGroup in fileData.files){
                for (let i=0; i<fileData.files[fileGroup].length; i++){
                    cssFiles.push(fileData.files[fileGroup][i]);
                }
            }
        }
        return cssFiles;
    }

    async getThemeConfig (themeName) {
        let foundThemeDir = true;
        let themeConfigFile = 'theme';
        let themeConfigPath = '';
        let themeConfig;
        let themeData;
        if (themeName){
            themeData = _.find(appState.availableThemes, {name: themeName});
            if (themeData && themeData.path){
                if (!_appWrapper.fileManager.isDir(themeData.path)){
                    if (!_appWrapper.fileManager.isDir(themeData.path)){
                        foundThemeDir = false;
                    }
                }
            } else {
                foundThemeDir = false;
            }
        } else {
            foundThemeDir = false;
        }

        if (foundThemeDir){
            themeConfigPath = path.join(themeData.path , themeConfigFile);
            themeConfig = await _appWrapper.fileManager.loadFile(themeConfigPath, true);
            if (themeConfig && themeConfig.name){
                themeConfig.path = themeData.path;
            }
        }
        return themeConfig;
    }

    async compileCss (noWatch, silent) {
        var compiledCss = '';
        var cssFileData = await this.getCssFileData();

        if (cssFileData.counts.totalCssFileCount){
            if (!silent){
                this.log('Compiling {1} CSS files', 'group', [cssFileData.counts.totalCssFileCount]);
            }

            if (cssFileData.counts.themeInitCssFileCount){
                if (!silent){
                    this.log('Compiling {1} theme init CSS files', 'group', [cssFileData.counts.themeInitCssFileCount]);
                }
                for (let i=0; i<cssFileData.files.themeInitCssFiles.length; i++){
                    let cssResult = await this.loadCss(cssFileData.files.themeInitCssFiles[i], noWatch);
                    if (cssResult && cssResult.css){
                        let cssContents = cssResult.css;
                        compiledCss += cssContents;
                    }
                }
                if (!silent){
                    this.log('Compiling {1} wrapper CSS files', 'groupend', [cssFileData.counts.cssFileCount]);
                }
            }

            if (cssFileData.counts.cssFileCount){
                if (!silent){
                    this.log('Compiling {1} wrapper CSS files', 'group', [cssFileData.counts.cssFileCount]);
                }
                for (let i=0; i<cssFileData.files.cssFiles.length; i++){
                    let cssResult = await this.loadCss(cssFileData.files.cssFiles[i], noWatch);
                    if (cssResult && cssResult.css){
                        let cssContents = cssResult.css;
                        compiledCss += cssContents;
                    }
                }
                if (!silent){
                    this.log('Compiling {1} wrapper CSS files', 'groupend', [cssFileData.counts.cssFileCount]);
                }
            }

            if (cssFileData.counts.themeCssFileCount){
                if (!silent){
                    this.log('Compiling {1} theme CSS files', 'group', [cssFileData.counts.themeCssFileCount]);
                }
                for (let i=0; i<cssFileData.files.themeCssFiles.length; i++){
                    let cssResult = await this.loadCss(cssFileData.files.themeCssFiles[i], noWatch);
                    if (cssResult && cssResult.css){
                        let cssContents = cssResult.css;
                        compiledCss += cssContents;
                    }
                }
                if (!silent){
                    this.log('Compiling {1} wrapper CSS files', 'groupend', [cssFileData.counts.cssFileCount]);
                }
            }

            if (cssFileData.counts.appCssFileCount){
                if (!silent){
                    this.log('Compiling {1} app CSS files', 'group', [cssFileData.counts.appCssFileCount]);
                }
                for (let i=0; i<cssFileData.files.appCssFiles.length; i++){
                    let cssResult = await this.loadCss(cssFileData.files.appCssFiles[i], noWatch);
                    if (cssResult && cssResult.css){
                        let cssContents = cssResult.css;
                        compiledCss += cssContents;
                    }
                }
                if (!silent){
                    this.log('Compiling {1} app CSS files', 'groupend', [cssFileData.counts.appCssFileCount]);
                }
            }

            if (appState.isDebugWindow){
                if (cssFileData.counts.debugCssFileCount){
                    if (!silent){
                        this.log('Compiling {1} debug window wrapper CSS files', 'group', [cssFileData.counts.debugCssFileCount]);
                    }
                    for (let i=0; i<cssFileData.files.debugCssFiles.length; i++){
                        let cssResult = await this.loadCss(cssFileData.files.debugCssFiles[i], noWatch);
                        if (cssResult && cssResult.css){
                            let cssContents = cssResult.css;
                            compiledCss += cssContents;
                        }
                    }
                    if (!silent){
                        this.log('Compiling {1} debug window wrapper CSS files', 'groupend', [cssFileData.counts.debugCssFileCount]);
                    }
                }
                if (cssFileData.counts.appDebugCssFileCount){
                    if (!silent){
                        this.log('Compiling {1} debug window app CSS files', 'group', [cssFileData.counts.appDebugCssFileCount]);
                    }
                    for (let i=0; i<cssFileData.files.appDebugCssFiles.length; i++){
                        let cssResult = await this.loadCss(cssFileData.files.appDebugCssFiles[i], noWatch);
                        if (cssResult && cssResult.css){
                            let cssContents = cssResult.css;
                            compiledCss += cssContents;
                        }
                    }
                    if (!silent){
                        this.log('Compiling {1} debug window app CSS files', 'groupend', [cssFileData.counts.appDebugCssFileCount]);
                    }
                }
            }

            if (cssFileData.counts.themeOverrideCssFileCount){
                if (!silent){
                    this.log('Compiling {1} theme override CSS files', 'group', [cssFileData.counts.themeOverrideCssFileCount]);
                }
                for (let i=0; i<cssFileData.files.themeOverrideCssFiles.length; i++){
                    let cssResult = await this.loadCss(cssFileData.files.themeOverrideCssFiles[i], noWatch);
                    if (cssResult && cssResult.css){
                        let cssContents = cssResult.css;
                        compiledCss += cssContents;
                    }
                }
                if (!silent){
                    this.log('Compiling {1} wrapper CSS files', 'groupend', [cssFileData.counts.cssFileCount]);
                }
            }

            if (!silent){
                this.log('Compiling {1} CSS files', 'groupend', [cssFileData.counts.totalCssFileCount]);
            }
        }
        return compiledCss;
    }

    async loadJsFiles() {
        let jsFiles = this.getConfig('appConfig.initJsFiles');
        let appJsFiles = this.getConfig('appConfig.jsFiles');
        let themeInitJsFiles = [];
        let themeJsFiles = [];

        let jsFileCount = 0;
        let appJsFileCount = 0;
        let themeInitJsFileCount = 0;
        let themeJsFileCount = 0;
        let totalJsFileCount = 0;

        let themeName = this.getConfig('theme');
        if (themeName){
            let themeConfig = await this.getThemeConfig(themeName);
            if (themeConfig && themeConfig.name){
                if (themeConfig.initJsFiles && themeConfig.initJsFiles.length){
                    for (let i=0; i<themeConfig.initJsFiles.length; i++){
                        let jsFile = themeConfig.initJsFiles[i];
                        let jsFilePath = path.resolve(path.join(themeConfig.path, jsFile));
                        if (fs.existsSync(jsFilePath)){
                            let jsHref = '/' + path.relative(path.resolve('.'), jsFilePath);
                            themeInitJsFiles.push(jsHref);
                        } else {
                            this.log('Can\'t find theme JS file "{1}"', 'error', [jsFile]);
                        }
                    }
                }
                if (themeConfig.jsFiles && themeConfig.jsFiles.length){
                    for (let i=0; i<themeConfig.jsFiles.length; i++){
                        let jsFile = themeConfig.jsFiles[i];
                        let jsFilePath = path.resolve(path.join(themeConfig.path, jsFile));
                        if (fs.existsSync(jsFilePath)){
                            let jsHref = '/' + path.relative(path.resolve('.'), jsFilePath);
                            themeJsFiles.push(jsHref);
                        } else {
                            this.log('Can\'t find theme JS file "{1}"', 'error', [jsFile]);
                        }
                    }
                }
            }
        }

        if (jsFiles && jsFiles.length){
            jsFileCount = jsFiles.length;
            totalJsFileCount += jsFiles.length;
        }

        if (appJsFiles && appJsFiles.length){
            appJsFileCount = appJsFiles.length;
            totalJsFileCount += appJsFiles.length;
        }

        if (themeInitJsFiles && themeInitJsFiles.length){
            themeInitJsFileCount = themeInitJsFiles.length;
            totalJsFileCount += themeInitJsFiles.length;
        }

        if (themeJsFiles && themeJsFiles.length){
            themeJsFileCount = themeJsFiles.length;
            totalJsFileCount += themeJsFiles.length;
        }

        if (totalJsFileCount){
            this.log('Loading {1} JS files', 'group', [totalJsFileCount]);
            if (jsFileCount){
                this.log('Loading {1} wrapper JS files', 'group', [jsFileCount]);
                for (let i=0; i<jsFiles.length; i++){
                    await this.loadJs(jsFiles[i]);
                }
                this.log('Loading {1} wrapper JS files', 'groupend', [jsFileCount]);
            }

            if (themeInitJsFileCount){
                this.log('Loading {1} theme init JS files', 'group', [themeInitJsFileCount]);
                for (let i=0; i<themeInitJsFiles.length; i++){
                    await this.loadJs(themeInitJsFiles[i]);
                }
                this.log('Loading {1} theme init JS files', 'groupend', [themeInitJsFileCount]);
            }

            if (appJsFileCount){
                this.log('Loading {1} app JS files', 'group', [appJsFileCount]);
                for (let i=0; i<appJsFiles.length; i++){
                    await this.loadJs(appJsFiles[i]);
                }
                this.log('Loading {1} app JS files', 'groupend', [appJsFileCount]);
            }

            if (themeJsFileCount){
                this.log('Loading {1} theme JS files', 'group', [themeJsFileCount]);
                for (let i=0; i<themeJsFiles.length; i++){
                    await this.loadJs(themeJsFiles[i]);
                }
                this.log('Loading {1} theme JS files', 'groupend', [themeJsFileCount]);
            }

            this.log('Loading {1} JS files', 'groupend', [totalJsFileCount]);
        }
    }

    async cssFileChanged (e, filename) {
        this.log('Css file "{1}" fired event "{2}"', 'debug', [filename, e]);
        if (this.getConfig('compileCss')){
            await this.reloadCss();
        } else {
            let filenameRegex = new RegExp(filename);
            let cssFiles = await this.getCssFiles();
            let changedFiles = [];
            for(let i=0; i<cssFiles.length;i++){
                if (cssFiles[i].match(filenameRegex)){
                    changedFiles.push(cssFiles[i]);
                }
            }
            if (changedFiles && changedFiles.length){
                await this.refreshCssFiles(changedFiles);
            }
        }
    }

    async reloadCss (e) {
        if (e && e.preventDefault && _.isFunction(e.preventDefault)){
            e.preventDefault();
        }
        await this.generateCss(true, true);
        await this.refreshCss();
    }

    async initializeThemes () {
        appState.availableThemes = [];
        let appWrapperBaseThemeDir = path.resolve('./node_modules/nw-skeleton/app-wrapper/css/themes');
        let appThemeBaseDir = path.resolve('./app/css/themes');

        this.log('Initializing themes...', 'group', []);

        if (_appWrapper.fileManager.isDir(appWrapperBaseThemeDir)){
            let wrapperThemeDirs = fs.readdirSync(appWrapperBaseThemeDir);
            if (wrapperThemeDirs && wrapperThemeDirs.length){
                this.log('Initializing {1} wrapper themes...', 'debug', [wrapperThemeDirs.length]);
                for(let i=0; i<wrapperThemeDirs.length; i++){
                    await this.registerTheme(wrapperThemeDirs[i], path.join(appWrapperBaseThemeDir, wrapperThemeDirs[i]));
                }
            }
        }
        if (_appWrapper.fileManager.isDir(appThemeBaseDir)){
            let appThemeDirs = fs.readdirSync(appThemeBaseDir);
            if (appThemeDirs && appThemeDirs.length){
                this.log('Initializing {1} app themes...', 'debug', [appThemeDirs.length]);
                for(let i=0; i<appThemeDirs.length; i++){
                    await this.registerTheme(appThemeDirs[i], path.join(appThemeBaseDir, appThemeDirs[i]));
                }
            }
        }

        this.log('Initializing themes...', 'groupend', []);
    }

    async registerTheme(themeName, themeDir){
        if (themeName && themeDir){
            _.remove(appState.availableThemes, { name: themeName });
            if (await _appWrapper.fileManager.isFile(path.join(themeDir, 'css', 'config.css' ))){
                this.log('Registering theme "{1}"...', 'debug', [themeName]);
                appState.availableThemes.push({
                    name: themeName,
                    path: themeDir
                });
            } else {
                this.log('Problem registering theme "{1}" - no config.css file!', 'error', [themeName]);
            }
        }
    }

    async changeTheme () {
        await this.reloadCss();
    }
}

exports.StaticFilesHelper = StaticFilesHelper;