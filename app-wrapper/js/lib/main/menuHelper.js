/**
 * @fileOverview MenuHelper main class file
 * @author Dino Ivankov <dinoivankov@gmail.com>
 * @version 1.2.1
 */

const _ = require('lodash');
const MainBaseClass = require('./mainBase').MainBaseClass;

/**
 * MenuHelper class - handles and manages app menus and tray
 *
 * @class
 * @extends {mainScript.MainBaseClass}
 * @memberof mainScript
 * @property {boolean}  hasMacBuiltin   Flag to indicate whether the app has mac builtin menu
 * @property {boolean}  hasEditMenu     Flag to indicate whether the app has "Edit" menu
 * @property {Object}   tray             Object containing nw.tray instance - see {@link http://docs.nwjs.io/en/latest/References/Tray/}
 * @property {Object}   trayMenu         Object containing tray menu data - see {@link http://docs.nwjs.io/en/latest/References/Tray/#traymenu}
 * @property {Object}   menu             Object containing nw.menu instance - see {@link http://docs.nwjs.io/en/latest/References/Menu/}
 * @property {array}    menuMethodMap    Array containing map of handlers by menu position
 * @property {array}    menuShortcutMap  Array containing map of key shortcuts by menu position
 * @property {array}    userShortcuts    Array with all used shortcuts so far (used to warn about duplicate shortcuts)
 */
class MenuHelper extends MainBaseClass {

    /**
     * Creates MenuHelper instance
     *
     * @constructor
     * @return {MenuHelper}              Instance of MenuHelper class
     */
    constructor() {
        super();

        this.hasMacBuiltin = false;
        this.hasEditMenu = false;
        this.hasWindowMenu = false;
        this.tray = null;
        this.trayMenu = null;
        this.menu = null;
        this.menuMethodMap = [];
        this.menuShortcutMap = [];
        this.usedShortcuts = [];

        this.menuInitialized = false;
        this.menuSetup = false;
        this.trayInitialized = false;

        return this;
    }

    /**
     * Initializes app menu using data from config
     *
     * @async
     * @return {undefined}
     */
    async initializeAppMenu() {
        if (!this.menuInitialized){
            this.log('Initializing app menu', 'debug', []);
            let utilHelper = this.getAppWrapper().getHelper('util');
            if (!(!_.isUndefined(this.menu) && this.menu)){
                let menuData = this.getConfig('appConfig.menuData');
                let hasAppMenu = this.getConfig('appConfig.hasAppMenu');
                if (hasAppMenu){
                    if (menuData && menuData.mainItemName && menuData.options){
                        if (!this.menu){
                            this.menu = new nw.Menu({type: 'menubar'});
                            if (!this.hasMacBuiltin){
                                this.menu.createMacBuiltin(menuData.mainItemName, menuData.options);
                                this.hasMacBuiltin = true;
                            }
                            this.hasEditMenu = !menuData.options.hideEdit;
                            this.hasWindowMenu = !menuData.options.hideWindow;
                        }
                    }
                } else {
                    if (utilHelper.isMac()){
                        if (menuData && menuData.mainItemName && menuData.options){
                            if (!this.menu){
                                this.menu = new nw.Menu({type: 'menubar'});
                                if (!this.hasMacBuiltin){
                                    this.menu.createMacBuiltin(menuData.mainItemName, menuData.options);
                                    this.hasMacBuiltin = true;
                                }
                                this.hasEditMenu = !menuData.options.hideEdit;
                                this.hasWindowMenu = !menuData.options.hideWindow;
                            }
                        }
                    }
                }
            }
            this.menuInitialized = true;
        } else {
            this.log('App menu already initialized', 'debug', []);
        }
    }

    /**
     * Reinitializes app menu using data from config
     *
     * @async
     * @return {undefined}
     */
    async reinitializeAppMenu() {
        if (this.menuInitialized){
            await this.removeAppMenu();
        }
        await this.initializeAppMenu();
        await this.setupAppMenu();
    }

