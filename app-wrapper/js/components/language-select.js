var _appWrapper = window.getAppWrapper();
var appState = _appWrapper.getAppState();

exports.component = {
    name: 'language-select',
    template: _appWrapper.appTemplates.getTemplateContents('language-select'),
    methods: {
        callViewHandler: _appWrapper.callViewHandler.bind(_appWrapper)
    },
    computed: {
        appState: function(){
            return appState;
        }
    },
    data: function () {
        return appState.languageData;
    }
};