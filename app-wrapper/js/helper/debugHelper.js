/**
 * @fileOverview DebugHelper class file
 * @author Dino Ivankov <dinoivankov@gmail.com>
 * @version 1.3.1
 */

const path = require('path');
const pusage = require('pidusage');

const AppBaseClass = require('../lib/appBase').AppBaseClass;

var _appWrapper;
var appState;

/**
 * DebugHelper class - handles and manages app debugger and debug messages
 *
 * @class
 * @extends {appWrapper.AppBaseClass}
 * @memberof appWrapper.helpers
 */
class DebugHelper extends AppBaseClass {

    /**
     * Creates DebugHelper instance
     *
     * @constructor
     * @return {DebugHelper}              Instance of DebugHelper class
     */
    constructor() {
        super();

        if (window && window.getAppWrapper && _.isFunction(window.getAppWrapper)){
            _appWrapper = window.getAppWrapper();
            appState = _appWrapper.getAppState();
        }

        this.timeouts = {
            processDebugMessagesTimeout: null
        };

        this.intervals = {
            usageData: null
        };

        this.boundMethods = {
            refreshUsageData: null
        };

        return this;
    }

    /**
     * Opens standalone debug window
     *
     * @return {undefined}
     */
    openDebugWindow (){
        this.log('Opening standalone debug window', 'info', []);
        let debugWindowId = 'debugWindow';
        appState.hasDebugWindow = true;
        _appWrapper.openNewWindow(this.getConfig('debug.debugWindowFile'), debugWindowId, {
            frame: false,
            transparent: true,
            focus: true,
        }, {
            name: appState.appInfo.name + ' debug',
            nameVars: []
        }, {
            loaded: async () => {
                let debugWindow = _appWrapper.getSubWindow(debugWindowId);
                try {
                    await _appWrapper.initializeOtherWindow(debugWindow);
                    debugWindow.appState.mainLoaderTitle = this.translate('Please wait');
                    debugWindow.appState.hasDebugWindow = false;
                    debugWindow.appState.isDebugWindow = true;
                    await _appWrapper.prepareOtherWindow(debugWindow, ['config', 'debugMessages', 'allDebugMessages', '']);
                    debugWindow.appState.hasDebugWindow = false;
                    debugWindow.appState.isDebugWindow = true;
                    debugWindow.appWrapper.getHelper('html').addClass(debugWindow.document.body, 'debug-window-initialized');
                    debugWindow.appState.debugWindowInitialized = true;
                } catch (ex) {
                    debugWindow.appState.appError.messages = 'debug';
                    debugWindow.appState.appError.text = ex.message;
                    debugWindow.appState.appError.error = true;
                }
            },
            close: async () => {
                let debugWindow = _appWrapper.getSubWindow(debugWindowId);
                if (debugWindow.appState.debugMessages){
                    appState.debugMessages = _.cloneDeep(debugWindow.appState.debugMessages);
                    appState.allDebugMessages = _.cloneDeep(debugWindow.appState.allDebugMessages);
                    appState.hasDebugWindow = false;
                }
                await _appWrapper.destroyOtherWindow(debugWindow);
                this.log('Closing standalone debug window', 'info', []);
                debugWindow.close();
                this.addUserMessage('Debug window closed', 'info', [], false,  false);
            }
        });
        this.addUserMessage('Debug window opened', 'info', [], false,  false);
    }

    /**
     * Toggles debug.hideDebug config variable, showing or hiding app-debug component with debug messages
     *
     * @return {undefined}
     */
    toggleDebug () {
        _appWrapper.appConfig.setConfigVar('debug.hideDebug', !appState.config.debug.hideDebug);
    }

    /**
     * Changes minimum debug level for displaying debug messages
     *
     * @param  {Event} e Event that triggered the method
     * @return {undefined}
     */
    changeDebugLevel(e){
        var level = e.target.value;
        this.addUserMessage('Changing debug level to "{1}".', 'info', [level], false, false);
        _appWrapper.appConfig.setConfigVar('debug.debugLevel', level);
        if (appState.isDebugWindow) {
            this.addUserMessage('Changing debug level in main window to "{1}".', 'info', [level], false, false);
            _appWrapper.mainWindow.appState.config.debug.debugLevel = level;
        }

    }

