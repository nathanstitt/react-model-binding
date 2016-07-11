var State = require('ampersand-state');

var Person = State.extend({
    props: {
        firstName: 'string',
        lastName: 'string'
    },
    session: {
        signedIn: ['boolean', true, false]
    },
    derived: {
        signedInStatus: {
            deps: ['signedIn'], fn: function(){
                return this.signedIn ? 'signed in' : 'logged out';
            }
        },
        fullName: {
            deps: ['firstName', 'lastName'], fn: function () {
                return this.firstName + ' ' + this.lastName;
            }
        }
    }
});


module.exports = Person;
