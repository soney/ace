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

	this.updateState();


	var self = this;
	//This event will only come through if we are NOT clickthrough. This means that
	//We don't want the editor to see the user's click.
	this.element.addEventListener("mousedown", function(mouse_event) {
		if(mouse_event.target === self.element) {
			if(self.model.is_search()) {
				self.model.hideSearch();
				return;
			}
			else if(self.model.is_doc()) {
				self.model.hideDoc();
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

		//set the livedoc initially and after any changes
		self.setModel(self.session.livedoc);
		self.session.addEventListener("livedocChanged", function() {
			if(self.session.hasOwnProperty("livedoc")) {
				self.setModel(self.session.livedoc);
			}
		});
    };

	this.get_top_left = function(row, col, config) {
		return {x: this.$getLeft(col, config), y: this.$getTop(row, config)};
	};
	this.get_bottom_left = function(row, col, config) {
		return this.get_top_left(row+1, col, config);
	};
	this.get_top_right = function(row, col, config) {
		return this.get_top_left(row, col+1, config);
	};
	this.get_bottom_right = function(row, col, config) {
		return this.get_top_left(row+1, col+1, config);
	};

	this.setModel = function(livedoc_model) {
		if(!this.$updateState) this.$updateState = this.updateState.bind(this);
		if(!this.$updateWindowPosition) this.$updateWindowPosition = this.updateWindowPosition.bind(this);

		//If there already is a model, then stop listning to any events we were listening to before
		if(this.model) {
			this.model.removeEventListener("stateChange", this.$updateState);
			this.model.removeEventListener("insertionRangeChange", this.$updateWindowPosition);
			this.model.removeEventListener("highlightedRangeChange", this.$updateWindowPosition);
		}
		this.model = livedoc_model;
		if(this.model) {
			this.model.addEventListener("stateChange", this.$updateState);
			this.model.addEventListener("insertionRangeChange", this.$updateWindowPosition);
			this.model.addEventListener("highlightedRangeChange", this.$updateWindowPosition);
		}
	};

	//Mainly for when something about the editor, and not about the model changes
    this.update = function(config) {
        var config = config || this.config;
        if (!config)
            return;
        this.config = config;

		this.updateWindowPosition();
    };

	this.getRowMarker = function(from_row, to_row, config, clazz) {
		var top = width = height = null;

		width = config.width; //We are getting the whole row, so width is always the whole width
		if(from_row !== null && to_row !== null) { //An actual range
			top = this.$getTop(from_row, config);
			var bottom = this.$getTop(to_row + 1, config);

			height = bottom - top;
		}
		else if(from_row === null && to_row !== null) { //From top of file to somewhere
			top = 0;
			height = this.$getTop(to_row, config);
		}
		else if(from_row !== null && to_row === null) { //From somewhere to bototm of file
			top = this.$getTop(from_row + 1, config);
			var bottom = config.height + 30; //Add an extra 30 pixels for good measure

			height = bottom - top;
		}
		else { //The entire file
			top = 0;
			var bottom = config.height + 30;

			height = bottom - top;
		}

		if(height > 0) {
			var sb = [
					"<div class='", clazz, "' style='",
						"height: ", height, "px;",
						"width: ", width, "px;",
						"top: ", top, "px;'></div>"

				];
			var str = sb.join('');
			return str;
		}
		else {
			return "";
		}
	};

	this.getInlineMarker = function(row, from_col, to_col, config, clazz) {
		var top = width = height = left = null;

		top = this.$getTop(row, config);
		height = config.lineHeight;

		if(from_col !== null && to_col !== null) {
			left = this.$getLeft(from_col, config);
			var right = this.$getLeft(to_col+1, config);
			width = right - left;
		}
		else if(from_col === null && to_col !== null) {
			left = 0;
			var right = this.$getLeft(to_col+1, config);
			width = right - left;
		}
		else if(from_col !== null && to_col === null) {
			left = this.$getLeft(from_col, config);
			var right = config.width;
			width = right - left;
		}
		else { //The entire row
			left = 0;
			width = config.width
		}

		if(height > 0 && width > 0) {
			var sb = [
					"<div class='", clazz, "' style='",
						"left: ", left, "px;",
						"height: ", height, "px;",
						"width: ", width, "px;",
						"top: ", top, "px;'></div>"
				];
			var str = sb.join('');
			return str;
		}
		else {
			return "";
		}
	};

	this.getMarker = function(from_row, from_col, to_row, to_col, config, clazz) {
		if(arguments.length === 3) { //Given as a range
			var range = arguments[0];
			config = arguments[1];
			clazz = arguments[2];

			from_row = range.start.row;
			from_col = range.start.column;
			to_row = range.end.row;
			to_col = range.end.column;
		}
		else if(arguments.length === 4) {
			var from = arguments[0];
			var to = arguments[1];
			config = arguments[2];
			clazz = arguments[3];

			from_row = from.row;
			from_col = from.column;
			to_row = to.row;
			to_col = to.column;
		}
		var sb = [];
		if(from_row !== null && from_col !== null && to_row !== null && to_col !== null) {

			if(to_row > from_row) {
				/*
				   |--------OOOO|
				   |OOOOOOOOOOOO|
				   |OOOOOOOOOOOO|
				   |OOOO--------|
				   |------------|
				*/
				/*
					From left of start to far right
				   |--------XXXX|
				   |OOOOOOOOOOOO|
				   |OOOOOOOOOOOO|
				   |OOOO--------|
				   |------------|
				*/
				sb.push(this.getInlineMarker(from_row, from_col, null, config, clazz));
				/*
					From far left of end right of end
				   |--------OOOO|
				   |OOOOOOOOOOOO|
				   |OOOOOOOOOOOO|
				   |XXXX--------|
				   |------------|
				*/
				sb.push(this.getInlineMarker(to_row, null, to_col, config, clazz));
				/*
					All of the lines in between
				   |--------OOOO|
				   |XXXXXXXXXXXX|
				   |XXXXXXXXXXXX|
				   |OOOO--------|
				   |------------|
				*/
				sb.push(this.getRowMarker(from_row + 1, to_row - 1, config, clazz));
			}
			else {
				/*
				   |------------|
				   |---OOOOOO---|
				   |------------|
				*/
				/*
				   |------------|
				   |---XXXXXX---|
				   |------------|
				*/
				sb.push(this.getInlineMarker(from_row, from_col, to_col, config, clazz));
			}
		}
		else if(from_row === null && from_col === null && to_row !== null && to_col !== null) {
			//from beginning of file to top of line
			sb.push(this.getRowMarker(null, to_row, config, clazz));
			//from far left of top line to left of top line
			sb.push(this.getInlineMarker(to_row, null, to_col, config, clazz));
		}
		else if(from_row !== null && from_col !== null && to_row === null && to_col === null) {
			//from bottom of line to end of file
			sb.push(this.getRowMarker(from_row, null, config, clazz));
			//from right of bottom line to far right
			sb.push(this.getInlineMarker(from_row, from_col, null, config, clazz));
		}
		else if(from_row !== null && from_col !== null && to_row !== null && to_col === null) {
			if(to_row > from_row) {
				/*
				   |--------OOOO|
				   |OOOOOOOOOOOO|
				   |OOOOOOOOOOOO|
				   |OOOOOOOOOOOO|
				   |------------|
				*/
				/*
					From left of start to far right
				   |--------XXXX|
				   |OOOOOOOOOOOO|
				   |OOOOOOOOOOOO|
				   |OOOO--------|
				   |------------|
				*/
				sb.push(this.getInlineMarker(from_row, from_col, null, config, clazz));
				/*
					All of the lines in between
				   |--------OOOO|
				   |XXXXXXXXXXXX|
				   |XXXXXXXXXXXX|
				   |XXXXXXXXXXXX|
				   |------------|
				*/
				sb.push(this.getRowMarker(from_row + 1, to_row, config, clazz));
			}
			else {
				/*
				   |------------|
				   |---OOOOOOOOO|
				   |------------|
				*/
				/*
				   |------------|
				   |---XXXXXXXXX|
				   |------------|
				*/
				sb.push(this.getInlineMarker(from_row, from_col, null, config, clazz));
			}
		}
		else if(from_row !== null && from_col === null && to_row !== null && to_col === null) {
			//from bottom of line to end of file
			sb.push(this.getRowMarker(from_row, to_row, config, clazz));
		}
		else {
			console.log("UNHANDLED CASE");
		}

		var str = sb.join('');
		return str;
	};

	this.updateOverlay = function() {
		var config = this.config;
		if(!config) return;

		var range = this.model.insertionRange.toScreenRange(this.session);

		if(!range) return;

		var overlay_str = [];

		var overlay_class="doc_overlay",
			selection_class="doc_selection";


		//Overlay over non-editing content
		overlay_str.push(this.getMarker(null, null, range.start.row, range.start.column-1, config, overlay_class));
		overlay_str.push(this.getMarker(range.end.row, range.end.column+1, null, null, config, overlay_class));


		var outline = this.getOutline(range, config);
		var highlights;
		if(this.model.highlightedRanges) {
			var highlight_sb = [];
			for(var i = 0, len = this.model.highlightedRanges.length; i<len; i++) {
				var highlight_range = this.model.highlightedRanges[i];
				highlight_sb.push(this.getOutline(highlight_range, config));
			}
			highlights = highlight_sb.join("");
		}
		else {
			highlights = "";
		}
		overlay_str.push("<svg>"+outline+highlights+"</svg>");

		this.overlay.innerHTML = overlay_str.join("");
	};

	this.updateWindowPosition = function() {
		var config = this.config;
		if(!config) return; //config contains the information we need about layout and should
							//be set on update, so skip if we haven't set it already

		var model = this.model;

		if(!model) return;

		if(model.is_search()) {
			var box = model.searchBox,
				insertionRange = model.insertionRange.toScreenRange(this.session),
				insertionStart = insertionRange.start;

			var height = box.height();
			var line_top = this.$getTop(insertionStart.row, this.config);

			var box_top = line_top - height;
			//At the very beginning of the file
			if(box_top < 0 && insertionStart.row === 0) {
				line_top = this.$getTop(2, this.config);
				box_top = line_top - height;
			}

			var box_left = this.$getLeft(insertionStart.column, config);
			box.css({
				"top": box_top+"px",
				"left": box_left+"px"
			});
			this.updateOverlay();
		}
		else if(model.is_doc()) {
			var box = model.docBox
				, insertionRange = model.insertionRange.toScreenRange(this.session)
				, insertionStart = insertionRange.start
				, insertionEnd = insertionRange.end;

			var height = box.height();
			var line_top = this.$getTop(insertionEnd.row+1, this.config);

			var box_top = line_top;

			var box_left = this.$getLeft(insertionStart.column, config);
			box.css({
				"top": box_top+"px",
				"left": box_left+"px"
			});
			this.updateOverlay();
		}
	};

	this.getOutline = function(from_row, from_col, to_row, to_col, config) {
		if(arguments.length === 2) { //Given as a range
			var range = arguments[0];
			config = arguments[1];

			from_row = range.start.row;
			from_col = range.start.column;
			to_row = range.end.row;
			to_col = range.end.column;
		}
		if(from_row === to_row) {
			/*
			   Simple case; one line
			   |--OOO--|
		   */
			var tl = this.get_top_left(from_row, from_col, config);
			var br = this.get_bottom_right(to_row, to_col, config);
			var w = br.x - tl.x;
			var h = br.y - tl.y;

			return '<rect x="'+tl.x+'" y="'+tl.y+'" width="'+w+'" height="'+h+'" fill="none" stroke="black" />';
		}
		else {
			if(to_row - from_row === 1 && to_col < from_col) {
				/*
				   Two lines that don't intersect
				   |---OOO|
				   |OO----|
				   */
				//For the top right:
				var tl = this.get_top_left(from_row, from_col, config);
				var bl = this.get_bottom_left(from_row, from_col, config);
				var path = [
						[config.width, tl.y]
						, [tl.x, tl.y]
						, [tl.x, bl.y]
						, [config.width, bl.y]
					];
				var tr_str = path.map(function(point, index) {
					var command = index === 0 ? "M" : "L";
					return command + point.join(",");
				}).join(" ");
				
				//For the bottom left:
				tl = this.get_top_left(to_row, 0, config);
				br = this.get_bottom_right(to_row, to_col, config);
				path = [
						[tl.x, tl.y]
						, [br.x, tl.y]
						, [br.x, br.y]
						, [tl.x, br.y]
					];

				var bl_str = path.map(function(point, index) {
					var command = index === 0 ? "M" : "L";
					return command + point.join(",");
				}).join(" ");

				var rv = '<path d="'+tr_str+' '+bl_str+'" style="stroke:black; fill:none;"/>';

				return rv;
			}
			else {
				/*

				   |----1X2|
				   |7XXX8XX|
				   |XXX4XX3|
				   |6XX5---|
			   */
				var point_1_tl = this.get_top_left(from_row, from_col, config);
				var point_4_br = this.get_top_right(to_row, to_col, config);
				var point_5_br = this.get_bottom_right(to_row, to_col, config);
				var point_6_bl = this.get_bottom_left(to_row, 0, config);
				var point_7_tl = this.get_top_left(from_row+1, 0, config);
				var point_8_tl = this.get_top_left(from_row+1, from_col, config);

				var path = [
						[point_1_tl.x, point_1_tl.y] //1
						, [config.width, point_1_tl.y] //2
						, [config.width, point_4_br.y] //3
						, [point_4_br.x, point_4_br.y] //4
						, [point_5_br.x, point_5_br.y] //5
						, [point_6_bl.x, point_6_bl.y] //6
						, [point_7_tl.x, point_7_tl.y] //7
						, [point_8_tl.x, point_8_tl.y] //8
					];

				var points_str = path.map(function(point) {
					return point.join(",");
				}).join(" ");
				
				return '<polygon points="'+points_str+'" fill="none" stroke="black" />';
			}
		}
		return "";
	};

	this.hideAll = function(event) {
		this.element.innerHTML = "";
		this.element.parentNode.focus();

		this.setClickthrough(true);

		if(event.hasOwnProperty("callback")) {
			event.callback();
		}
	};

	this.showSearch = function() {
		var searchBox = this.model.searchBox;
		var dom = searchBox[0];
		this.element.appendChild(dom);

		this.updateWindowPosition();
		searchBox.search_widget("focus");
		searchBox.search_widget("select");
	};

	this.showDoc = function() {
		var docBox = this.model.docBox;
		var dom = docBox[0];

		this.element.appendChild(dom);
		this.updateWindowPosition();
	};

	this.updateState = function(event) {
		if(!this.model || this.model.is_idle()) {
			this.element.innerHTML = "";
			dom.removeCssClass(this.element, "active");

			this.overlay.innerHTML = "";
			dom.removeCssClass(this.overlay, "search_mode");
			dom.removeCssClass(this.overlay, "doc_mode");

			if(this.model) {
				this.model.editor.focus();
			}
		}
		else if(this.model.is_search()) {
			this.element.innerHTML = "";
			dom.addCssClass(this.element, "active");

			this.overlay.innerHTML = "";
			dom.removeCssClass(this.overlay, "doc_mode");
			dom.addCssClass(this.overlay, "search_mode");

			this.showSearch();
		}
		else if(this.model.is_doc()) {
			this.element.innerHTML = "";
			dom.addCssClass(this.element, "active");

			this.overlay.innerHTML = "";
			dom.removeCssClass(this.overlay, "search_mode");
			dom.addCssClass(this.overlay, "doc_mode");

			this.showDoc();
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
