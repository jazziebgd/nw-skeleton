var _ = require('lodash');
var BaseClass = require('../base').BaseClass;

var _appWrapper;
var appState;


class StorageHelper extends BaseClass {
    constructor() {
        super();

        _appWrapper = window.getAppWrapper();
        appState = _appWrapper.getAppState();

        _.noop(_appWrapper);
        _.noop(appState);

        return this;
    }

    async initialize () {
        return await super.initialize();
    }

    async set (name, value){
        var returnValue = null;
        var savedValue;
        if (localStorage && localStorage.setItem && _.isFunction(localStorage.setItem)){
            savedValue = JSON.stringify(value);
            localStorage.setItem(name, savedValue);
            returnValue = savedValue == localStorage.getItem(name);
        }
        return returnValue;
    }

    async get (name){
        var returnValue;
        if (localStorage && localStorage.getItem && _.isFunction(localStorage.getItem)){
            var savedValue = localStorage.getItem(name);
            if (savedValue){
                try {
                    returnValue = JSON.parse(savedValue);
                } catch (ex) {
                    this.log('Problem loading "{1}" from storage: "{2}"!', 'error', [name, ex.message]);
                    this.log('Loaded value: "{1}"!', 'debug', [savedValue]);
                    returnValue = false;
                }
            } else {
                returnValue = savedValue;
            }
        }
        return returnValue;
    }


}

exports.StorageHelper = StorageHelper;