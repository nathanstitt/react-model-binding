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
    this.attrs = {};
}

ReactEventBinding.prototype.componentName = function() {
    return this.component.constructor.displayName;
};

ReactEventBinding.prototype.configure = function(bindings, options){
    for (var name in bindings) {
        var attr = bindings[name];
        if (attr !== false) {
            this.bindAttr(name, attr, options);
        }
    }
};

ReactEventBinding.prototype.bindAttr = function(name, attr, options) {
    if (!attr) {
        warn(name + " is not set on " + (this.componentName()));
        return;
    }
    var prevAttr = this.attrs[name];
    if (prevAttr === attr) { return; }

    if (options == null) { options = {}; }
    var customEvents = result(this.component, 'bindEvents', {});
    var events = customEvents[name];
    if (!events){
        events = (name === 'collection' || attr.isCollection) ? 'add remove reset' : 'change';
    }
    if (prevAttr){
        this.stopListening(prevAttr);
    }
    this.attrs[name] = attr;

    this.listenTo(attr, events, this.setComponentState);
    if (!options.silent) {
        this.setComponentState(attr);
    }
    if (isFunction(this.component.onAttributeBind)){
        this.component.onAttributeBind(this, name, prevAttr);
    }
};

ReactEventBinding.prototype.destroy = function() {
    this.stopListening();
};

ReactEventBinding.prototype.setComponentState = function() {
    if (!this.component.isMounted()) {
        return;
    }
    if (isFunction(this.component.setDataState)) {
        this.component.setDataState.apply(this.component, arguments);
    } else {
        this.component.forceUpdate();
    }
};

ReactEventBinding.prototype.reset = function(newAttrs, options) {
    for (var name in newAttrs) {
        if (this.attrs[name]){
            this.bindAttr(name, newAttrs[name], options);
        }
    }
};

Events.createEmitter(ReactEventBinding.prototype);


// create a defined property unless property name already exists
function configureGetter(comp, name){
    if (!(name in comp.constructor.prototype)){
        Object.defineProperty(comp.constructor.prototype, name, {
            configurable: true, enumerable: true,
            get: function(){
                return this.modelBindings.attrs[name];
            }
        });
    }
}

// binds any "model" or "collection" props, combined with any that
// are specified by the components "modelBindings" property
function readBindings(comp, newProps) {
    var bindings = clone(result(comp, 'modelBindings')) || {};
    DEFAULT_PROP_BINDINGS.forEach(function(prop){
        if (comp.props[prop]){
            bindings[prop] = (bindings[prop] || 'props');
        }
    });
    bindings = mapValues(bindings, function(value, name) {
        configureGetter(comp, name);
        if (isFunction(value)){
            return value.call(comp);
        } else if (value === 'props'){
            return newProps[name] || comp.props[name];
        } else {
            return value;
        }
    });
    if (!isEmpty(bindings)){
        comp.modelBindings = new ReactEventBinding(comp);
        comp.modelBindings.configure(bindings, {silent: true});
    }
}

var ReactEventBindingMixin = {

    getInitialState: function(){
        readBindings(this, this.props);
        return {};
    },

    componentWillReceiveProps: function(nextProps){
        if (this.modelBindings){
            this.modelBindings.reset(nextProps);
        } else {
            readBindings(this, nextProps);
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
