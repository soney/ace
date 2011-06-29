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

	this.setClickthrough(true);
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
		this.model = livedoc_model;
		this.model.addEventListener("showWindow", this.onShowWindow.bind(this));
		this.model.addEventListener("hideAll", this.onHideAll.bind(this));
	};

    this.update = function(config) {
        var config = config || this.config;
        if (!config)
            return;

        this.config = config;

        var html = [];        
    };

	this.onShowWindow = function(event) {
		var dom = event.dom;

		this.element.innerHTML = "";
		this.element.appendChild(dom);

		this.setClickthrough(false);

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