    /**
     * Sets up app menu using configuration data
     *
     * @async
     * @return {undefined}
     */
    async setupAppMenu() {
        if (!this.menuSetup){
            this.log('Setting up app menu', 'debug', []);
            let utilHelper = this.getAppWrapper().getHelper('util');
            let hasAppMenu = this.getConfig('appConfig.hasAppMenu');
            if (hasAppMenu){
                if (!utilHelper.isMac() && !appState.windowState.frame){
                    this.log('You should not be using frameless window with app menus.', 'warning', [], false, true);
                }
                let menuData = this.getConfig('appConfig.menuData');
                this.menuMethodMap = [];
                if (menuData && menuData.menus && _.isArray(menuData.menus) && menuData.menus.length){

                    if (utilHelper.isMac()){
                        let firstMenuChunk = [];
                        let secondMenuChunk = [];
                        let thirdMenuChunk = [];
                        if (!this.hasMacBuiltin && !this.hasEditMenu && this.hasWindowMenu){
                            firstMenuChunk = _.slice(menuData.menus, 0);
                        } else {
                            if (this.hasMacBuiltin) {
                                firstMenuChunk = _.slice(menuData.menus, 0, 1);
                            }
                            if (!this.hasEditMenu && !this.hasWindowMenu){
                                thirdMenuChunk = _.slice(menuData.menus, 1);
                            } else {
                                if (this.hasEditMenu && this.hasWindowMenu){
                                    secondMenuChunk = _.slice(menuData.menus, 1, 2);
                                    thirdMenuChunk = _.slice(menuData.menus, 3);
                                } else {
                                    secondMenuChunk = _.slice(menuData.menus, 1, 1);
                                    thirdMenuChunk = _.slice(menuData.menus, 2);
                                }
                            }
                        }
                        menuData.menus = _.concat(firstMenuChunk, secondMenuChunk, thirdMenuChunk);
                    }
                    for(let i=0; i<menuData.menus.length; i++){
                        let menuMethodData = await this.initializeAppMenuItemData(menuData.menus[i], i);
                        this.menuMethodMap = _.union(this.menuMethodMap, menuMethodData);
                        this.menu.append(await this.initializeAppMenuItem(menuData.menus[i], i));
                    }
                }
                this.getAppWrapper().windowManager.setMenu(this.menu);
            } else if (utilHelper.isMac()){
                this.getAppWrapper().windowManager.setMenu(this.menu);
            }
            this.menuSetup = true;
        } else {
            this.log('App menu already set up', 'debug', []);
        }
    }

    /**
     * Initializes single app menu item
     *
     * @async
     * @param  {Object} menuItemData Menu item data
     * @param  {string} menuIndex    Menu index in format parentIndex_menuIndex (i.e '1_2')
     * @return {Object}              Instance of nw.menuItem - see {@link http://docs.nwjs.io/en/latest/References/MenuItem/}
     */
    async initializeAppMenuItem (menuItemData, menuIndex) {
        var menuItem;
        var menuItemObj = _.extend(menuItemData.menuItem, {
            click: this.handleMenuClick.bind(this, menuIndex)
        });
        if (menuItemData.menuItem.shortcut){
            var modifiers = [];
            if (menuItemData.menuItem.shortcut.key){
                menuItemObj.key = menuItemData.menuItem.shortcut.key;
            }
            if (menuItemData.menuItem.shortcut.modifiers){
                if (menuItemData.menuItem.shortcut.modifiers.ctrl){
                    if (this.getAppWrapper().getHelper('util').isMac()){
                        modifiers.push('cmd');
                    } else {
                        modifiers.push('ctrl');
                    }
                }
                if (menuItemData.menuItem.shortcut.modifiers.alt){
                    modifiers.push('alt');
                }
                if (menuItemData.menuItem.shortcut.modifiers.shift){
                    modifiers.push('shift');
                }
            }
            menuItemObj.modifiers = modifiers.join('+');
            let shortcutIdentifier = modifiers.join('+') + '+' + (menuItemObj.key + '').toLowerCase();
            if (_.includes(this.usedShortcuts, shortcutIdentifier)){
                this.log('Double shortcut "{1}" found for menuItem "{2}", ignoring!', 'warning', [shortcutIdentifier, menuItemObj.label], false, true);
                menuItemObj.modifiers = [];
                menuItemObj.key = null;
            } else {
                this.usedShortcuts.push(shortcutIdentifier);
            }
        }
        if (menuItemData.children && menuItemData.children.length){
            let submenu = new nw.Menu();
            for(let i=0; i<menuItemData.children.length; i++){
                submenu.append(await this.initializeAppMenuItem(menuItemData.children[i], menuIndex + '_' + i));
            }

            menuItem = new nw.MenuItem(_.extend(menuItemObj, {submenu: submenu, click: this.handleMenuClick.bind(this, menuIndex)}));
        } else {
            menuItem = new nw.MenuItem(_.extend(menuItemObj));
        }
        return menuItem;
    }

