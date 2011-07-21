/* vim:ts=4:sts=4:sw=4:
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

var oop = require("pilot/oop");
var EventEmitter = require("pilot/event_emitter").EventEmitter;
var Range = require("ace/range").Range;
var dom = require("pilot/dom");

var Livedoc = function(parentEl) {
	this.clickthrough_bg = dom.createElement("div");
    this.clickthrough_bg.className = "ace_layer ace_livedoc-overlay";
	parentEl.appendChild(this.clickthrough_bg);

	this.interaction_layer = dom.createElement("div");
    this.interaction_layer.className = "ace_layer ace_livedoc-layer";
	parentEl.appendChild(this.interaction_layer);

	this.clickthrough_fg = dom.createElement("div");
    this.clickthrough_fg.className = "ace_layer ace_livedoc-overlay";
	parentEl.appendChild(this.clickthrough_fg);

	//This will hopefully be reset after the session is set
	this.model = undefined;
};

(function() {
    this.setSession = function(session) {
		var self = this;
        self.session = session;

		//set the livedoc initially and after any changes
		self.setModel(self.session.livedoc);
		self.session.addEventListener("livedocChanged", function() {
			if(self.session.hasOwnProperty("livedoc")) {
				self.setModel(self.session.livedoc);
			}
		});
    };

	this.setModel = function(livedoc_model) {
		this.model = livedoc_model;
		if(this.model !== undefined) {
			this.model.setLayer(this);
		}
	};

	//Mainly for when something about the editor, and not about the model changes
    this.update = function(config) {
        var config = config || this.config;
        if (!config)
            return;
        this.config = config;
		if(this.model !== undefined) {
			this.model.update_annotations(this.config);
		}
    };
}).call(Livedoc.prototype);

exports.Livedoc = Livedoc;

});