    /**
     * Clears console and all debug messages
     *
     * @return {undefined}
     */
    clearDebugMessages () {
        console.clear();
        if (appState.isDebugWindow){
            _appWrapper.mainWindow.appState.allDebugMessages = [];
            _appWrapper.mainWindow.appState.debugMessages = [];
            appState.allDebugMessages = _appWrapper.mainWindow.appState.allDebugMessages;
            appState.debugMessages = _appWrapper.mainWindow.appState.debugMessages;
        } else {
            appState.allDebugMessages = [];
            appState.debugMessages = [];
            let debugWindow = _appWrapper.getSubWindow('debugWindow');
            if (debugWindow){
                debugWindow.appState.allDebugMessages = appState.allDebugMessages;
                debugWindow.appState.debugMessages = appState.debugMessages;
            }
        }
        this.addUserMessage('Debug messages cleared', 'debug', []);
    }

    /**
     * Handler for save debug button
     *
     * @param  {Event} e Event that triggered the method
     * @return {undefined}
     */
    saveDebug (e) {
        if (e && e.preventDefault && _.isFunction(e.preventDefault)){
            e.preventDefault();
        }
        this.showSaveDebugModal();
    }

    /**
     * Opens modal dialog for saving debug log to file
     *
     * @async
     * @return {undefined}
     */
    async showSaveDebugModal () {
        let modalHelper = _appWrapper.getHelper('modal');
        let modalOptions = {
            title: _appWrapper.appTranslations.translate('Saving debug log to file'),
            bodyComponent: 'save-debug',
            confirmButtonText: _appWrapper.appTranslations.translate('Save'),
            cancelButtonText: _appWrapper.appTranslations.translate('Cancel'),
            showCancelButton: false,
            confirmDisabled: true,
            hasHiddenMessages: appState.allDebugMessages.length - appState.debugMessages.length,
            saveFileError: false,
            defaultFilename: 'debug-' + _appWrapper.getHelper('format').formatDateNormalize(new Date(), false, true) + '.txt',
            busy: true,
            busyText: _appWrapper.appTranslations.translate('Please wait...'),
            onOpen: function() {
                let buttonEl = appState.modalData.modalElement.querySelector('.file-picker-button');
                if (buttonEl){
                    buttonEl.focus();
                }
            },
        };
        _appWrapper._confirmModalAction = _appWrapper.getHelper('util').confirmSaveLogAction;
        modalHelper.openModal('saveDebugModal', modalOptions);
    }

    /**
     * Handler for opening file dialog for saving debug log to file
     *
     * @param  {Event} e Event that triggered the method
     * @return {undefined}
     */
    saveDebugFileClick (e){
        let fileEl = e.target.parentNode.querySelector('.file-picker');
        fileEl.setAttribute('nwsaveas', 'debug-' + _appWrapper.getHelper('format').formatDateNormalize(new Date(), false, true) + '.json');
        fileEl.click();
    }

    /**
     * Handler that saves debug log to file when related input value has changed
     *
     * @return {undefined}
     */
    saveDebugFileChange () {
        let modalHelper = _appWrapper.getHelper('modal');
        modalHelper.setModalVar('saveFileError', false);
        var modalElement = window.document.querySelector('.modal-dialog');
        var fileNameElement = modalElement.querySelector('input[type=file]');
        var debugFileName = fileNameElement.value;
        var fileValid = true;
        modalHelper.clearModalMessages();
        modalHelper.modalBusy();
        if (!debugFileName){
            appState.modalData.currentModal.saveFileError = true;
            fileValid = false;
        } else {
            if (!_appWrapper.fileManager.fileExists(debugFileName)){
                appState.modalData.currentModal.fileExists = false;
                let dirPath = path.dirname(debugFileName);
                if (!_appWrapper.fileManager.isDir(dirPath)){
                    fileValid = false;
                    this.addModalMessage(_appWrapper.appTranslations.translate('Chosen file directory is not a directory!'), 'error', []);
                } else {
                    if (!_appWrapper.fileManager.isFileWritable(debugFileName)){
                        fileValid = false;
                        this.addModalMessage(_appWrapper.appTranslations.translate('Chosen file is not writable!'), 'error', []);
                    }
                }
            } else {
                appState.modalData.currentModal.fileExists = true;
                var filePath = path.resolve(debugFileName);
                let dirPath = path.dirname(filePath);

                if (!_appWrapper.fileManager.isFile(filePath)){
                    fileValid = false;
                    this.addModalMessage(_appWrapper.appTranslations.translate('Chosen file is not a file!'), 'error', []);
                } else {
                    if (!_appWrapper.fileManager.fileExists(dirPath)){
                        fileValid = false;
                        this.addModalMessage(_appWrapper.appTranslations.translate('Chosen directory does not exist!'), 'error', []);
                    } else {
                        if (_appWrapper.fileManager.isDir(dirPath)){
                            if (!_appWrapper.fileManager.isFileWritable(filePath)){
                                fileValid = false;
                                this.addModalMessage(_appWrapper.appTranslations.translate('Chosen file is not writable!'), 'error', []);
                            }
                        } else {
                            fileValid = false;
                            this.addModalMessage(_appWrapper.appTranslations.translate('Chosen direcory it not a directory!'), 'error', []);
                        }
                    }
                }
            }
        }
        if (!fileValid){
            appState.modalData.currentModal.fileExists = false;
            appState.modalData.currentModal.confirmDisabled = true;
            modalHelper.modalNotBusy();
        } else {
            modalHelper.setModalVar('file', debugFileName);
            modalHelper.setModalVar('confirmDisabled', false);
            modalHelper.modalNotBusy();
            setTimeout(() => {
                let buttonEl = appState.modalData.modalElement.querySelector('.modal-button-confirm');
                if (buttonEl){
                    buttonEl.focus();
                }
            }, this.getConfig('shortPauseDuration'));
        }
    }