    /**
     * Initializes single app menu item data using configuration data
     *
     * @async
     * @param  {Object} menuItemData Menu item data from configuration
     * @param  {string} menuIndex    Menu index in format parentIndex_menuIndex (i.e '1_2')
     * @return {Object[]}            Array with single member - menuItemData object
     */
    async initializeAppMenuItemData (menuItemData, menuIndex) {
        var menuData = [];
        menuIndex = menuIndex + '';
        if (menuItemData.menuItem.type != 'separator'){
            let menuMethod;
            if (menuItemData.menuItem && menuItemData.menuItem.method) {
                menuMethod = await this.getAppWrapper().getObjMethod(menuItemData.menuItem.method, [], this.getAppWrapper(), true);
            }
            if (!menuMethod){
                this.log('Can not find method "{1}" for menu item with label "{2}"!', 'error', [menuItemData.menuItem.method, menuItemData.menuItem.label], false, true);
            }

            menuData.push({
                menuIndex: menuIndex,
                label: menuItemData.menuItem.label,
                shortcut: menuItemData.menuItem.shortcut,
                method: menuItemData.menuItem.method
            });
            if (menuItemData.children && menuItemData.children.length){
                for(let i=0; i<menuItemData.children.length; i++){
                    menuData = _.union(menuData, await this.initializeAppMenuItemData(menuItemData.children[i], menuIndex + '_' + i));
                }
            }
        } else {
            menuData.push({
                menuIndex: menuIndex,
                label: '__separator__',
                shortcut: null,
                method: 'noop'
            });
        }
        return menuData;
    }

    /**
     * Gets menu item by its index
     *
     * @param  {string} menuItemIndex   Menu index in format parentIndex_menuIndex (i.e '1_2')
     * @return {Object}                 Menu item information from this.menuMethodMap
     */
    getMenuItem (menuItemIndex){
        menuItemIndex = menuItemIndex + '';
        let menuItem = _.find(this.menuMethodMap, {menuIndex: menuItemIndex});
        if (!menuItem){
            this.log('Can not find menu item {1}', 'warning', [menuItemIndex], false, true);
        }
        return menuItem;
    }

    /**
     * Gets menu item by its parent index, returning children as well
     *
     * @param  {string} menuItemIndex   Menu item index
     * @param  {string} parentIndex     Menu item parent index
     * @return {Object}                 Menu item information from this.menuMethodMap
     */
    getMenuItemChain (menuItemIndex, parentIndex){
        menuItemIndex = menuItemIndex + '';
        let menuItemIndices = menuItemIndex.split('_');
        let currentIndex = menuItemIndices[0] + '';
        if (parentIndex){
            currentIndex = parentIndex + '_' + menuItemIndices[0];
        }

        let currentItem = _.find(this.menuMethodMap, {menuIndex: currentIndex});

        if (menuItemIndices.length > 1){
            parentIndex = currentIndex;
            currentIndex = _.tail(menuItemIndices).join('_');
            currentItem.child = this.getMenuItemChain(currentIndex, parentIndex);
        }
        return currentItem;
    }

    /**
     * Returns array of labels containing all parent labels up to current menu item label
     *
     * @param  {string} menuItemIndex   Menu item index in format parentIndex_menuIndex (i.e '1_2')
     * @return {string[]}               Array of menu labels
     */
    getMenuItemLabelPaths (menuItemIndex){
        let itemChain = this.getMenuItemChain(menuItemIndex);
        let paths = this.getChainLabelPath(itemChain);
        return paths;
    }

