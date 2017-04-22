var _appWrapper = window.getAppWrapper();
var appUtil = _appWrapper.getAppUtil();
var appState = appUtil.getAppState();

exports.component = {
    name: 'form-control-select',
    template: _appWrapper.templateContents.componentTemplates['form-control-select'],
    props: ['control'],
    data: function () {
        return appState.appInfo;
    },
    components: []
};