    /**
     * Clears all user messages
     *
     * @param  {Event} e Event that triggered the method
     * @return {undefined}
     */
    clearUserMessages (e) {
        if (e && e.preventDefault && _.isFunction(e.preventDefault)){
            e.preventDefault();
        }
        appState.userMessageQueue = [];
        appState.userMessages = [];
        this.log('User messages cleared', 'info', []);
    }

    /**
     * Changes minimum user message level for displaying user messages
     *
     * @param  {Event} e Event that triggered the method
     * @return {undefined}
     */
    changeUserMessageLevel (e) {
        var level = e.target.value;
        _appWrapper.appConfig.setConfigVar('userMessages.userMessageLevel', level);
        appState.userMessagesData.selectFocused = false;
    }

    /**
     * Opens modal dialog with debugging configuration editor
     *
     * @return {undefined}
     */
    openDebugConfigEditor () {
        let modalHelper = _appWrapper.getHelper('modal');
        let modalOptions = {
            title: _appWrapper.appTranslations.translate('Debug config editor'),
            confirmButtonText: _appWrapper.appTranslations.translate('Save'),
            cancelButtonText: _appWrapper.appTranslations.translate('Cancel'),
        };
        appState.modalData.currentModal = modalHelper.getModalObject('debugConfigEditorModal', modalOptions);
        modalHelper.modalBusy(_appWrapper.appTranslations.translate('Please wait...'));
        _appWrapper._confirmModalAction = this.saveDebugConfig.bind(this);
        _appWrapper._cancelModalAction = (evt) => {
            if (evt && evt.preventDefault && _.isFunction(evt.preventDefault)){
                evt.preventDefault();
            }
            // appState.status.noHandlingKeys = false;
            modalHelper.modalNotBusy();
            _appWrapper._cancelModalAction = _appWrapper.__cancelModalAction;
            return _appWrapper.__cancelModalAction();
        };
        modalHelper.openCurrentModal();
    }

    /**
     * Handler for saving debug configuration (from debug config modal)
     *
     * @async
     * @param  {Event} e Event that triggered the method
     * @return {undefined}
     */
    async saveDebugConfig (e) {
        if (e && e.preventDefault && _.isFunction(e.preventDefault)){
            e.preventDefault();
        }
        let modalHelper = _appWrapper.getHelper('modal');
        let utilHelper = _appWrapper.getHelper('util');
        var form = e.target;
        let finalConfig = await utilHelper.setObjectValuesFromForm(form, appState.config);
        await _appWrapper.appConfig.setConfig(finalConfig);
        modalHelper.closeCurrentModal();
    }

    /**
     * Returns number of debug messages that have stack information
     *
     * @return {Number} Number of debug messages with stack information
     */
    getDebugMessageStacksCount () {
        let stackCount = 0;
        for(let i=0; i<appState.debugMessages.length; i++){
            if (appState.debugMessages[i].stack && appState.debugMessages[i].stack.length){
                stackCount++;
            }
        }
        return stackCount;
    }

    /**
     * Checks whether all debug stack messages are displayed
     *
     * @return {Boolean} False if all debug stack infos are displayed, true otherwise
     */
    getDebugMessageStacksState () {
        let stacksCount = this.getDebugMessageStacksCount();
        let stacksOpen = 0;
        for(let i=0; i<appState.debugMessages.length; i++){
            if (appState.debugMessages[i].stack && appState.debugMessages[i].stack.length){
                if (appState.debugMessages[i].stackVisible){
                    stacksOpen++;
                }
            }
        }
        return stacksOpen >= stacksCount;
    }

