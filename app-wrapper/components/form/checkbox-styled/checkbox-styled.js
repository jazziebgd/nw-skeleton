var utilHelper = window.getAppWrapper().getHelper('util');

exports.component = {
    name: 'checkbox-styled',
    template: '',
    props: ['class', 'change', 'name', 'data', 'modelProperty'],
    cbModel: false,
    modelParent: null,
    watchOn: false,
    noWatchChange: false,
    data: function () {
        return {
            cbModel: this.cbModel
        };
    },
    created: function() {
        this.cbModel = utilHelper.getVar(this.modelProperty);
    },
    mounted: function(){
        if (!this.watchOn && window && window.feApp && window.feApp.$watch){
            this.watchOn = window.feApp.$watch(this.modelProperty, this.modelPropertyChanged.bind(this));
        }
    },
    beforeUnmount: function(){
        if (this.watchOn){
            this.watchOn();
            this.watchOn = false;
        }
    },
    beforeDestroy: function(){
        if (this.watchOn){
            this.watchOn();
            this.watchOn = false;
        }
    },
    methods: {
        handleChange: function(){
            utilHelper.setVar(this.modelProperty, this.cbModel);
        },
        modelPropertyChanged: function(){
            this.cbModel = utilHelper.getVar(this.modelProperty);
        }
    }
};