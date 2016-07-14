var React     = require('react');
var ModelBinding = require('../react-model-binding');

var ComponentWithBindings = React.createClass({
    mixins: [ModelBinding],
    modelBindings: {
        person: 'props'
    },
    bindEvents: { },
    render: function(){
        return (
            <div>
                {this.person.fullName} is {this.person.signedInStatus}
            </div>
        );
    }
});


var Parent = React.createClass({

    getInitialState: function(){
        return this.props;
    },

    render: function(){
        return (
                <ComponentWithBindings ref='child' {...this.state} />
        );
    }
});


module.exports = Parent;
