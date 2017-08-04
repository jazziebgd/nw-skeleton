/**
 * @fileOverview MainMessageHandlers class file
 * @author Dino Ivankov <dinoivankov@gmail.com>
 * @version 1.2.1
 */

const _ = require('lodash');
const MainBaseClass = require('./mainBase').MainBaseClass;

/**
 * A Utility class for handling main script messages
 *
 * @class
 * @extends {MainBaseClass}
 * @memberOf mainScript
 */
class MainMessageHandlers extends MainBaseClass {

    /**
     * Creates MainMessageHandlers instance
     *
     * @constructor
     * @return {MainMessageHandlers}              Instance of MainMessageHandlers class
     */
    constructor() {
        super();
        return this;
    }

    /**
     * Executes received message based on message data
     *
     * @param  {string} instruction Message instruction
     * @param  {Object} messageData        Data passed with message
     * @return {Boolean}            True if handler is found, false otherwise
     */
    execute (instruction, messageData){
        let methodName = instruction + 'Handler';
        if (this[methodName] && _.isFunction(this[methodName])){
            this[methodName](messageData);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Simple ping handler - responds with 'pong' instruction
     *
     * @param  {Object} messageData        Data passed with message
     * @return {undefined}
     */
    pingHandler (messageData) {
        let duration = 500;
        if (messageData.data && messageData.data.duration && _.isInteger(messageData.data.duration)){
            duration = messageData.data.duration;
        }
        setTimeout( () =>{
            mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend(messageData, {instruction: 'pong', _result_: true}));
        }, duration);
    }

    /**
     * Logging handler - logs message data to console
     *
     * @param  {Object} messageData        Data passed with message
     * @return {undefined}
     */
    logHandler (messageData) {
        if (messageData && messageData.data){
            if (messageData.data.message){
                let type = messageData.data.type || 'info';
                let force = messageData.data.force || false;
                let forceToWindow = messageData.data.forceToWindow || false;
                this.log(messageData.data.message, type, messageData.data.data, force, forceToWindow);
                mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend({_result_: true}, messageData));
            } else {
                this.log('Can not log message - no message supplied', 'error', []);
                mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend({_result_: false}, messageData));
            }
        } else {
            this.log('Can not log message - no data supplied', 'error', []);
            mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend({_result_: false}, messageData));
        }
    }

    /**
     * Property logging handler - logs mainScript property from message data to console
     *
     * @param  {Object} messageData        Data passed with message
     * @return {undefined}
     */
    logMainScriptPropertyHandler (messageData) {
        if (messageData.data && messageData.data.property) {
            let prop = _.get(mainScript, messageData.data.property);
            if (prop){
                let type = messageData.data.type || 'info';
                let force = messageData.data.force || false;
                let forceToWindow = messageData.data.forceToWindow || false;
                this.log(prop, type, messageData.data.data, force, forceToWindow);
                mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend({_result_: true}, messageData));
            } else {
                this.log('Can not find mainScript property "{1}"', 'error', [messageData.data.property]);
                mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend({_result_: false}, messageData));
            }
        } else {
            this.log('Can not find mainScript property - no property supplied', 'error', []);
            mainScript.mainWindow.globalEmitter.emit('messageResponse', _.extend({_result_: false}, messageData));
        }
    }
}

exports.MainMessageHandlers = MainMessageHandlers;