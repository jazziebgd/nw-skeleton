var _appWrapper = window.getAppWrapper();
var appUtil = _appWrapper.getAppUtil();
var appState = appUtil.getAppState();

exports.component = {
    name: 'user-messages-list',
    template: _appWrapper.appTemplates.getTemplateContents('user-messages-list'),
    methods: {
        callViewHandler: _appWrapper.callViewHandler.bind(_appWrapper)
    },
    updated: function () {
        let ul = this.$el.querySelector('ul');
        clearTimeout(appState.timeouts.userMessageScroll);
        appState.timeouts.userMessageScroll = setTimeout( () => {
            _appWrapper.getHelper('html').scrollElementTo(ul, ul.scrollHeight, 0);
        }, 100);
    },
    data: function () {
        return appState.userMessagesData;
    },
    computed: {
        appState: function(){
            return appState;
        }
    }
};