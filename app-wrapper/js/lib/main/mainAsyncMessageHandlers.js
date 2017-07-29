/**
 * @fileOverview MainAsyncMessageHandlers class file
 * @author Dino Ivankov <dinoivankov@gmail.com>
 * @version 1.2.0
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
class MainAsyncMessageHandlers extends MainBaseClass {

    /**
     * Creates MainAsyncMessageHandlers instance
     *
     * @constructor
     * @return {MainAsyncMessageHandlers}              Instance of MainAsyncMessageHandlers class
     */
    constructor() {
        super();
        return this;
    }

    /**
     * Executes received async message based on message data
     *
     * @param  {string} instruction Message instruction
     * @param  {string} uuid        UUID of the message
     * @param  {Object} messageData        Data passed with message
     * @return {Boolean}            True if handler is found, false otherwise
     */
    execute (instruction, uuid, messageData){
        let methodName = instruction + 'Handler';
        if (this[methodName] && _.isFunction(this[methodName])){
            this[methodName](uuid, messageData);
            return true;
        } else {
            return false;
        }

    }

    /**
     * Basic handler for 'test' instruction - just returns same passed data after 5 seconds
     *
     * @param  {string} uuid    UUID of the message
     * @param  {Object} messageData    Data passed with message
     * @return {undefined}
     */
    testHandler (uuid, messageData) {
        let duration = 5000;
        if (messageData.data && messageData.data.duration && _.isInteger(messageData.data.duration)){
            duration = messageData.data.duration;
        }
        let responseData = _.extend({_result_: true}, messageData);
        setTimeout( () => {
            mainScript.mainWindow.globalEmitter.emit('asyncMessageResponse', responseData);
        }, duration);
    }
}

exports.MainAsyncMessageHandlers = MainAsyncMessageHandlers;