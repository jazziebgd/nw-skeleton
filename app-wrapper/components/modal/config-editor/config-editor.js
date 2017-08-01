/**
 * @fileOverview config-editor component file
 * @author Dino Ivankov <dinoivankov@gmail.com>
 * @version 1.2.1
 */

const _ = require('lodash');
var _appWrapper = window.getAppWrapper();
var appState = _appWrapper.getAppState();
/**
 * Config editor component
 *
 * @name config-editor
 * @memberOf components
 * @property {string}   name        Name of the component
 * @property {string}   template    Component template contents
 * @property {string[]} props       Component properties
 * @property {Function} data        Data function
 * @property {Object}   methods     Component methods
 * @property {Object}   watch       Component watchers
 * @property {Object}   computed    Computed properties
 * @property {Object}   components  Child components
 */
exports.component = {
    name: 'config-editor',
    template: '',
    data: function () {
        var appConfig = _.cloneDeep(appState.configEditorData);
        var config = _.map(appConfig, function(value, name){
            return _appWrapper.getHelper('util').getControlObject(value, name, 'config');
        });

        var data = {
            config: config
        };

        return data;
    },
    computed: {
        appState: function(){
            return appState;
        },
        configEditorData: function(){
            return appState.configEditorData;
        }
    },
    components: []
};