    /**
     * Returns array of labels containing all parent labels up to current menu item label
     *
     * @param  {array} itemChain        Menu item chain, containing all parent items up to current menu item
     * @param  {string[]} labelPaths    Array of menu labels
     * @return {string[]}               Array of menu labels
     */
    getChainLabelPath (itemChain, labelPaths) {
        if (!labelPaths){
            labelPaths = [];
        }
        if (itemChain && itemChain.label){
            labelPaths.push(itemChain.label);
            if (itemChain && itemChain.child){
                labelPaths = _.union(labelPaths, this.getChainLabelPath(itemChain.child, labelPaths));
            }
        }
        return labelPaths;
    }

    /**
     * Returns listener method name for current menu item
     *
     * @param  {string} menuItemIndex   Menu item index in format parentIndex_menuIndex (i.e '1_2')
     * @return {string}                 Listener method name
     */
    getMenuItemMethodName (menuItemIndex){
        menuItemIndex = menuItemIndex + '';
        let method;
        let menuMethod = _.find(this.menuMethodMap, {menuIndex: menuItemIndex});
        if (menuMethod && menuMethod.method) {
            method = menuMethod.method;
        } else {
            this.log('Can not find method for menu item {1}', 'warning', [menuItemIndex], false, true);
        }
        return method;
    }

    /**
     * Removes app menu
     *
     * @async
     * @return {undefined}
     */
    async removeAppMenu (){
        let start = 0;
        if (this.hasMacBuiltin){
            start++;
        }
        if (this.hasEditMenu){
            start++;
        }
        if (this.hasWindowMenu){
            start++;
        }
        if (this.menuSetup && this.menu && this.menu.items){

            for(let i=start; i<this.menu.items.length;i++){
                this.menu.removeAt(i);
            }
            for(let i=start; i<this.menu.items.length;i++){
                this.menu.removeAt(i);
            }
        }
        this.menuSetup = false;
        this.menuInitialized = false;
        // this.hasMacBuiltin = false;
        // this.hasEditMenu = false;
        // this.menu = null;
        this.menuMethodMap = [];
        this.menuShortcutMap = [];
        this.usedShortcuts = [];

    }

    /**
     * Handles click on menu items
     *
     * @param  {string} menuIndex   Menu item index in format parentIndex_menuIndex (i.e '1_2')
     * @return {mixed}              Listener return value or false if no listener found
     */
    handleMenuClick (menuIndex) {
        let originalMenuIndex = menuIndex;
        let methodIdentifier = this.getMenuItemMethodName(menuIndex);
        let menuItem = this.getMenuItem(menuIndex);
        var objectIdentifier;
        var method;
        var object = this.getAppWrapper();
        if (methodIdentifier && _.isFunction(methodIdentifier.match) && methodIdentifier.match(/\./)){
            objectIdentifier = methodIdentifier.replace(/\.[^.]+$/, '');
        }

        if (methodIdentifier){
            method = _.get(this.getAppWrapper(), methodIdentifier);
        }

        if (objectIdentifier){
            object = _.get(this.getAppWrapper(), objectIdentifier);
        }

        let label = this.getMenuItemLabelPaths(originalMenuIndex).join(' > ');
        if (!methodIdentifier){
            methodIdentifier = 'unknown';
        } else {
            methodIdentifier = 'appWrapper.' + methodIdentifier;
        }

        if (object && method && _.isFunction(method)){
            this.log('Calling menu click handler "{1}" for menuItem "{2}", menuIndex "{3}"!', 'debug', [methodIdentifier, label, menuIndex]);
            return method.call(object, menuItem);
        } else {
            this.log('Can\'t call menu click handler "{1}" for menuItem "{2}", menuIndex "{3}"!', 'error', [methodIdentifier, label, menuIndex], false, true);
            return false;
        }
    }

