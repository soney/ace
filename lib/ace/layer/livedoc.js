/* vim:ts=4:sts=4:sw=4:
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

var oop = require("pilot/oop");
var EventEmitter = require("pilot/event_emitter").EventEmitter;
var Range = require("ace/range").Range;
var dom = require("pilot/dom");

var Livedoc = function(parentEl) {
    this.element = dom.createElement("div");
    this.element.className = "ace_layer ace_livedoc-layer";
    parentEl.appendChild(this.element);

	//Ensure that the user can click through our element (which covers the whole editor)
	//to interact with the editor
	this.setClickthrough(true);


	var self = this;
	//This event will only come through if we are NOT clickthrough. This means that
	//We don't want the editor to see the user's click.
	this.element.addEventListener("mousedown", function(mouse_event) {
		mouse_event.stopPropagation();
		//mouse_event.preventDefault() commented out because if the user clicks on the search
		//box after a prevent default, the mouse is still disabled
	}, false);

	//This will hopefully be reset after the session is set
	this.model = null;
};

(function() {
    oop.implement(this, EventEmitter);

    this.setSession = function(session) {
		var self = this;
        self.session = session;
		self.session.addEventListener("livedocChanged", function() {
			if(self.session.hasOwnProperty("livedoc")) {
				self.setModel(self.session.livedoc);
			}
		});
    };

	this.setModel = function(livedoc_model) {
		//If there already is a model, then stop listning to any events we were listening to before
		if(this.model !== null) {
			this.model.removeEventListener("showWindow");
			this.model.removeEventListener("hideAll");
		}
		this.model = livedoc_model;
		this.model.addEventListener("showWindow", this.onShowWindow.bind(this));
		this.model.addEventListener("hideAll", this.onHideAll.bind(this));
	};

	//Mainly for when something about the editor, and not about the model changes
    this.update = function(config) {
        var config = config || this.config;
        if (!config)
            return;

        this.config = config;

        var html = [];        
    };


	//The user has requested that we show something
	this.onShowWindow = function(event) {
		var dom = event.dom;

		this.element.innerHTML = "";
		this.element.appendChild(dom);

		this.setClickthrough(false);

		//Does the event have a callback it wants us to run after installation?
		if(event.hasOwnProperty("callback")) {
			event.callback(dom);
		}
	};

	this.onHideAll = function(event) {
		this.element.innerHTML = "";
		this.element.parentNode.focus();

		this.setClickthrough(true);

		if(event.hasOwnProperty("callback")) {
			event.callback();
		}
	};

	this.setClickthrough = function(clickthrough) {
		if(clickthrough) {
			dom.addCssClass(this.element, "idle");
			dom.removeCssClass(this.element, "active");
		}
		else {
			dom.removeCssClass(this.element, "idle");
			dom.addCssClass(this.element, "active");
		}
	};

}).call(Livedoc.prototype);

exports.Livedoc = Livedoc;

});
