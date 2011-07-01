/* vim:ts=4:sts=4:sw=4:
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

var oop = require("pilot/oop");
var EventEmitter = require("pilot/event_emitter").EventEmitter;
var Range = require("ace/range").Range;
var dom = require("pilot/dom");

var Livedoc = function(parentEl) {
	this.overlay = dom.createElement("div");
    this.overlay.className = "ace_layer ace_livedoc-overlay";
	parentEl.appendChild(this.overlay);

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
		if(mouse_event.target === self.element) {
			if(self.model.is_search()) {
				self.model.hideSearch();
				return;
			}
		}

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
			/*
			this.model.removeEventListener("showWindow");
			this.model.removeEventListener("hideAll");
			this.model.removeEventListener("insertionRangeChange");
			*/
			//TODO: remove event listeners properly
		}
		this.model = livedoc_model;
		this.model.addEventListener("showWindow", this.showWindow.bind(this));
		this.model.addEventListener("hideAll", this.hideAll.bind(this));
		this.model.addEventListener("insertionRangeChange", this.updateDocOverlay.bind(this));
	};

	//Mainly for when something about the editor, and not about the model changes
    this.update = function(config) {
        var config = config || this.config;
        if (!config)
            return;
        this.config = config;

		this.updateWindowPosition();
		if(this.model.is_doc()) {
			this.updateDocOverlay();
		}
    };


	//The user has requested that we show something
	this.showWindow = function(event) {
		var dom = event.dom;

		this.element.innerHTML = "";
		this.element.appendChild(dom);

		this.setClickthrough(false);

		this.updateWindowPosition();

		//Does the event have a callback it wants us to run after installation?
		if(event.hasOwnProperty("callback")) {
			event.callback(dom);
		}
	};

	this.updateDocOverlay = function() {
		var config = this.config;
		if(!config) return;

		var range = this.model.insertionRange;
		var overlay_str = [];

		var overlay_clazz="doc_overlay",
			selection_clazz="doc_selection";

		//from beginning of file to top of line
		var top = 0;
		var width = config.width;
		var height = this.$getTop(range.start.row, config);


        overlay_str.push(
            "<div class='", overlay_clazz, "' style='",
            "height:", height, "px;",
            "width:", width, "px;",
            "top:", top, "px;'></div>"
        );


		//from bottom of line to end of file
		top = this.$getTop(range.end.row+1, config);
		var bottom = config.height+30; //add in an extra 30 pixels for good measure
		height = bottom - top;


        overlay_str.push(
            "<div class='", overlay_clazz, "' style='",
            "height:", height, "px;",
            "width:", width, "px;",
            "top:", top, "px;'></div>"
        );

		//from left of top line to right of top line
		top = this.$getTop(range.start.row, config);
		height = config.lineHeight;
		width = this.$getLeft(range.start.column, config);

        overlay_str.push(
            "<div class='", overlay_clazz, "' style='",
            "height:", height, "px;",
            "width:", width, "px;",
            "top:", top, "px;'></div>"
        );

		//from right of bottom line to far right
		top = this.$getTop(range.end.row, config);
		var right = config.width;
		var left = this.$getLeft(range.end.column, config);
		width = right-left;

        overlay_str.push(
            "<div class='", overlay_clazz, "' style='",
			"left:", left, "px;",
            "height:", height, "px;",
            "width:", width, "px;",
            "top:", top, "px;'></div>"
        );

		//from left of top line to right of top line
		top = this.$getTop(range.start.row, config);
		left = this.$getLeft(range.start.column, config);
		right = this.$getLeft(range.end.column, config);
		width = right - left;

        overlay_str.push(
            "<div class='", selection_clazz, "' style='",
			"left:", left, "px;",
            "height:", height, "px;",
            "width:", width, "px;",
            "top:", top, "px;'></div>"
        );

		this.overlay.innerHTML = overlay_str.join("");
	};

	this.updateWindowPosition = function() {
		var config = this.config;
		if(!config) return; //config contains the information we need about layout and should
							//be set on update, so skip if we haven't set it already

		var model = this.model;

		if(model.is_search()) {
			var box = model.searchBox,
				insertionRange = model.insertionRange,
				insertionStart = insertionRange.start;

			var height = box.height();
			var line_top = this.$getTop(insertionStart.row, this.config);

			var box_top = line_top - height;
			if(box_top < 0) box_top = 0; //If it's off the screen, put it back on

			var box_left = this.$getLeft(insertionStart.column, config);
			box.css({
				"top": box_top+"px",
				"left": box_left+"px"
			});
		}
		else if(model.is_doc()) {
			var box = model.docBox,
				insertionRange = model.insertionRange,
				insertionStart = insertionRange.start;

			var height = box.height();
			var line_top = this.$getTop(insertionStart.row+2, this.config);

			var box_top = line_top - height;
			if(box_top < 0) box_top = 0; //If it's off the screen, put it back on

			var box_left = this.$getLeft(insertionStart.column, config);
			box.css({
				"top": box_top+"px",
				"left": box_left+"px"
			});
		}
	};

	this.hideAll = function(event) {
		this.element.innerHTML = "";
		this.element.parentNode.focus();

		this.setClickthrough(true);

		if(event.hasOwnProperty("callback")) {
			event.callback();
		}
	};

	this.setClickthrough = function(clickthrough) {
		if(clickthrough) {
			this.overlay.innerHTML = "";
			dom.addCssClass(this.element, "idle");
			dom.removeCssClass(this.element, "active");
			dom.removeCssClass(this.overlay, "search_mode");
			dom.removeCssClass(this.overlay, "doc_mode");
		}
		else {
			dom.removeCssClass(this.element, "idle");
			dom.addCssClass(this.element, "active");
			if(this.model.is_search()) {
				this.overlay.innerHTML = "";
				dom.addCssClass(this.overlay, "search_mode");
			}
			else if(this.model.is_doc()) {
				dom.removeCssClass(this.overlay, "search_mode");
				dom.addCssClass(this.overlay, "doc_mode");
				this.updateDocOverlay();
			}
		}
	};

    this.$getTop = function(row, layerConfig) {
        return (row - layerConfig.firstRowScreen) * layerConfig.lineHeight;
    };

	this.$getLeft = function(col, layerConfig) {
		return Math.round(col * layerConfig.characterWidth);
	};

}).call(Livedoc.prototype);

exports.Livedoc = Livedoc;

});
