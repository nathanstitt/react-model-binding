var Events     = require('ampersand-events');
var clone      = require('lodash/clone');
var result     = require('lodash/result');
var isEmpty    = require('lodash/isEmpty');
var mapValues  = require('lodash/mapValues');
var isFunction = require('lodash/isFunction');

var warn = global.console ? global.console.warn : function(){};
var DEFAULT_PROP_BINDINGS = ['model', 'collection'];

function ReactEventBinding(component){
    this.component = component;
    this.bindingsDefinition = component.modelBindings;
    this.models = {};
    component.modelBindings = this;
}

ReactEventBinding.prototype.componentName = function() {
    return this.component.constructor.displayName;
};

ReactEventBinding.prototype.configure = function(bindings, options){
    for (var name in bindings) {
        var model = bindings[name];
        if (model !== false) {
            this.bindModel(name, model, options);
        }
    }
};

ReactEventBinding.prototype.bindModel = function(name, model, options) {
    if (!model) {
        warn(name + " is not set on " + (this.componentName()));
        return;
    }
    var prevModel = this.models[name];
    if (prevModel === model) { return; }

    if (options == null) { options = {}; }
    var customEvents = result(this.component, 'bindEvents', {});
    var events = customEvents[name];
    if (!events){
        events = (name === 'collection' || model.isCollection) ? 'add remove reset' : 'change';
    }
    if (prevModel){
        if (isFunction(this.component.onModelUnbind)){
            this.component.onModelUnbind(prevModel, name);
        }
        this.stopListening(prevModel);
    }
    this.models[name] = model;

    this.listenTo(model, events, this.setComponentState);
    if (!options.silent) {
        this.setComponentState(model);
    }
    if (isFunction(this.component.onModelBind)){
        this.component.onModelBind(model, name);
    }
};

ReactEventBinding.prototype.destroy = function() {
    if (isFunction(this.component.onModelUnbind)){
        for(var prop in this.models){
            this.component.onModelUnbind(this.models[prop], prop);
        }
    }
    this.stopListening();
    this.component.modelBindings = this.bindingsDefinition;
};

ReactEventBinding.prototype.setComponentState = function() {
    if (!this.component.isMounted()) {
        return;
    }
    if (isFunction(this.component.setModelState)) {
        this.component.setModelState.apply(this.component, arguments);
    } else {
        this.component.forceUpdate();
    }
};

ReactEventBinding.prototype.reset = function(newModels, options) {
    for (var name in newModels) {
        if (this.models[name]){
            this.bindModel(name, newModels[name], options);
        }
    }
};

Events.createEmitter(ReactEventBinding.prototype);

// create a defined property unless property name already exists
function configureGetter(comp, name){
    if (!(name in comp.constructor.prototype)){
        Object.defineProperty(comp.constructor.prototype, name, {
            configurable: true, enumerable: false,
            get: function(){
                return this.modelBindings.models[name];
            }
        });
    }
}

// binds any "model" or "collection" props, combined with any that
// are specified by the components "modelBindings" property
function installBindings(comp, newProps) {
    var definitions = clone(result(comp, 'modelBindings')) || {};
    DEFAULT_PROP_BINDINGS.forEach(function(prop){
        if (comp.props[prop]){
            definitions[prop] = (definitions[prop] || 'props');
        }
    });
    definitions = mapValues(definitions, function(value, name) {
        configureGetter(comp, name);
        if (isFunction(value)){
            return value.call(comp);
        } else if (value === 'props'){
            return newProps[name] || comp.props[name];
        } else {
            return value;
        }
    });
    if (!isEmpty(definitions)){
        var bindings = new ReactEventBinding(comp);
        bindings.configure(definitions, {silent: true});
    }
}

var ReactEventBindingMixin = {

    getInitialState: function(){
        installBindings(this, this.props);
        return {};
    },

    componentWillReceiveProps: function(nextProps){
        if (this.modelBindings){
            this.modelBindings.reset(nextProps);
        } else {
            installBindings(this, nextProps);
        }
    },

    componentWillUnmount: function(){
        if (this.modelBindings){
            this.modelBindings.destroy();
            delete this.modelBindings;
        }
    }

};


module.exports = ReactEventBindingMixin;
