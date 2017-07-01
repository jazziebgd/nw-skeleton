var _ = require('lodash');
var BaseClass = require('../../base').BaseClass;

var _appWrapper;
var appState;


class UserMessageHelper extends BaseClass {
    constructor() {
        super();

        if (window && window.getAppWrapper && _.isFunction(window.getAppWrapper)){
            _appWrapper = window.getAppWrapper();
            appState = _appWrapper.getAppState();
        }

        return this;
    }

    async initialize () {
        return await super.initialize();
    }

    processUserMessageQueue (){
        var messageCount = appState.userMessageQueue.length;
        let intervalDuration = 1;

        clearInterval(appState.intervals.userMessageQueue);
        if (messageCount && !appState.userMessagesData.selectFocused){
            appState.intervals.userMessageQueue = setInterval(this.unQueueUserMessage.bind(this), intervalDuration);
        }
    }

    unQueueUserMessage (){
        if (appState && appState.userMessageQueue && appState.userMessageQueue.length){
            if (appState.userMessageQueue.length > 10){
                appState.config.userMessages.animateMessages = false;
            } else {
                appState.config.userMessages.animateMessages = true;
            }
            let userMessage = appState.userMessageQueue.shift();
            let addMessage = true;
            if (userMessage){
                let lastMessage;
                if (appState.userMessages && appState.userMessages.length){
                    lastMessage = appState.userMessages[appState.userMessages.length-1];
                }
                if (lastMessage && lastMessage.message == userMessage.message && lastMessage.type == userMessage.type){
                    lastMessage.count++;
                    lastMessage.timestamps.push(userMessage.timestamp);
                    lastMessage.timestamp = userMessage.timestamp;
                    addMessage = false;
                }
                if (addMessage){
                    appState.userMessages.push(userMessage);
                }
            }
        } else {
            clearInterval(appState.intervals.userMessageQueue);
        }
    }

    toggleUserMessages (e) {
        if (e && e.preventDefault && _.isFunction(e.preventDefault)){
            e.preventDefault();
        }
        _appWrapper.appConfig.setConfigVar('userMessages.messagesExpanded', !this.getConfig('userMessages.messagesExpanded'));
    }

    userMessageLevelSelectFocus () {
        appState.userMessagesData.selectFocused = true;
    }

    userMessageLevelSelectBlur () {
        appState.userMessagesData.selectFocused = false;
    }

    getUserMessageStacksCount () {
        let stackCount = 0;
        for(let i=0; i<appState.userMessages.length; i++){
            if (appState.userMessages[i].stack && appState.userMessages[i].stack.length){
                stackCount++;
            }
        }
        return stackCount;
    }

    getUserMessageStacksState () {
        let stacksCount = this.getUserMessageStacksCount();
        let stacksOpen = 0;
        for(let i=0; i<appState.userMessages.length; i++){
            if (appState.userMessages[i].stack && appState.userMessages[i].stack.length){
                if (appState.userMessages[i].stackVisible){
                    stacksOpen++;
                }
            }
        }
        return stacksOpen >= stacksCount;
    }

    toggleUserMessageStacks () {
        let currentState = !this.getUserMessageStacksState();
        for(let i=0; i<appState.userMessages.length; i++){
            if (appState.userMessages[i].stack && appState.userMessages[i].stack.length){
                appState.userMessages[i].stackVisible = currentState;
            }
        }
    }
}

exports.UserMessageHelper = UserMessageHelper;