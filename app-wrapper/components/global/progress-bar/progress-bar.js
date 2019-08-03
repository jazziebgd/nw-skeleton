/**
 * @fileOverview progress-bar component file
 * @author Dino Ivankov <dinoivankov@gmail.com>
 * @version 1.3.1
 */

var _appWrapper = window.getAppWrapper();
var appState = _appWrapper.getAppState();
/**
 * Progress bar component
 *
 * @name progress-bar
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
    name: 'progress-bar',
    template: '',
    props: ['dontDisplay', 'appStatusWrapperClassObject'],
    data: function () {
        return appState.progressData;
    },
    computed: {
        progressData: function(){
            return appState.progressData;
        },
        appState: function(){
            return appState;
        }
    }
};