    /**
     * Handles click on tray menu items
     *
     * @param  {string} trayMenuItem    Tray menu item index in format parentIndex_menuIndex (i.e '1_2')
     * @return {mixed}                  Listener return value or false if no listener found
     */
    handleTrayClick (trayMenuItem) {
        let methodIdentifier = trayMenuItem.method;
        let objectIdentifier;
        let method;
        if (methodIdentifier){
            var object = this.getAppWrapper();
            if (methodIdentifier && _.isFunction(methodIdentifier.match) && methodIdentifier.match(/\./)){
                objectIdentifier = methodIdentifier.replace(/\.[^.]+$/, '');
            }

            if (methodIdentifier){
                method = _.get(this.getAppWrapper(), methodIdentifier);
            }

            if (objectIdentifier){
                object = _.get(this.getAppWrapper(), objectIdentifier);
            }

            if (!methodIdentifier){
                methodIdentifier = 'unknown';
            } else {
                methodIdentifier = 'appWrapper.' + methodIdentifier;
            }

            if (object && method && _.isFunction(method)){
                this.log('Calling tray menu click handler "{1}" for menuItem "{2}"', 'debug', [methodIdentifier, trayMenuItem.label]);
                return method.call(object, trayMenuItem);
            } else {
                this.log('Can\'t call tray menu click handler "{1}" for menuItem "{2}"!', 'error', [methodIdentifier, trayMenuItem.label], false, true);
                return false;
            }
        }
    }

    /**
     * Initializes single tray menu item
     *
     * @async
     * @param  {Object} menuItemData Menu item data
     * @return {Object}              Instance of nw.menuItem - see {@link http://docs.nwjs.io/en/latest/References/MenuItem/}
     */
    async initializeTrayMenuItem (menuItemData) {
        var menuItem;
        if (menuItemData.type != 'separator'){
            if (menuItemData.label){
                menuItemData.label = this.getAppWrapper().appTranslations.translate(menuItemData.label);
            }
            if (menuItemData.tooltip){
                menuItemData.tooltip = this.getAppWrapper().appTranslations.translate(menuItemData.tooltip);
            }
        }
        var menuItemObj = _.extend(menuItemData, {
            click: this.handleTrayClick.bind(this, menuItemData)
        });
        if (menuItemData.children && menuItemData.children.length){
            let submenu = new nw.Menu();
            for(let i=0; i<menuItemData.children.length; i++){
                submenu.append(await this.initializeTrayMenuItem(menuItemData.children[i]));
            }
            menuItem = new nw.MenuItem(_.extend(menuItemObj, {submenu: submenu}));
        } else {
            menuItem = new nw.MenuItem(menuItemObj);
        }
        return menuItem;
    }

    /**
     * Initializes app tray icon
     *
     * @async
     * @return {undefined}
     */
    async initializeTrayIcon(){
        if (!this.trayInitialized){
            this.log('Initializing tray icon', 'debug', []);
            let hasTrayIcon = this.getConfig('appConfig.hasTrayIcon');
            if (hasTrayIcon){
                let trayData = _.cloneDeep(this.getConfig('appConfig.trayData'));
                let trayOptions = {
                    title: trayData.title,
                    icon: trayData.icon
                };
                if (trayData.alticon){
                    trayOptions.alticon = trayData.alticon;
                }
                this.tray = new nw.Tray(trayOptions);
                if (trayData.menus && trayData.menus.length){
                    this.trayMenu = new nw.Menu();
                    for (let i=0; i<trayData.menus.length; i++){
                        let menuItem = await this.initializeTrayMenuItem(trayData.menus[i]);
                        this.trayMenu.append(menuItem);
                    }
                    this.tray.menu = this.trayMenu;
                }
            }
            this.trayInitialized = true;
        } else {
            this.log('Tray icon already initialized', 'debug', []);
        }
    }

    /**
     * Removes app tray icon
     *
     * @async
     * @return {undefined}
     */
    async removeTrayIcon(){
        if (this.trayInitialized && this.tray && this.tray.remove && _.isFunction(this.tray.remove)){
            this.tray.remove();
            this.trayMenu = null;
            this.tray = null;
        }
        this.trayInitialized = false;
    }

    /**
     * Reinitializes app tray icon
     *
     * @async
     * @return {undefined}
     */
    async reinitializeTrayIcon() {
        if (this.trayInitialized){
            await this.removeTrayIcon();
        }
        await this.initializeTrayIcon();
    }
}

exports.MenuHelper = MenuHelper;