    /**
     * Shows or hides stack info for all debug messages
     *
     * @return {undefined}
     */
    toggleDebugMessageStacks () {
        let currentState = !this.getDebugMessageStacksState();
        for(let i=0; i<appState.debugMessages.length; i++){
            if (appState.debugMessages[i].stack && appState.debugMessages[i].stack.length){
                appState.debugMessages[i].stackVisible = currentState;
            }
        }
    }

    /**
     * Expands or contracts app-debug part of the application
     *
     * @return {undefined}
     */
    toggleDebugMessages () {
        _appWrapper.appConfig.setConfigVar('debug.messagesExpanded', !this.getConfig('debug.messagesExpanded'));
    }

    /**
     * Toggles usage data display flag on or off
     *
     * @async
     * @return {undefined}
     */
    async toggleUsageData () {
        appState.config.debug.usage = !appState.config.debug.usage;
    }

    /**
     * Starts app usage monitoring
     *
     * @async
     * @return {undefined}
     */
    async startUsageMonitor () {
        await this.refreshUsageData();
        this.intervals.usageData = setInterval(this.boundMethods.refreshUsageData, this.getConfig('debug.usageInterval', 1000));
    }

    /**
     * Stops app usage monitoring
     *
     * @async
     * @return {undefined}
     */
    stopUsageMonitor () {
        clearInterval(this.intervals.usageData);
        appState.usageData.minCpu = -1;
        appState.usageData.maxCpu = 1;
        appState.usageData.minMemory = -1;
        appState.usageData.maxMemory = 1;
    }

    /**
     * Refreshes current usage data, setting max and min values if needed and pushing previous values to history
     *
     * @async
     * @return {undefined}
     */
    async refreshUsageData () {
        let data = await this.getUsageData();
        if (data){
            if (appState.usageData.previous.length > this.getConfig('debug.usageHistoryCount', 1000)){
                appState.usageData.previous = appState.usageData.previous.slice(1, 2);
            }
            if (appState.usageData.previous.length){
                appState.usageData.change.cpu = _.round(data.cpu - appState.usageData.previous[appState.usageData.previous.length-1].cpu, 2);
                appState.usageData.change.memory = data.memory - appState.usageData.previous[appState.usageData.previous.length-1].memory;
                if (isNaN(appState.usageData.change.cpu)){
                    appState.usageData.change.cpu = 0;
                }
                if (isNaN(appState.usageData.change.memory)){
                    appState.usageData.change.memory = 0;
                }
            } else {
                appState.usageData.change.cpu = 0;
                appState.usageData.change.memory = 0;
            }

            appState.usageData.previous.push(appState.usageData.current);
            appState.usageData.current = data;
            if (data.cpu > appState.usageData.maxCpu){
                appState.usageData.maxCpu = data.cpu;
            } else if (appState.usageData.minCpu === -1 || data.cpu < appState.usageData.minCpu){
                appState.usageData.minCpu = data.cpu;
            }
            if (data.memory > appState.usageData.maxMemory){
                appState.usageData.maxMemory = data.memory;
            } else if (appState.usageData.minMemory === -1 || data.memory < appState.usageData.minMemory){
                appState.usageData.minMemory = data.memory;
            }
        }
    }

    /**
     * Gets usage data from the OS
     *
     * @async
     * @return {Object} Usage data object with 'cpu' and 'memory' properties
     */
    async getUsageData () {
        var returnPromise;
        var resolveReference;
        returnPromise = new Promise((resolve) => {
            resolveReference = resolve;
        });
        pusage.stat(process.pid, (err, stat) => {
            if (err){
                this.log(err, 'error', []);
                resolveReference(false);
            } else {
                stat.timestamp = +new Date();
                resolveReference(stat);
            }
        });
        return returnPromise;
    }

    /**
     * Handler for usage interval change - stops current interval and starts new one with new duration
     *
     * @async
     * @return {undefined}
     */
    async usageIntervalChange (){
        if (appState.config.debug.usage){
            clearInterval(this.intervals.usageData);
            this.intervals.usageData = setInterval(this.boundMethods.refreshUsageData, this.getConfig('debug.usageInterval', 1000));
        }
    }

    /**
     * Toggles display of usage graphs
     *
     * @return {undefined}
     */
    toggleUsageGraphs (){
        appState.config.debug.usageGraphs = !appState.config.debug.usageGraphs;
    }
}

exports.DebugHelper = DebugHelper;