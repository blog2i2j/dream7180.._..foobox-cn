﻿// foobox https://github.com/dream7180; JSSB http://br3tt.deviantart.com
window.DefinePanel('JS Smooth Browser', {author: 'Br3tt, dreamawake(MOD), always_beta(CN)', version: '20151114-1630-340', features: {drag_n_drop: true} });
include(fb.ProfilePath + 'foobox\\script\\js_common\\common.js');
include(fb.ProfilePath + 'foobox\\script\\js_common\\JScommon.js');
include(fb.ProfilePath + 'foobox\\script\\js_common\\JSinputbox.js');
include(fb.ProfilePath + 'foobox\\script\\js_common\\Genre.js');
include(fb.ProfilePath + 'foobox\\script\\js_common\\JScomponents.js');

var zdpi = 1;
var dark_mode = 0;
//}
var dir_cover_name = window.GetProperty("foobox.cover.folder.name", "cover.jpg;folder.jpg");
var CACHE_FOLDER = fb.ProfilePath + "foobox\\covercache";
var sys_scrollbar = window.GetProperty("foobox.ui.scrollbar.system", false);
var albcov_lt = window.GetProperty("Album.cover.ignoring.artist", false);
var g_fname, g_fsize, g_fstyle;
var avoid_checkscroll = false;
var pidx = -1; //libview playlist index
var boxText_len = 0;
var albumsource = 0;
var g_color_line = RGBA(0, 0, 0, 45);
var crclist = [], crcmod = [], crcloaded = [];
crclist.length = crcmod.length = crcloaded.length = 4;
var crcidx = 0;

images = {
	loading_angle: 0,
	loading_draw: null,
	noart: null,
	sw_btn_n0: null,
	sw_btn_n1: null,
	img_loading: null
};

ppt = {
	// only in source mode = Playlist
	sourceMode: window.GetProperty("_PROPERTY: Source Mode", 1),
	// 0 = Library, 1 = Playlist
	locklibpl: window.GetProperty("_PROPERTY: Lock to Library playlist", true),
	tagMode: window.GetProperty("_PROPERTY: Tag Mode", 1),
	// 1 = album, 2 = artist, 3= dir, 4 = genre
	albumMode: window.GetProperty("_PROPERTY: Album Mode", 1), //0-with art, 1-without art
	artistMode: window.GetProperty("_PROPERTY: Artist Mode", 0), //0-albumartist, 1-artist
	dirMode: window.GetProperty("_PROPERTY: Folder or Library directory", 0), //0-Folder, 1-Library directory
	albumArtId: 0,
	// 0 = front
	panelMode: window.GetProperty("_PROPERTY: Display Mode", 0),
	// 0 = compact, 1 = stamps + text, 2 = lines + text, 3 = stamps no text
	showAllItem: window.GetProperty("_PROPERTY: Show ALL item", true),
	showloading: window.GetProperty("_PROPERTY: Show loading animation", false),
	default_thumbnailWidthMin: window.GetProperty("SYSTEM thumbnails Minimal Width", 130),
	thumbnailWidthMin: 0,
	default_lineHeightMin: window.GetProperty("SYSTEM Minimal Line Height", 90),
	lineHeightMin: 0,
	cache_size: window.GetProperty("Cover image cache dimension (100-1000)", 250),
	tf_groupkey: null,
	tf_autopl: null,
	tf_crc: null,
	cache_subdir: null,
	TFsorting: null,
	rowHeight: 22,
	rowScrollStep: 1,
	scrollSmoothness: 2.5,
	refreshRate: 25,
	headerBarHeight: 28,
	enableTouchControl: window.GetProperty("_PROPERTY: Enable Scroll Touch Control", true),
	botStampHeight: 48,
	default_botGridHeight: 26,
	botGridHeight: 0,
	botTextRowHeight: 17,
	textLineHeight: 10
};

cTouch = {
	down: false,
	y_start: 0,
	y_end: 0,
	y_current: 0,
	y_prev: 0,
	y_move: 0,
	scroll_delta: 0,
	t1: null,
	timer: false,
	multiplier: 0,
	delta: 0
};

cFilterBox = {
	x: 5,
	y: 2,
	w: 120,
	h: 20
};

cSwitchBtn = {
	x: 0,
	y: 0,
	w: 24,
	h: 24
}

cPlaylistManager = {
	width: 230,
	topbarHeight: 30,
	botbarHeight: 4,
	scrollbarWidth: 10,
	rowHeight: 30,
	blink_timer: false,
	blink_counter: -1,
	blink_id: null,
	blink_row: null,
	blink_totaltracks: 0,
	showTotalItems: window.GetProperty("_PROPERTY.PlaylistManager.ShowTotalItems", true)
};

cScrollBar = {
	width: 12,
	ButtonType: {
		cursor: 0,
		up: 1,
		down: 2
	},
	minCursorHeight: 25,
	maxCursorHeight: 110,
	timerID: false,
	timerCounter: -1
};

cover = {
	keepaspectratio:  window.GetProperty("Cover keep aspect ratio", true),
	max_w: 1
};

cList = {
	search_string: "",
	incsearch_font: null,
	inc_search_noresult: false,
	clear_incsearch_timer: false,
	incsearch_timer: false
};

timers = {
	coverLoad: false,
	preload: false,
	coverDone: false,
	mouseWheel: false,
	saveCover: false,
	mouseDown: false,
	addItems: false,
	showMenu: false,
	showPlaylistManager: false,
	hidePlaylistManager: false,
	avoidPlaylistSwitch: false
};

//=====Images cache=====
function reset_cover_timers() {
	if (timers.coverDone) {
		timers.coverDone && window.ClearTimeout(timers.coverDone);
		timers.coverDone = false;
	};
};

image_cache = function() {
	this._cachelist = {};
	
	this.hit = function(albumIndex) {
		var crc_exist = check_cache(albumIndex);//try cache
		if (crc_exist) {
			if (!timers.coverLoad) {
				timers.coverLoad = setInterval(() => {
					try {
						brw.groups[albumIndex].load_requested = 1;
						load_image_from_cache(albumIndex);
					}
					catch (e) {};
					clearInterval(timers.coverLoad);
					timers.coverLoad = null;
				}, (!isScrolling && !cScrollBar.timerID ? 2 : 6));
			}
		} else {//no cache
			var _delay = (ppt.albumArtId == 5 ? 4 : 8);
			if (!timers.coverLoad) {
				timers.coverLoad = setInterval(() => {
					if (ppt.albumArtId == 5) { // genre or dir
						try {
							var arr = brw.groups[albumIndex].groupkey.split(" ^^ ");
							if(ppt.tagMode == 3){
								var dc_arr = dir_cover_name.split(";");
								var folder_path = fb.TitleFormat("$directory_path(%path%)\\").EvalWithMetadb(brw.groups[albumIndex].metadb);
								var _path;
								for (var i = 0; i <= dc_arr.length; i++) {
									_path = folder_path + dc_arr[i];
									if(path_img(_path)) {
										var genre_img = gdi.Image(_path);
										if(genre_img != null) break;
									}
								}
							} else {
								var _path = fb.ProfilePath + "foobox\\genre\\" + GetGenre(arr[0]) + ".jpg";
								var genre_img = gdi.Image(_path);
							}
							if(genre_img){
								let s = Math.min(ppt.cache_size / genre_img.Width, ppt.cache_size / genre_img.Height);
								if(s < 1){
									let w = Math.floor(genre_img.Width * s);
									let h = Math.floor(genre_img.Height * s);
									genre_img = genre_img.Resize(w, h, 2);
								}
							}
							try {
								brw.groups[albumIndex].cover_img = g_image_cache.getit(albumIndex, genre_img, true);
								brw.groups[albumIndex].load_requested = 1;
								brw.repaint();
							}catch(e) {}
						} catch (e) {};
					} else {
						try {
							brw.groups[albumIndex].load_requested = 1;
							get_album_art_async(albumIndex);
						} catch(e) {}
					};
					clearInterval(timers.coverLoad);
					timers.coverLoad = null;
				}, (!isScrolling && !cScrollBar.timerID ? _delay : _delay * 3));
			};
		};
	};

	this.preload = function(albumIndex) {
		var img = this._cachelist[brw.groups[albumIndex].cachekey];
		if (typeof(img) == "undefined") {
			var crc_exist = check_cache(albumIndex);
			if (crc_exist) {
				brw.groups[albumIndex].load_requested = 1;
				load_image_from_cache(albumIndex, true);
			}
		} else {
			brw.groups[albumIndex].load_requested = 1;
			brw.groups[albumIndex].cover_img = img;
		}
	}

	this.reset = function(key) {
		this._cachelist[key] = null;
	};

	this.getit = function(albumId, image, savecache) {
		if (image) {
			let crc = brw.groups[albumId].cachekey;
			this._cachelist[crc] = image;
			if(crclist[crcidx].indexOf(crc) < 0){
				crclist[crcidx].push(crc);
				crcmod[crcidx] = true;
			}
			if (savecache) { // save cache
				if (!timers.saveCover) {
					timers.saveCover = window.SetInterval(function() {
						try{
							image.SaveAs(CACHE_FOLDER + ppt.cache_subdir + crc + ".jpg", "image/jpeg");
						}catch(e){}
						window.ClearInterval(timers.saveCover);
						timers.saveCover = false;
					}, ppt.cache_size/10);
				};
			}
			return image;
		} else return null;
	};
};
var g_image_cache = new image_cache;

//============Objects=================
oSwitchbar = function() {
	this.x = 5;
	this.y = 5;
	this.w = 200;
	this.h = 22;
	this.hover_tab = 0;
	this.setSize= function(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	this.on_mouse = function(event, x, y) {
		var tab_old = this.hover_tab;
		this.ishover = this._isHover(x, y);
		switch (event) {
		case "move":
			if(this.ishover){
				if(x < z(78)){
					if(x < z(39)) this.hover_tab = 1;
					else this.hover_tab = 2;
				} else {
					if (x > z(117)) this.hover_tab = 4;
					else this.hover_tab = 3;
				}
			}
			else this.hover_tab = 0;
			break;
		case "lbtn_up":
			if (this.hover_tab > 0 && this.hover_tab != ppt.tagMode){
				ppt.tagMode = this.hover_tab;
				window.SetProperty("_PROPERTY: Tag Mode", ppt.tagMode);
				get_tagprop();
				brw.reset_swbtn();
				brw.populate();
				brw.showItemPanelInit();
			}
			break;
		case "leave":
			this.hover_tab = 0;
			break;
		}
		if(this.hover_tab != tab_old) this.repaint_line();
	}
	this._isHover = function(x, y) {
		return (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h);
	};
	this.repaint_line = function () {
		window.RepaintRect(this.x, ppt.headerBarHeight - 4, this.w, 4);
	};
	
	this.draw = function(gr){
		var _linex = z(39);
		var bys = Math.round((ppt.headerBarHeight - 2) / 2);
		gr.FillGradRect(this.x + this.w -1, 0, 1, bys, 90, RGBA(0, 0, 0, 3), RGBA(0, 0, 0, 35));
		gr.FillGradRect(this.x + this.w -1, bys, 1, bys, 270, RGBA(0, 0, 0, 3), RGBA(0, 0, 0, 35));
		gr.FillSolidRect(this.x + this.w, 0, 1, ppt.headerBarHeight - 2, g_color_normal_bg);
		gr.FillSolidRect((ppt.tagMode - 1) * _linex, 0, _linex, ppt.headerBarHeight, g_color_normal_bg);
		gr.FillSolidRect((ppt.tagMode - 1) * _linex - 1, 0, _linex + 2, 2, g_color_highlight);
		gr.FillSolidRect((ppt.tagMode - 1) * _linex, ppt.headerBarHeight, _linex, 1, g_color_normal_bg);
		gr.FillSolidRect((ppt.tagMode - 1) * _linex - 1, 0, 1, ppt.headerBarHeight, g_color_line);
		gr.FillSolidRect(ppt.tagMode * _linex, 0, 1, ppt.headerBarHeight, g_color_line);
		var sw_img_y = Math.ceil((ppt.headerBarHeight - images.album.Height)/2);
		gr.DrawImage(images.album, z(11), sw_img_y, images.album.Width, images.album.Height, 0, 0, images.album.Width, images.album.Height,0,255);
		gr.DrawImage(images.artist, z(50), sw_img_y, images.artist.Width, images.artist.Height, 0, 0, images.artist.Width, images.artist.Height,0,255);
		gr.DrawImage(images.folder, z(90) - 1, sw_img_y, images.folder.Width, images.folder.Height, 0, 0, images.folder.Width, images.folder.Height,0,255);
		gr.DrawImage(images.genre, z(130) - 1, sw_img_y, images.genre.Width, images.genre.Height, 0, 0, images.genre.Width, images.genre.Height,0,255);
	}
}

oPlaylist = function(idx, rowId) {
	this.idx = idx;
	this.rowId = rowId;
	this.name = plman.GetPlaylistName(idx);
	this.y = -1;
};

oPlaylistManager = function() {
	this.playlists = [];
	this.state = 0; // 0 = hidden, 1 = visible
	this.scroll = 0;
	this.offset = 0;
	this.w = 250;
	this.h = brw.h - 100;
	this.x = ww;
	this.y = brw.y + 50;
	this.total_playlists = null;
	this.rowTotal = -1;
	this.drop_done = false;

	this.adjustPanelHeight = function() {
		// adjust panel height to avoid blank area under last visible item in the displayed list
		var target_total_rows = Math.floor((this.default_h - cPlaylistManager.topbarHeight) / cPlaylistManager.rowHeight);
		if (this.rowTotal != -1 && this.rowTotal < target_total_rows) target_total_rows = this.rowTotal;
		this.h = cPlaylistManager.topbarHeight + (target_total_rows * cPlaylistManager.rowHeight);
		this.y = this.default_y + Math.floor((this.default_h - this.h) / 2);

		this.totalRows = Math.floor((this.h - cPlaylistManager.topbarHeight) / cPlaylistManager.rowHeight);
		this.max = (this.rowTotal > this.totalRows ? this.totalRows : this.rowTotal);
	};

	this.setSize = function(x, y, w, h) {
		this.default_x = x;
		this.default_y = y;
		this.default_w = w;
		this.default_h = h;
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.totalRows = Math.floor((this.h - cPlaylistManager.topbarHeight) / cPlaylistManager.rowHeight);
		cSwitchBtn.x = ww - cSwitchBtn.w - 1;

		// adjust panel height / rowHeight + rowTotal (! refresh must have been executed once to have a valide rowTotal)
		this.adjustPanelHeight();
	};

	this.showPanel = function() {
		if (pman.offset < pman.w) {
			var delta = Math.ceil((pman.w - pman.offset) / 2);
			pman.offset += delta;
			brw.repaint();
		};
		if (pman.offset >= pman.w) {
			pman.offset = pman.w;
			window.ClearInterval(timers.showPlaylistManager);
			timers.showPlaylistManager = false;
			brw.repaint();
		};
	};

	this.hidePanel = function() {
		if (pman.offset > 0) {
			var delta = Math.ceil((pman.w - (pman.w - pman.offset)) / 2);
			pman.offset -= delta;
			brw.repaint();
		};
		if (pman.offset < 1) {
			pman.offset = 0;
			pman.state = 0;
			window.ClearInterval(timers.hidePlaylistManager);
			timers.hidePlaylistManager = false;
			brw.repaint();
		};
	};

	this.populate = function(exclude_active, reset_scroll) {
		this.playlists.splice(0, this.playlists.length);
		this.total_playlists = plman.PlaylistCount;
		var rowId = 0;
		var isAutoPl = false;
		var isReserved = false;
		var plname = null;
		for (var idx = 0; idx < this.total_playlists; idx++) {
			plname = plman.GetPlaylistName(idx);
			isAutoPl = plman.IsAutoPlaylist(idx);
			isReserved = (plname == "播放队列" || plname == "播放记录");

			if (!isAutoPl && !isReserved) {
				if (idx == plman.ActivePlaylist) {
					if (!exclude_active) {
						this.playlists.push(new oPlaylist(idx, rowId));
						rowId++;
					};
				} else {
					this.playlists.push(new oPlaylist(idx, rowId));
					rowId++;
				};
			};
		};
		this.rowTotal = rowId;

		// adjust panel height / rowHeight + rowTotal
		this.adjustPanelHeight();

		if (reset_scroll || this.rowTotal <= this.totalRows) {
			this.scroll = 0;
		} else {
			//check it total playlist is coherent with scroll value
			if (this.scroll > this.rowTotal - this.totalRows) {
				this.scroll = this.rowTotal - this.totalRows;
			};
		};
	};

	this.draw = function(gr) {
		if (this.offset > 0) {
			// metrics
			var cx = this.x - this.offset;
			var ch = cPlaylistManager.rowHeight;
			var cw = this.w;
			var bg_margin_top = 2;
			var bg_margin_left = 6;
			var txt_margin = 10;
			var bg_color = c_black;
			var txt_color = c_white;

			// scrollbar metrics
			if (this.rowTotal > this.totalRows) {
				this.scr_y = this.y + cPlaylistManager.topbarHeight;
				this.scr_w = cPlaylistManager.scrollbarWidth;
				this.scr_h = this.h - cPlaylistManager.topbarHeight;
			} else {
				this.scr_y = 0;
				this.scr_w = 0;
				this.scr_h = 0;
			};

			// ** panel bg **
			gr.SetSmoothingMode(2);
			gr.FillRoundRect(cx, this.y, this.w + 12, this.h + cPlaylistManager.botbarHeight + 1, 10, 10, RGBA(0, 0, 0, 120));
			gr.FillRoundRect(cx, this.y, this.w + 12, this.h + cPlaylistManager.botbarHeight, 10, 10, RGBA(0, 0, 0, 150));
			gr.DrawRoundRect(cx, this.y, this.w + 12, this.h + cPlaylistManager.botbarHeight - 1, 9, 9, 1.0, RGBA(255, 255, 255, 200));
			gr.SetSmoothingMode(0);

			gr.FillSolidRect(cx + bg_margin_left, this.y + cPlaylistManager.topbarHeight - 2, this.w - bg_margin_left * 2, 1, RGBA(255, 255, 255, 40));

			// ** items **
			var rowIdx = 0;
			var totalp = this.playlists.length;
			var start_ = this.scroll;
			var end_ = this.scroll + this.totalRows;
			if (end_ > totalp) end_ = totalp;
			for (var i = start_; i < end_; i++) {
				cy = this.y + cPlaylistManager.topbarHeight + rowIdx * ch;
				this.playlists[i].y = cy;

				// ** item bg **
				gr.FillSolidRect(cx + bg_margin_left, cy + bg_margin_top, cw - bg_margin_left * 2 - this.scr_w, ch - bg_margin_top * 2, RGBA(0, 0, 0, 130));
				gr.DrawRect(cx + bg_margin_left, cy + bg_margin_top, cw - bg_margin_left * 2 - this.scr_w - 1, ch - bg_margin_top * 2 - 1, 1.0, RGBA(255, 255, 255, 20));

				// ** item text **
				// playlist total items
				if (cPlaylistManager.showTotalItems) {
					t = plman.PlaylistItemCount(this.playlists[i].idx);
					tw = gr.CalcTextWidth(t + "  ", g_font_s);
					gr.GdiDrawText(t, g_font_s, txt_color, cx + bg_margin_left + txt_margin, cy, cw - bg_margin_left * 2 - txt_margin * 2 - this.scr_w, ch, rc_txt);
				} else {
					tw = 0;
				};
				// draw playlist name
				if ((this.activeIndex == i + 1 && cPlaylistManager.blink_counter < 0) || (cPlaylistManager.blink_id == i + 1 && cPlaylistManager.blink_row != 0)) {
					gr.GdiDrawText("+ " + this.playlists[i].name, g_font_bb, txt_color, cx + bg_margin_left + txt_margin, cy, cw - bg_margin_left * 2 - txt_margin * 2 - tw - this.scr_w, ch, lc_txt);
				} else {
					gr.GdiDrawText(this.playlists[i].name, g_font, txt_color, cx + bg_margin_left + txt_margin, cy, cw - bg_margin_left * 2 - txt_margin * 2 - tw - this.scr_w, ch, lc_txt);
				};

				// draw flashing item on lbtn_up after a drag'n drop
				if (cPlaylistManager.blink_counter > -1) {
					if (cPlaylistManager.blink_row != 0) {
						if (i == cPlaylistManager.blink_id - 1) {
							if (cPlaylistManager.blink_counter <= 6 && Math.floor(cPlaylistManager.blink_counter / 2) == Math.ceil(cPlaylistManager.blink_counter / 2)) {
								gr.FillSolidRect(cx + bg_margin_left, cy + bg_margin_top, cw - bg_margin_left * 2 - this.scr_w, ch - bg_margin_top * 2, RGBA(255, 255, 255, 75));
							};
						};
					};
				};

				rowIdx++;
			};

			// top bar
			// draw flashing top bar item on lbtn_up after a drag'n drop
			if (cPlaylistManager.blink_counter > -1) {
				if (cPlaylistManager.blink_row == 0) {
					if (cPlaylistManager.blink_counter <= 6 && Math.floor(cPlaylistManager.blink_counter / 2) == Math.ceil(cPlaylistManager.blink_counter / 2)) {
						gr.GdiDrawText("+ 发送到新播放列表", g_font_bb, txt_color, cx + bg_margin_left + txt_margin, this.y, cw - bg_margin_left * 2 - txt_margin * 2 - tw - this.scr_w, ch, lc_txt);
					};
				} else {
					gr.GdiDrawText("发送到 ...", g_font, txt_color, cx + bg_margin_left + txt_margin, this.y, cw - bg_margin_left * 2 - txt_margin * 2 - tw - this.scr_w, ch, lc_txt);
				};
			} else {
				if (this.activeRow == 0) {
					gr.GdiDrawText("+ 发送到新播放列表", g_font_bb, txt_color, cx + bg_margin_left + txt_margin, this.y, cw - bg_margin_left * 2 - txt_margin * 2 - tw - this.scr_w, ch, lc_txt);
				} else {
					gr.GdiDrawText("发送到 ...", g_font, txt_color, cx + bg_margin_left + txt_margin, this.y, cw - bg_margin_left * 2 - txt_margin * 2 - tw - this.scr_w, ch, lc_txt);
				};
			};

			// draw activeIndex hover frame
			if (cPlaylistManager.blink_counter > -1 && cPlaylistManager.blink_row > 0) {
				cy_ = this.y + cPlaylistManager.blink_row * ch;
				gr.DrawRect(cx + bg_margin_left + 1, cy_ + bg_margin_top + 1, cw - bg_margin_left * 2 - this.scr_w - 2, ch - bg_margin_top * 2 - 2, 2.0, RGBA(255, 255, 255, 240));
			} else {
				if (this.activeRow > 0 && this.activeIndex > 0) {
					if (cPlaylistManager.blink_counter < 0) {
						cy_ = this.y + this.activeRow * ch;
						gr.DrawRect(cx + bg_margin_left + 1, cy_ + bg_margin_top + 1, cw - bg_margin_left * 2 - this.scr_w - 2, ch - bg_margin_top * 2 - 2, 2.0, RGBA(255, 255, 255, 240));
					};
				};
			};

			// scrollbar
			if (this.scr_w > 0) {
				this.scr_cursor_h = (this.scr_h / (ch * this.rowTotal)) * this.scr_h;
				if (this.scr_cursor_h < 20) this.scr_cursor_h = 20;
				// set cursor y pos
				var ratio = (this.scroll * ch) / (this.rowTotal * ch - this.scr_h);
				this.scr_cursor_y = this.scr_y + Math.round((this.scr_h - this.scr_cursor_h) * ratio);
			};
		};
	};

	this._isHover = function(x, y) {
		return (x >= this.x - this.offset && x <= this.x - this.offset + this.w && y >= this.y && y <= this.y + this.h - 1);
	};


	this.on_mouse = function(event, x, y, delta) {
		this.ishover = this._isHover(x, y);

		switch (event) {
		case "move":
			// get active item index at x,y coords...
			this.activeIndex = -1;
			if (this.ishover) {
				this.activeRow = Math.ceil((y - this.y) / cPlaylistManager.rowHeight) - 1;
				this.activeIndex = Math.ceil((y - this.y) / cPlaylistManager.rowHeight) + this.scroll - 1;
			};
			if (this.activeIndex != this.activeIndexSaved) {
				this.activeIndexSaved = this.activeIndex;
				brw.repaint();
			};
			if (this.scr_w > 0 && x > this.x - this.offset && x <= this.x - this.offset + this.w) {
				if (y < this.y && pman.scroll > 0) {
					if (!timers.scrollPman && cPlaylistManager.blink_counter < 0) {
						timers.scrollPman = window.SetInterval(function() {
							pman.scroll--;
							if (pman.scroll < 0) {
								pman.scroll = 0;
								window.ClearInterval(timers.scrollPman);
								timers.scrollPman = false;
							} else {
								brw.repaint();
							};
						}, 100);
					};
				} else if (y > this.scr_y + this.scr_h && pman.scroll < this.rowTotal - this.totalRows) {
					if (!timers.scrollPman && cPlaylistManager.blink_counter < 0) {
						timers.scrollPman = window.SetInterval(function() {
							pman.scroll++;
							if (pman.scroll > pman.rowTotal - pman.totalRows) {
								pman.scroll = pman.rowTotal - pman.totalRows;
								window.ClearInterval(timers.scrollPman);
								timers.scrollPman = false;
							} else {
								brw.repaint();
							};
						}, 100);
					};
				} else {
					if (timers.scrollPman) {
						window.ClearInterval(timers.scrollPman);
						timers.scrollPman = false;
					};
				};
			};
			break;
		case "up":
			brw.drag_clicked = false;
			if (brw.drag_moving) {
				window.SetCursor(IDC_ARROW);
				this.drop_done = false;
				if (this.activeIndex > -1) {
					try {
						brw.metadblist_selection = brw.groups[brw.activeIndex].pl.Clone();
					} catch (e) {};
					if (this.activeRow == 0) {
						// send to a new playlist
						this.drop_done = true;
						fb.RunMainMenuCommand("文件/新建播放列表");
						plman.InsertPlaylistItems(plman.PlaylistCount - 1, 0, brw.metadblist_selection, false);
					} else {
						// send to selected (hover) playlist
						this.drop_done = true;
						var row_idx = this.activeIndex - 1;
						var playlist_idx = this.playlists[row_idx].idx;
						var insert_index = plman.PlaylistItemCount(playlist_idx);
						plman.InsertPlaylistItems(playlist_idx, insert_index, brw.metadblist_selection, false);
					};
					// timer to blink the playlist item where tracks have been droped!
					if (this.drop_done) {
						if (!cPlaylistManager.blink_timer) {
							cPlaylistManager.blink_x = x;
							cPlaylistManager.blink_y = y;
							cPlaylistManager.blink_totaltracks = brw.metadblist_selection.Count;
							cPlaylistManager.blink_id = this.activeIndex;
							cPlaylistManager.blink_row = this.activeRow;
							cPlaylistManager.blink_counter = 0;
							cPlaylistManager.blink_timer = window.SetInterval(function() {
								cPlaylistManager.blink_counter++;
								if (cPlaylistManager.blink_counter > 6) {
									window.ClearInterval(cPlaylistManager.blink_timer);
									cPlaylistManager.blink_timer = false;
									cPlaylistManager.blink_counter = -1;
									cPlaylistManager.blink_id = null;
									this.drop_done = false;
									// close pman
									if (!timers.hidePlaylistManager) {
										timers.hidePlaylistManager = window.SetInterval(pman.hidePanel, 30);
									};
									brw.drag_moving = false;
								};
								brw.repaint();
							}, 150);
						};
					};
				} else {
					if (timers.showPlaylistManager) {
						window.ClearInterval(timers.showPlaylistManager);
						timers.showPlaylistManager = false;
					};
					if (!timers.hidePlaylistManager) {
						timers.hidePlaylistManager = window.SetInterval(this.hidePanel, 30);
					};
					brw.drag_moving = false;
				};
				brw.drag_moving = false;
			};
			break;
		case "right":
			brw.drag_clicked = false;
			if (brw.drag_moving) {
				if (timers.showPlaylistManager) {
					window.ClearInterval(timers.showPlaylistManager);
					timers.showPlaylistManager = false;
				};
				if (!timers.hidePlaylistManager) {
					timers.hidePlaylistManager = window.SetInterval(this.hidePanel, 30);
				};
				brw.drag_moving = false;
			};
			break;
		case "wheel":
			var scroll_prev = this.scroll;
			this.scroll -= delta;
			if (this.scroll < 0) this.scroll = 0;
			if (this.scroll > (this.rowTotal - this.totalRows)) this.scroll = (this.rowTotal - this.totalRows);
			if (this.scroll != scroll_prev) {
				this.on_mouse("move", m_x, m_y);
			};
			break;
		case "leave":
			brw.drag_clicked = false;
			if (brw.drag_moving) {
				if (timers.showPlaylistManager) {
					window.ClearInterval(timers.showPlaylistManager);
					timers.showPlaylistManager = false;
				};
				if (!timers.hidePlaylistManager) {
					timers.hidePlaylistManager = window.SetInterval(this.hidePanel, 30);
				};
				brw.drag_moving = false;
			};
			break;
		};
	};
};

oGroup = function(index, handle, groupkey) {
	this.index = index;
	this.count = 1;
	this.metadb = handle;
	this.groupkey = groupkey;
	if (handle) {
		this.cachekey = process_cachekey(ppt.tf_crc.EvalWithMetadb(handle));
		if (ppt.tagMode == 3 && ppt.dirMode == 0) {
			var pathdir = groupkey.split("\\");
			this.groupkey = pathdir[pathdir.length - 1];
			var _gkey = this.groupkey.toUpperCase();
			if(this.groupkey.length < 6 && _gkey.indexOf("CD") == 0 && pathdir.length > 2){
				this.groupkey = pathdir[pathdir.length - 2] + " | " + this.groupkey;
			}
		}
		this.tracktype = TrackType(handle.RawPath.substring(0, 4));
	} else {
		this.cachekey = null;
		this.tracktype = 0;
	};
	this.cover_img = null;
	this.load_requested = 0;

	this.finalize = function(count, tracks, handles) {
		this.tra = tracks.slice(0);
		this.pl = handles.Clone();
		this.count = count;
	};
};

oBrowser = function() {
	this.groups = [];
	this.scrollbar = new oScrollbar();
	this.selectedIndex = -1;
	this.playingIndex = -1;
	this.metadblist_selection = plman.GetPlaylistSelectedItems(g_active_playlist);

	this.launch_populate = function() {
		var launch_timer = window.SetTimeout(function() {
			// populate browser with items
			brw.populate();
			// populate playlist popup panel list
			pman.populate(exclude_active = false, reset_scroll = true);
			// kill Timeout
			launch_timer && window.ClearTimeout(launch_timer);
			launch_timer = false;
		}, 5);
	};

	this.repaint = function() {
		repaint_main1 = repaint_main2;
	};

	this.update = function() {
		this.stampDrawMode = (ppt.panelMode <= 1 ? true : false);
		this.marginLR = 0;
		// set margins betweens album stamps
		if (ppt.panelMode == 0) {
			this.marginTop = 1;
			this.marginBot = 5;
			this.marginSide = 1;
			this.marginCover = 1;
		}
		else if (ppt.panelMode == 1) {
			this.marginTop = 2;
			this.marginBot = 2;
			this.marginSide = 2;
			this.marginCover = 16;
		} else {
			this.marginTop = 0;
			this.marginBot = 0;
			this.marginSide = 0;
			this.marginCover = 1;
		};
		// Adjust Column 
		this.totalColumns = Math.floor((this.w - this.marginLR * 2) / ppt.thumbnailWidthMin);
		if (this.totalColumns < 1) this.totalColumns = 1;
		// count total of rows for the whole library
		this.rowsCount = Math.ceil(this.groups.length / this.totalColumns);
		var gapeWidth = (this.w - this.marginLR * 2) - (this.totalColumns * ppt.thumbnailWidthMin);
		var deltaToAdd = Math.floor(gapeWidth / this.totalColumns);
		this.thumbnailWidth = ppt.thumbnailWidthMin + deltaToAdd;
		// calc size of the cover art
		cover.max_w = (this.thumbnailWidth - (this.marginSide * 2) - (this.marginCover * 2));
		// Adjust Row & showList bloc Height
		if (ppt.panelMode <= 1) {
			this.rowHeight = 10 + cover.max_w + ppt.botStampHeight;
		} else {
			this.rowHeight = cover.max_w + 1;
		};
		this.totalRowsVis = Math.floor(this.h / this.rowHeight);
		this.h_half = Math.floor(this.totalRowsVis / 3) * this.rowHeight;
		ppt.rowHeight = this.rowHeight;
		//scaled loading img
		var iw = ppt.rowHeight / 2;
		images.loading_draw = images.img_loading.Resize(iw, iw, 2);

		scroll = Math.round(scroll / this.rowHeight) * this.rowHeight;
		scroll = check_scroll(scroll);
		scroll_ = scroll;

		// scrollbar update       
		this.scrollbar.updateScrollbar();
		this.repaint();
	};

	this.setSize = function(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;

		this.scrollbar.setSize();

		scroll = Math.round(scroll / ppt.rowHeight) * ppt.rowHeight;
		scroll = check_scroll(scroll);
		scroll_ = scroll;
		// scrollbar update       
		//this.scrollbar.updateScrollbar();
		this.update();

		pman.setSize(ww, y + 50, (cPlaylistManager.width < ww ? cPlaylistManager.width : ww), h - 100);
	};

	this.setList = function() {
		let end = this.groups.length;
		let i=0;
		if (!timers.preload) {
			timers.preload = setInterval(() => {
				if(i < end){
					try{
						if (this.groups[i].cover_img == null && i > ppt.showAllItem - 1) {
							if (this.groups[i].load_requested == 0) {
								g_image_cache.preload(i);
							};
						}
					}catch(e){
						clearInterval(timers.preload);
						timers.preload = null;
					}
					i++;
				} else {
					clearInterval(timers.preload);
					timers.preload = null;				
				}
			}, 2);
		}
	};
	
	this.showItemPanelInit = function(){
		plman.ActivePlaylist = g_active_playlist;
		if(!this.list) return;
		if (ppt.sourceMode == 1) {
				var handle = fb.GetFocusItem();
				this.showItemFromItemHandle(handle);
		} else {
			try{
				var handle = fb.GetFocusItem();
				if (fb.IsMetadbInMediaLibrary(handle)) {
					this.showItemFromItemHandle(handle);
					avoid_checkscroll = false;
				}
			} catch(e) {}
		}
		if(brw.selectedIndex > -1)
			brw.sendItemToPlaylist(brw.selectedIndex);
	}

	this.showItemFromItemHandle = function(metadb, isplaying) {
		var total = this.groups.length;
		if(total == 0 || metadb == null) return;
		var total_tracks = 0;
		var found = false;
		for (var a = (ppt.showAllItem ? 1 : 0); a < total; a++) {
			total_tracks = this.groups[a].pl.Count;
			for (var t = 0; t < total_tracks; t++) {
				found = this.groups[a].pl[t].Compare(metadb);
				if (found) {
					break;
				};
			};
			if (found) break;
		};
		if (found) { // scroll to album and open showlist
			if (ppt.showAllItem && a == 0) a += 1;
			if(ppt.sourceMode == 1) avoid_checkscroll =false;
			if(!avoid_checkscroll){
			var row = Math.floor(a / this.totalColumns);
			if (this.h_half > this.rowHeight) {
				var delta = this.h_half;
			} else {
				var delta = 0
			};
			scroll = row * this.rowHeight - delta;
			scroll = check_scroll(scroll);
			}
			this.activateItem(a, isplaying);
		} else {
			if(isplaying) this.playingIndex = -1;
			else this.selectedIndex = -1;
		}
	};

	this.showNowPlaying = function(initial) {
		if (this.groups.length == 0) return;
		if (ppt.sourceMode == 1 && fb.IsPlaying) {
			try {
				if (!ppt.locklibpl) {//pure playlist mode
					if (plman.PlayingPlaylist != plman.ActivePlaylist) {
						if (initial) return;
						g_active_playlist = plman.ActivePlaylist = plman.PlayingPlaylist;
					};
					var handle = fb.GetNowPlaying();
					this.showItemFromItemHandle(handle, true);
				} else {
					var handle = fb.GetNowPlaying();
					if (fb.IsMetadbInMediaLibrary(handle)) {
						this.showItemFromItemHandle(handle, true);
					};
				};
			}
			catch (e) {};
		} else try {
			if (initial) {
				var handle = fb.GetFocusItem();
				this.showItemFromItemHandle(handle);
				return;
			}
			var index = this.selectedIndex;
			if (ppt.showAllItem && index == 0) index += 1;
			var row = Math.floor(index / this.totalColumns);
			if (this.h_half > this.rowHeight) {
				var delta = this.h_half;
			} else {
				var delta = 0
			};
			scroll = row * this.rowHeight - delta;
			scroll = check_scroll(scroll);
		}catch (e) {};
	};

	this.showItemFromItemIndex = function(index, isplaying) {
		if (ppt.showAllItem && index == 0) index += 1;
		var row = Math.floor(index / this.totalColumns);
		if (this.h_half > this.rowHeight) {
			var delta = this.h_half;
		} else {
			var delta = 0
		};
		scroll = row * this.rowHeight - delta;
		scroll = check_scroll(scroll);
		this.activateItem(index, isplaying);
	};
	
	this.FindItemFromItemHandle = function(metadb, isplaying) {
		var total = this.groups.length;
		var total_tracks = 0;
		var found = false;
		for (var a = (ppt.showAllItem ? 1 : 0); a < total; a++) {
			total_tracks = this.groups[a].pl.Count;
			for (var t = 0; t < total_tracks; t++) {
				found = this.groups[a].pl[t].Compare(metadb);
				if (found) {
					break;
				};
			};
			if (found) break;
		};
		if (found) { // scroll to album and open showlist
			if (ppt.showAllItem && a == 0) a += 1;
			this.playingIndex = a;
		} else {
			if(isplaying) this.playingIndex = -1;
		}
	};

	this.init_groups = function() {
		var handle = null;
		var current = "";
		var previous = "";
		var g = 0,
			t = 0;
		var arr = ["?", "?"];
		var tr = [];
		var pl = plman.GetPlaylistItems(-1);
		var total = this.list.Count;
		var t_all = 0;
		var tr_all = [];
		var pl_all = plman.GetPlaylistItems(-1);
		var e = [];
		var libpaths = null;

		this.groups.splice(0, this.groups.length);

		var str_filter = process_string(filter_text);
		
		if(ppt.tagMode == 3 && ppt.dirMode == 1)
			libpaths = this.list.GetLibraryRelativePaths();

		for (var i = 0; i < total; i++) {
			handle = this.list[i];
			if(ppt.tagMode == 3 && ppt.dirMode == 1){
				var libpath = libpaths[i].split("\\");
				if(libpath.length == 1) {
					if(libpath[0] != "") arr[0] = "根目录";
					else arr[0] = "非媒体库目录";
				}
				else arr[0] = libpath[0];
				arr[1] = fb.TitleFormat("%title%").EvalWithMetadb(handle);
			} else {
				arr = ppt.tf_groupkey.EvalWithMetadb(handle).split(" ## ");
			}
			current = arr[0].toUpperCase();
			if (str_filter.length > 0) {
				var comp_str = (arr.length > 1 ? arr[0] + " " + arr[1] : arr[0]);
				var toAdd = match(comp_str, str_filter);
			} else {
				var toAdd = true;
			};
			if (toAdd) {
				if (current != previous && !e[current]) {
					//if (ppt.sourceMode == 1) e[current] = true;
					e[current] = true;
					if (g > 0) {
						// update current group
						this.groups[g - 1].finalize(t, tr, pl);
						tr.splice(0, t);
						pl.RemoveAll();
						t = 0;
					};
					if (i < total) {
						// add new group
						tr.push(arr[1]);
						pl.Add(handle);
						if (ppt.showAllItem) {
							tr_all.push(arr[1]);
							pl_all.Add(handle);
						};
						t_all++;
						t++;
						this.groups.push(new oGroup(g + 1, handle, arr[0]));
						g++;
						previous = current;
					};
				} else {
					// add track to current group
					tr.push(arr[1]);
					pl.Add(handle);
					if (ppt.showAllItem) {
						tr_all.push(arr[1]);
						pl_all.Add(handle);
					};
					t_all++;
					t++;
				};
			};
		};
		if (g > 0) {
			// update last group properties
			this.groups[g - 1].finalize(t, tr, pl);
			// add 1st group ("ALL" item)
			if (ppt.showAllItem) {
				this.groups.unshift(new oGroup(0, null, null));
				this.groups[0].finalize(t_all, tr_all, pl_all);
			};
		};
		// free memory
		tr.splice(0, tr.length);
		tr_all.splice(0, tr_all.length);
		e.splice(0, e.length);
		pl.RemoveAll();
		pl_all.RemoveAll();
	};

	this.populate = function() {
		if (ppt.sourceMode == 0) this.list = fb.GetLibraryItems();
		else this.list_unsorted = this.list = plman.GetPlaylistItems(g_active_playlist);
		this.list.OrderByFormat(fb.TitleFormat(ppt.TFsorting), 1);
		this.init_groups();
		this.setList();
		this.update();
		this.showNowPlaying(true);
	};

	this.activateItem = function(index, isplaying) {
		if (this.groups.length == 0) return;
		if(isplaying) this.playingIndex = index;
		else this.selectedIndex = index;
	};

	this.focusItemToPlaylist = function(metadb) {
		if (this.groups.length == 0) return;
			g_avoid_on_item_focus_change = true;
			plman.SetPlaylistFocusItemByHandle(g_active_playlist, metadb);
			plman.ClearPlaylistSelection(g_active_playlist);
			plman.SetPlaylistSelectionSingle(g_active_playlist, plman.GetPlaylistFocusItemIndex(g_active_playlist), true);
		//};
	};

	this.sendItemToPlaylist = function(index) {
		if (this.groups.length == 0) return;
		// notify JSSmoothPlaylist panel to avoid "on_playlist_items_removed" until "on_playlist_items_added" was called (to avoid x2 call of populate function!)
		//window.NotifyOthers("JSSmoothBrowser->JSSmoothPlaylist:avoid_on_playlist_items_removed_callbacks_on_sendItemToPlaylist", true);
		// ======================================
		// Send item tracks to JSBrowser playlist
		// ======================================
		var affectedItems = [];
		var pfound = false;
		var pfound_playing = false;
			
		pidx = (plman.GetPlaylistName(0) == "媒体库") ? 1 : 0;
		var pidx_playing = -1;
		for (var i = 0; i < plman.PlaylistCount; i++) {
			if (!pfound && plman.GetPlaylistName(i) == "媒体库视图") {
				pidx = i;
				pfound = true;
			};
			if (!pfound_playing && plman.GetPlaylistName(i) == "媒体库视图(正在播放)") {
				pidx_playing = i;
				pfound_playing = true;
			};
			if (pfound && pfound_playing) break;
		};

		if (utils.IsKeyPressed(VK_CONTROL)) {
			// initialize "Library selection" playlist
			if (pfound) {
				var from = plman.PlaylistItemCount(pidx);
			} else {
				plman.CreatePlaylist(pidx, "媒体库视图");
				var from = 0;
			};
			// *** insert tracks into pidx playlist
			plman.InsertPlaylistItems(pidx, from, brw.groups[index].pl, false);
		} else {
			if (fb.IsPlaying && plman.PlayingPlaylist == pidx) {
				if (plman.PlayingPlaylist == pidx) { // playing playlist is "Library selection"
					plman.RenamePlaylist(pidx, "媒体库视图(正在播放)");
					if (pfound_playing) {
						plman.RenamePlaylist(pidx_playing, "媒体库视图");
						var tot = plman.PlaylistItemCount(pidx_playing);
						affectedItems.splice(0, affectedItems.length);
						for (var i = 0; i < tot; i++) {
							affectedItems.push(i);
						};
						plman.SetPlaylistSelection(pidx_playing, affectedItems, true);
						plman.RemovePlaylistSelection(pidx_playing, false);
					} else {
						pidx_playing = pidx + 1;
						plman.CreatePlaylist(pidx_playing, "媒体库视图");
					};
					plman.InsertPlaylistItems(pidx_playing, 0, brw.groups[index].pl, false);
					plman.MovePlaylist(pidx_playing, pidx);
					if (pidx_playing < pidx)
						plman.MovePlaylist(pidx - 1, pidx_playing);
					else plman.MovePlaylist(pidx + 1, pidx_playing);
				} else {
					if (pfound) {
						var tot = plman.PlaylistItemCount(pidx);
						for (var i = 0; i < tot; i++) {
							affectedItems.push(i);
						};
						plman.SetPlaylistSelection(pidx, affectedItems, true);
						plman.RemovePlaylistSelection(pidx, false);
					} else {
						plman.CreatePlaylist(pidx, "媒体库视图");
					};
					plman.InsertPlaylistItems(pidx, 0, brw.groups[index].pl, false);
				};
			} else {
				if (pfound) {
					var tot = plman.PlaylistItemCount(pidx);
					for (var i = 0; i < tot; i++) {
						affectedItems.push(i);
					};
					plman.SetPlaylistSelection(pidx, affectedItems, true);
					plman.RemovePlaylistSelection(pidx, false);
				} else {
					plman.CreatePlaylist(pidx, "媒体库视图");
				};
				plman.InsertPlaylistItems(pidx, 0, brw.groups[index].pl, false);
			};
		};
	};
	
	this.change_active_item = function(){
		g_avoid_on_playlist_items_removed = true;
		g_avoid_on_item_focus_change = true;
		this.sendItemToPlaylist(this.activeIndex);
		if (ppt.sourceMode == 0) {
			plman.ActivePlaylist = pidx;
			g_active_playlist = pidx;
			avoid_checkscroll = true;
		} else {
			if (ppt.locklibpl) plman.ActivePlaylist = 0;
			if (this.activeIndex > (ppt.showAllItem - 1)) this.focusItemToPlaylist(this.groups[this.activeIndex].metadb);
		};
	}

	this.getlimits = function() {

		// get visible stamps limits (start & end indexes)
		if (this.groups.length <= this.totalRowsVis * this.totalColumns) {
			var start_ = 0;
			var end_ = this.groups.length;
		} else {
			var start_ = Math.round(scroll_ / this.rowHeight) * this.totalColumns;
			var end_ = Math.round((scroll_ + wh + this.rowHeight) / this.rowHeight) * this.totalColumns;
			// check values / limits
			end_ = (this.groups.length < end_) ? this.groups.length : end_;
			start_ = start_ > 0 ? start_ - this.totalColumns : (start_ < 0 ? 0 : start_);
		};

		// save limits calculated into globals var
		g_start_ = start_;
		g_end_ = end_;
	};
	
	this.init_swbtn = function(){
		switch(ppt.tagMode){
			case 1:
			if (ppt.albumMode ==0) this.switch_btn = new button(images.sw_btn_n1, images.sw_btn_n1, images.sw_btn_n1, "切换至简单专辑模式");
			else this.switch_btn = new button(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0, "切换至高级专辑模式");
			break;
			case 2:
			if (ppt.artistMode ==0) this.switch_btn = new button(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0, "切换至艺术家");
			else this.switch_btn = new button(images.sw_btn_n1, images.sw_btn_n1, images.sw_btn_n1, "切换至专辑艺术家");
			break;
			case 3:
			if (ppt.dirMode ==0) this.switch_btn = new button(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0, "切换至媒体库一级目录");
			else this.switch_btn = new button(images.sw_btn_n1, images.sw_btn_n1, images.sw_btn_n1, "切换至文件夹");
			break;
			default:
			this.switch_btn = new button(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0, "流派");
			break;
		}
	}
	this.init_swbtn();
	
	this.reset_swbtn = function(){
		if(ppt.tagMode == 4) return;
		this.switch_btn.Tooltip.Deactivate();
		switch(ppt.tagMode){
			case 1:
			if (ppt.albumMode ==0) {
				this.switch_btn.img = Array(images.sw_btn_n1, images.sw_btn_n1, images.sw_btn_n1);
				this.switch_btn.Tooltip.Text = "切换至简单专辑模式";
			}else{
				this.switch_btn.img = Array(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0);
				this.switch_btn.Tooltip.Text = "切换至高级专辑模式";
			}
			break;
			default:
			case 2:
			if (ppt.artistMode ==0) {
				this.switch_btn.img = Array(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0);
				this.switch_btn.Tooltip.Text = "切换至艺术家";
			}else{
				this.switch_btn.img = Array(images.sw_btn_n1, images.sw_btn_n1, images.sw_btn_n1);
				this.switch_btn.Tooltip.Text = "切换至专辑艺术家";
			}
			break;
			case 3:
			if (ppt.dirMode ==0) {
				this.switch_btn.img = Array(images.sw_btn_n0, images.sw_btn_n0, images.sw_btn_n0);
				this.switch_btn.Tooltip.Text = "切换至媒体库一级目录";
			}else{
				this.switch_btn.img = Array(images.sw_btn_n1, images.sw_btn_n1, images.sw_btn_n1);
				this.switch_btn.Tooltip.Text = "切换至文件夹";
			}
			break;
		}
	}

	this.draw = function(gr) {
		var tmp, offset;
		var cx = 0;
		var ax, ay, by, rowStart, row, coverTop;
		var aw = this.thumbnailWidth - (this.marginSide * 2);
		var ah = this.rowHeight - this.marginTop - this.marginBot;
		var coverWidth = cover.max_w;
		var txt_color = g_color_normal_txt;
		var total = this.groups.length;
		var all_x = -1,
			all_y = -1,
			all_w = 0,
			all_h = 0;
		var coverImg = null;
		var arr = ["?", "?"];

		this.getlimits();

		// draw visible stamps (loop)
		for (var i = g_start_; i < g_end_; i++) {
			row = Math.floor(i / this.totalColumns);
			ax = this.x + (cx * this.thumbnailWidth) + this.marginSide + this.marginLR;
			ay = Math.floor(this.y + (row * this.rowHeight) + this.marginTop - scroll_);
			this.groups[i].x = ax;
			this.groups[i].y = ay;

			if (ay >= (0 - this.rowHeight) && ay < this.y + this.h) { // if stamp visible, we have to draw it
				// parse stored tags
				if (!(ppt.showAllItem && i == 0)) {// && total > 1)) {
					if (this.groups[i].groupkey.length > 0) arr = this.groups[i].groupkey.split(" ^^ ");
				};
				// get cover
				if (ppt.showAllItem && i == 0) {
					this.groups[i].cover_img = images.all;
				} else {
					if (this.groups[i].cover_img == null) {
						if (this.groups[i].load_requested == 0) {
							this.groups[i].cover_img = g_image_cache._cachelist[brw.groups[i].cachekey];
							if(typeof(this.groups[i].cover_img) == "undefined" || this.groups[i].cover_img == null) g_image_cache.hit(i);
							else brw.groups[i].load_requested = 1;
						};
					}
					if (typeof(this.groups[i].cover_img) != "undefined") {
						if (this.groups[i].cover_img == null) this.groups[i].cover_img = images.noart;
					};
				};
					
				if (i == this.playingIndex) {
					txt_color = ppt.panelMode <= 1 ? RGBA(255, 255, 255) : g_color_highlight;
					if (this.stampDrawMode) gr.FillSolidRect(ax, ay, aw, ah, g_color_highlight);
				} else if (this.stampDrawMode) {
					if (i == this.selectedIndex) gr.FillSolidRect(ax, ay, aw, ah, g_color_selected_bg);
					txt_color = g_color_normal_txt;
				} else txt_color = g_color_normal_txt; // panelMode = 3 (Grid)
				coverTop = ppt.panelMode == 1 ? ay + 10 : ay;
					
				if (this.groups[i].cover_img) {
					// draw cover
					if (cover.keepaspectratio) {
						var max = Math.max(this.groups[i].cover_img.Width, this.groups[i].cover_img.Height);
						var rw = this.groups[i].cover_img.Width / max;
						var rh = this.groups[i].cover_img.Height / max;
						var im_w = rw * coverWidth;
						var im_h = rh * coverWidth;
					}
					else {
						var im_w = coverWidth;
						var im_h = coverWidth;
					};
					// save coords ALL cover image:
					if (ppt.showAllItem && i == 0) {
						all_x = ax + Math.round((aw - im_w) / 2);
						all_y = coverTop + coverWidth - im_h;
						all_w = im_w;
						all_h = im_h;
					}
					let this_x = ax + Math.round((aw - im_w) / 2);
					let this_y = coverTop + coverWidth - im_h;
					gr.DrawImage(this.groups[i].cover_img, this_x, this_y, im_w, im_h, 1, 1, this.groups[i].cover_img.Width - 2, this.groups[i].cover_img.Height - 2);
				} else if(ppt.showloading) {
					gr.DrawImage(images.loading_draw, ax + Math.round((aw - images.loading_draw.Width) / 2), ay + Math.round((aw - images.loading_draw.Height) / 2), images.loading_draw.Width, images.loading_draw.Height, 0, 0, images.loading_draw.Width, images.loading_draw.Height, images.loading_angle, 255);
				} else gr.DrawImage(images.noart, ax + Math.round((aw - coverWidth) / 2), ay + Math.round((aw - coverWidth) / 2), coverWidth, coverWidth, 1, 1, images.noart.Width - 2, images.noart.Height - 2);

				// grid text background rect
				if (ppt.panelMode == 3) {
					if (i == this.playingIndex) {
						gr.FillSolidRect(ax + 2, coverTop + coverWidth - ppt.botGridHeight, aw - 4, ppt.botGridHeight, g_color_normal_bg & 0xddffffff);
					} else if (i == this.selectedIndex) {
						gr.FillSolidRect(ax + 2, coverTop + coverWidth - ppt.botGridHeight, aw - 4, ppt.botGridHeight, g_color_selected_bg);
					} else gr.FillSolidRect(ax + 2, coverTop + coverWidth - ppt.botGridHeight, aw - 4, ppt.botGridHeight, g_color_grid_bg);
				} else if (ppt.panelMode == 2 && i == this.playingIndex){
					gr.FillSolidRect(ax + 2, coverTop + coverWidth - ppt.botGridHeight, aw - 4, ppt.botGridHeight, g_color_normal_bg & 0xddffffff);
				};

				// in Grid mode (panelMode = 3), if cover is in portrait mode, adjust width to the stamp width
				if (ppt.panelMode == 3 && im_h > im_w) {
					var frame_w = coverWidth;
					var frame_h = im_h;
				} else {
					var frame_w = im_w;
					var frame_h = im_h;
				};
				var _cx = ax + Math.round((aw - frame_w) / 2);
				if (g_rightClickedIndex > -1) {
					if (g_rightClickedIndex == i) {
						if (this.stampDrawMode) {
							gr.DrawRect(ax + 1, ay + 1, aw - 2, ah - 2, 2.0, g_color_selected_bg);
						} else {
							gr.DrawRect(_cx + 1, coverTop + coverWidth - frame_h + 1, frame_w - 3, frame_h - 3, 3.0, g_color_selected_bg);
						};
					};
				} else {
					if (i == this.activeIndex) {
						if (this.stampDrawMode) {
							gr.DrawRect(ax + 1, ay + 1, aw - 2, ah - 2, 2.0, g_color_selected_bg);
						} else {
							gr.DrawRect(_cx + 1, coverTop + coverWidth - frame_h + 1, frame_w - 3, frame_h - 3, 3.0, g_color_selected_bg);
						};
					};
				};
				if(i == this.playingIndex && ppt.panelMode > 1){
					gr.DrawRect(_cx + 1, coverTop + coverWidth - frame_h + 1, frame_w - 3, frame_h - 3, 3.0, g_color_highlight);
				}

				if (ppt.panelMode <= 1) { //(Art + bottom labels)
					// draw text
					if (ppt.showAllItem && i == 0) {// && total > 1) { // aggregate item ( [ALL] )
						try {
							if (ppt.tagMode == 1) {
								gr.GdiDrawText("所有项目", g_font_b, txt_color, ax + Math.round((aw - coverWidth) / 2), (coverTop + 5 + coverWidth), coverWidth, ppt.botTextRowHeight, lt_txt);
							} else {
								gr.GdiDrawText("所有项目", (i == this.selectedIndex ? g_font_b : g_font), txt_color, ax + Math.round((aw - coverWidth) / 2), (coverTop + 5 + coverWidth), coverWidth, ppt.botTextRowHeight, lt_txt);
							};
						} catch (e) {}
					} else {
						if (arr[1] == "?") {
							if (this.groups[i].count > 1) {
								var album_name = (this.groups[i].tracktype != 3 ? "(单曲)" : "(网络电台)");
							} else {
								var arr_t = this.groups[i].tra[0].split(" ^^ ");
								var album_name = (this.groups[i].tracktype != 3 ? "(单曲) " : "") + arr_t[0];
							};
						} else {
							var album_name = arr[1];
						};
						try {
							if (ppt.tagMode == 1 && ppt.albumMode == 0) {
								gr.GdiDrawText(album_name, g_font_b, txt_color, ax + Math.round((aw - coverWidth) / 2), (coverTop + 5 + coverWidth), coverWidth, ppt.botTextRowHeight, lt_txt);
								gr.GdiDrawText(arr[0], g_font_s, txt_color, ax + Math.round((aw - coverWidth) / 2), (coverTop + 5 + coverWidth + ppt.botTextRowHeight), coverWidth, ppt.botTextRowHeight, lt_txt);
							} else gr.GdiDrawText(arr[0], (i == this.selectedIndex ? g_font_b : g_font), txt_color, ax + Math.round((aw - coverWidth) / 2), (coverTop + 5 + coverWidth), coverWidth, ppt.botTextRowHeight, lt_txt);
						} catch (e) {}
					};
				} else { // panelMode = 3 (Grid)
					// draw text
					if (ppt.showAllItem && i == 0) {// && total > 1) { // aggregate item ( [ALL] )
						// nothing
					} else if(ppt.panelMode == 3 || (ppt.panelMode == 2 && i ==this.playingIndex)) {
						if (arr[1] == "?") {
							if (this.groups[i].count > 1) {
								var album_name = (this.groups[i].tracktype != 3 ? "(单曲)" : "(网络电台)");
							} else {
								var arr_t = this.groups[i].tra[0].split(" ^^ ");
								var album_name = (this.groups[i].tracktype != 3 ? "(单曲) " : "") + arr_t[0];
							};
						} else {
							var album_name = arr[1];
						};
						try {
							if (ppt.tagMode == 1 && ppt.albumMode == 0) {
								gr.GdiDrawText(album_name, g_font_b, txt_color, ax + 10, (coverTop + 5 + coverWidth) - ppt.botGridHeight, aw - 20, ppt.botTextRowHeight, lt_txt);
								if (this.groups[i].tracktype != 3) {
									gr.GdiDrawText(arr[0], g_font_s, txt_color, ax + 10, (coverTop + 5 + coverWidth + ppt.botTextRowHeight) - ppt.botGridHeight, aw - 20, ppt.botTextRowHeight, lt_txt);
								}
							}
							else
								gr.GdiDrawText(arr[0], (i == this.selectedIndex ? g_font_b : g_font), txt_color, ax + 10, (coverTop + coverWidth + 6) - ppt.botGridHeight, aw - 20, ppt.botTextRowHeight, lt_txt);
						} catch (e) {}
					};
				};
			};

			// set next column index
			if (cx == this.totalColumns - 1) {
				cx = 0;
			} else {
				cx++;
			};
		};

		// draw scrollbar
		try{
			brw.scrollbar && brw.scrollbar.draw(gr);
		}catch(e){
			brw.scrollbar.updateScrollbar();
			brw.scrollbar.draw(gr);
		}
		// Incremental Search Display
		if (cList.search_string.length > 0) {
			var string_w = gr.CalcTextWidth(cList.search_string, cList.incsearch_font);
			var string_h = gr.CalcTextHeight(cList.search_string, cList.incsearch_font);
			gr.SetSmoothingMode(2);
			brw.tt_w = Math.round(string_w + cSwitchBtn.w);
			brw.tt_h = Math.round(string_h + 16 * zdpi);
			brw.tt_x = Math.floor((brw.w - brw.tt_w) / 2);
			brw.tt_y = brw.y + ((brw.h - brw.tt_h) / 2);
			gr.FillRoundRect(brw.tt_x, brw.tt_y, brw.tt_w, brw.tt_h, 5, 5, RGBA(0, 0, 0, 150));
			gr.DrawRoundRect(brw.tt_x-1, brw.tt_y-1, brw.tt_w+2, brw.tt_h+2, 5, 5, 1.0, RGBA(0, 0, 0, 180));
			try {
				gr.GdiDrawText(cList.search_string, cList.incsearch_font, c_black, brw.tt_x + 1, brw.tt_y + 1, brw.tt_w, brw.tt_h, ccf_txt);
				gr.GdiDrawText(cList.search_string, cList.incsearch_font, cList.inc_search_noresult ? RGB(255, 70, 70) : RGB(250, 250, 250), brw.tt_x, brw.tt_y, brw.tt_w, brw.tt_h, ccf_txt);
			}
			catch (e) {};
		};

		// fill ALL cover image with the 1st four cover art found
		// get cover
		if (all_x > -1 && ppt.showAllItem && g_start_ == 0) {// && total > 1) {
			var ii_w = Math.floor(all_w / 2);
			var ii_h = Math.floor(all_h / 2);
			var ii_x1 = all_x;
			var ii_x2 = ii_x1 + ii_w;
			var ii_y1 = all_y;
			var ii_y2 = ii_y1 + ii_h;
			var lim = this.groups.length;
			if (lim > 5) lim = 5;
			for (var ii = 1; ii < lim; ii++) {
				if (this.groups[ii].cover_img) {
					switch (ii) {
					case 1:
						gr.DrawImage(this.groups[ii].cover_img, ii_x1, ii_y1, ii_w, ii_h, 1, 1, this.groups[ii].cover_img.Width - 2, this.groups[ii].cover_img.Height - 2);
						break;
					case 2:
						gr.DrawImage(this.groups[ii].cover_img, ii_x2, ii_y1, ii_w, ii_h, 1, 1, this.groups[ii].cover_img.Width - 2, this.groups[ii].cover_img.Height - 2);
						break;
					case 3:
						gr.DrawImage(this.groups[ii].cover_img, ii_x1, ii_y2, ii_w, ii_h, 1, 1, this.groups[ii].cover_img.Width - 2, this.groups[ii].cover_img.Height - 2);
						break;
					case 4:
						gr.DrawImage(this.groups[ii].cover_img, ii_x2, ii_y2, ii_w, ii_h, 1, 1, this.groups[ii].cover_img.Width - 2, this.groups[ii].cover_img.Height - 2);
						break;
					};
				};
			};
			var frame_col = g_color_normal_txt & 0x25ffffff;//“所有项目”的边框
			gr.DrawRect(ii_x1, ii_y1, all_w - 2, all_h - 2, 1.0, frame_col);
			gr.FillSolidRect(ii_x1 + 1, ii_y1 + Math.round(all_h / 2) - 1, all_w - 3, 1, frame_col);
			gr.FillSolidRect(ii_x1 + Math.round(all_w / 2) - 1, ii_y1 + 1, 1,  all_h - 3, frame_col);

			// redraw hover frame selection on ALL item for Grid view
			if (ppt.panelMode > 1) { // grid
				if (g_rightClickedIndex == 0 || this.activeIndex == 0) {
					gr.DrawRect(all_x + 1, all_y + 1, all_w - 3, all_h - 3, 3.0, g_color_selected_bg & 0xddffffff);
				};
			};
		};

		// draw top header bar
		var item_txt = ["张专辑", "位专辑艺术家", "位艺术家", "个文件夹", "个目录", "个流派"];
		var nb_groups = ((ppt.showAllItem && total > 0) ? total - 1 : total);
		var boxText;
		switch (ppt.tagMode){
		case 1:
			boxText = nb_groups + " " +  item_txt[ppt.tagMode - 1] + "  ";
			break;
		case 2:
			boxText = nb_groups + " " +  item_txt[ppt.tagMode - 1 + ppt.artistMode] + "  ";
			break;
		case 3:
			boxText = nb_groups + " " +  item_txt[ppt.tagMode + ppt.dirMode] + "  ";
			break;
		default:
			boxText = nb_groups + " " +  item_txt[ppt.tagMode + 1] + "  ";
			break;
		}
		try{boxText_len = gr.CalcTextWidth(boxText, g_font_b)}
		catch (e) {boxText_len = 0;}
		if (ppt.sourceMode == 0) {
			var source_name = "媒体库"
		} else {
			var source_name = "当前列表：" + (ppt.locklibpl ? "媒体库" : plman.GetPlaylistName(plman.ActivePlaylist));
		};
		var source_width = gr.CalcTextWidth(source_name, g_font_b);
		gr.FillSolidRect(0, 0, ww, brw.y + 1, g_color_normal_bg);
		gr.FillSolidRect(this.x, ppt.headerBarHeight, this.w + cScrollBar.width, 1, g_color_line);
		var tx = cFilterBox.x + cFilterBox.w + z(22) + 10;
		var tw = (this.w - tx - cSwitchBtn.w - 2 + cScrollBar.width)*2/3;
		var source_w = Math.min(tw, source_width);
		gr.FillSolidRect(tx - 8, 0, tw * 2 + 8 + ppt.headerBarHeight , ppt.headerBarHeight - 2, g_color_topbar);
		try {
			gr.GdiDrawText(source_name, g_font_b, g_color_normal_txt, tx, 0, source_w, ppt.headerBarHeight, lc_txt);
			if(fb.IsPlaying && playing_title) gr.GdiDrawText("  |  "+ playing_title + " [播放中] ", g_font, g_color_highlight, tx + source_width, 0, tw - source_width, ppt.headerBarHeight, lc_txt);
			gr.GdiDrawText(boxText, g_font_b, g_color_normal_txt, tx + tw, 0, tw/2, ppt.headerBarHeight, rc_txt);
		}
		catch (e) {};
		if(ppt.tagMode < 4) this.switch_btn.draw(gr, cSwitchBtn.x, cSwitchBtn.y, 255);
	};

	this._isHover = function(x, y) {
		return (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h);
	};

	this.on_mouse = function(event, x, y, delta) {
		this.ishover = this._isHover(x, y);

		// get active item index at x,y coords...
		this.activeIndex = -1;
		if (this.ishover) {
			this.activeRow = Math.ceil((y + scroll_ - this.y) / this.rowHeight) - 1;
			if (y > this.y && x > this.x && x < this.x + this.w) {
				this.activeColumn = Math.ceil((x - this.x - this.marginLR) / this.thumbnailWidth) - 1;
				this.activeIndex = (this.activeRow * this.totalColumns) + this.activeColumn;
				this.activeIndex = this.activeIndex > this.groups.length - 1 ? -1 : this.activeIndex;
			};
		};
		if (brw.activeIndex != brw.activeIndexSaved) {
			brw.activeIndexSaved = brw.activeIndex;
			this.repaint();
		};

		switch (event) {
		case "down":
			if (this.ishover) {
				if (this.activeIndex > -1) {
					if (this.activeIndex == this.selectedIndex) {
						this.drag_clicked = true;
						this.drag_clicked_x = x;
						if(plman.ActivePlaylist == g_active_playlist) return;
					} else {
						this.activateItem(this.activeIndex);
						this.change_active_item();
					}
				};
				if(ppt.sourceMode == 0) this.repaint();
			} else {
				this.scrollbar && this.scrollbar.on_mouse(event, x, y);
			};
			break;
		case "up":
			this.drag_clicked = false;
			this.scrollbar && this.scrollbar.on_mouse(event, x, y);
			break;
		case "dblclk":
			if (this.ishover) {
				if (brw.activeIndex > -1) {
					if (ppt.sourceMode == 0) {
						// play first track of the selection                     
						plman.ExecutePlaylistDefaultAction(g_active_playlist, 0);
					} else {
						plman.ExecutePlaylistDefaultAction(g_active_playlist, plman.GetPlaylistFocusItemIndex(g_active_playlist));
					};
				};
			} else {
				this.scrollbar && this.scrollbar.on_mouse(event, x, y);
			};
			break;
		case "right":
			g_rightClickedIndex = this.activeIndex;
			if (this.ishover && this.activeIndex > -1) {
				this.item_context_menu(x, y, this.activeIndex);
			} else {
				if (!g_filterbox.inputbox.hover) {
					this.settings_context_menu(x, y);
				};
			};
			g_rightClickedIndex = -1;
			if (!this.ishover) {
				this.scrollbar && this.scrollbar.on_mouse(event, x, y);
			};
			break;
		case "move":
			if (this.drag_clicked && !this.drag_moving) {
				if (x - this.drag_clicked_x > 30 && this.h > cPlaylistManager.rowHeight * 6) {
					this.drag_moving = true;
					window.SetCursor(IDC_HELP);
					pman.state = 1;
					if (timers.hidePlaylistManager) {
						window.ClearInterval(timers.hidePlaylistManager);
						timers.hidePlaylistManager = false;
					};
					if (!timers.showPlaylistManager) {
						timers.showPlaylistManager = window.SetInterval(pman.showPanel, 30);
					};
				};
			};
			if (this.drag_moving && !timers.hidePlaylistManager && !timers.showPlaylistManager) {
				pman.on_mouse("move", x, y);
			};
			this.scrollbar && this.scrollbar.on_mouse(event, x, y);
			break;
		case "wheel":
			this.scrollbar.updateScrollbar();
			break;
		case "leave":
			this.scrollbar && this.scrollbar.on_mouse(event, x, y);
			break;
		};
	};

	if (this.g_time) {
		window.ClearInterval(this.g_time);
		this.g_time = false;
	};
	this.g_time = window.SetInterval(function() {
		if (!window.IsVisible) return;
		var repaint_1 = false;
		if (repaint_main1 == repaint_main2) {
			repaint_main2 = !repaint_main1;
			repaint_1 = true;
		};
		scroll = check_scroll(scroll);
		if (Math.abs(scroll - scroll_) >= 1) {
			scroll_ += (scroll - scroll_) / ppt.scrollSmoothness;
			isScrolling = true;
			repaint_1 = true;
			if (scroll_prev != scroll) brw.scrollbar.updateScrollbar();
		} else {
			if (scroll_ != scroll) {
				scroll_ = scroll; // force to scroll_ value to fixe the 5.5 stop value for expanding album action
				repaint_1 = true;
			};
			if (isScrolling) {
				if (scroll_ < 1) scroll_ = 0;
				isScrolling = false;
				repaint_1 = true;
			};
		};
		scroll_prev = scroll;

		if (repaint_1) {
			images.loading_angle = (images.loading_angle + 15) % 360;
			window.Repaint();
		};
	}, ppt.refreshRate);

	this.item_context_menu = function(x, y, albumIndex) {
		var _menu = window.CreatePopupMenu();
		var Context = fb.CreateContextMenuManager();
		var _child01 = window.CreatePopupMenu();

		var crc = this.groups[albumIndex].cachekey;

		this.metadblist_selection = this.groups[albumIndex].pl.Clone();
		Context.InitContext(this.metadblist_selection);

		_menu.AppendMenuItem(MF_STRING, 1, "设置...");
		_menu.AppendMenuSeparator();
		if(ppt.showAllItem && albumIndex != 0) {
			if(this.groups[albumIndex].tracktype == 0){
				_menu.AppendMenuItem(MF_STRING, 899, "创建智能列表");
				_menu.AppendMenuSeparator();
			}
		}
		Context.BuildMenu(_menu, 2, -1);
		_menu.AppendMenuItem(MF_STRING, 1010, "重置所选图像的缓存");
		_child01.AppendTo(_menu, MF_STRING, "选择添加到...");
		_child01.AppendMenuItem(MF_STRING, 2000, "新播放列表");

		var pl_count = plman.PlaylistCount;
		if (pl_count > 1) {
			_child01.AppendMenuItem(MF_SEPARATOR, 0, "");
		};
		for (var i = 0; i < pl_count; i++) {
			if (i != this.playlist && !plman.IsAutoPlaylist(i)) {
				_child01.AppendMenuItem(MF_STRING, 2001 + i, plman.GetPlaylistName(i));
			};
		};

		var ret = _menu.TrackPopupMenu(x, y);
		if (ret > 1 && ret < 800) {
			Context.ExecuteByID(ret - 2);
		} else if (ret < 2) {
			switch (ret) {
			case 1:
				this.settings_context_menu(x, y);
				break;
			};
		} else {
			switch (ret) {
			case 899:
				var pl_n = plman.PlaylistCount;
				if(ppt.tagMode == 3){
					if(ppt.dirMode == 1){
						var string_n = fb.GetLibraryRelativePath(fb.GetFocusItem()).split("\\")[0];
						if(string_n != "") plman.CreateAutoPlaylist(pl_n, string_n, "%path%" + " HAS \"\\" + string_n + "\\\"");
					}else{
						var string_n = fb.TitleFormat("$directory_path(%path%)").EvalWithMetadb(fb.GetFocusItem());
						plman.CreateAutoPlaylist(pl_n, this.groups[albumIndex].groupkey, "%path%" + " HAS \"" + string_n + "\"");
					}
				} else {
					var string_n = fb.TitleFormat(ppt.tf_autopl).EvalWithMetadb(fb.GetFocusItem());
					plman.CreateAutoPlaylist(pl_n, this.groups[albumIndex].groupkey, ppt.tf_autopl + " IS \"" + string_n + "\"");
				}
				break;
			case 1010:
				reset_this_cache(albumIndex, crc);
				this.repaint();
				break;
			case 2000:
				fb.RunMainMenuCommand("文件/新建播放列表");
				plman.InsertPlaylistItems(plman.PlaylistCount - 1, 0, this.metadblist_selection, false);
				break;
			default:
				var insert_index = plman.PlaylistItemCount(ret - 2001);
				plman.InsertPlaylistItems((ret - 2001), insert_index, this.metadblist_selection, false);
			};
		};
		g_rbtn_click = false;
		return true;
	};

	this.settings_context_menu = function(x, y) {
		var _menu = window.CreatePopupMenu();
		var _menu0 = window.CreatePopupMenu();
		var _menu1 = window.CreatePopupMenu();
		var _menu2 = window.CreatePopupMenu();
		var _menu3 = window.CreatePopupMenu();
		var idx;

		_menu0.AppendMenuItem(MF_STRING, 50, "媒体库");
		_menu0.AppendMenuItem(MF_STRING, 51, "播放列表");
		_menu0.CheckMenuRadioItem(50, 51, 50 + ppt.sourceMode);
		_menu0.AppendMenuSeparator();
		_menu0.AppendMenuItem((ppt.sourceMode == 1 && fb.IsLibraryEnabled()) ? MF_STRING : MF_DISABLED, 52, "锁定在媒体库播放列表");
		_menu0.CheckMenuItem(52, ppt.locklibpl);
		_menu0.AppendTo(_menu, MF_STRING, "来源");
		_menu.AppendMenuSeparator();
		_menu1.AppendMenuItem(MF_STRING, 111, "专辑 | 专辑艺术家");
		_menu1.AppendMenuItem(MF_STRING, 112, "专辑");
		_menu1.AppendMenuItem(MF_STRING, 113, "专辑艺术家");
		_menu1.AppendMenuItem(MF_STRING, 114, "艺术家");
		_menu1.AppendMenuItem(MF_STRING, 115, "文件夹");
		_menu1.AppendMenuItem(MF_STRING, 116, "媒体库一级目录");
		_menu1.AppendMenuItem(MF_STRING, 117, "流派");
		switch (ppt.tagMode){
		case 1:
			_menu1.CheckMenuRadioItem(111, 112, 110 + ppt.tagMode + ppt.albumMode);
			break;
		case 2:
			_menu1.CheckMenuRadioItem(113, 114, 111 + ppt.tagMode + ppt.artistMode);
			break;
		case 3:
			_menu1.CheckMenuRadioItem(115, 116, 112 + ppt.tagMode + ppt.dirMode);
			break;
		case 4:
			_menu1.CheckMenuRadioItem(117, 117, 117);
			break;
		}
		_menu1.AppendTo(_menu, MF_STRING, "视图");
		_menu2.AppendMenuItem(MF_STRING, 900, "紧凑排列模式");
		_menu2.AppendMenuItem(MF_STRING, 901, "间距排列模式");
		_menu2.AppendMenuItem(MF_STRING, 902, "网格排列无文字模式");
		_menu2.AppendMenuItem(MF_STRING, 903, "网格排列模式");
		_menu2.CheckMenuRadioItem(900, 903, 900 + ppt.panelMode);
		_menu2.AppendMenuSeparator();
		_menu2.AppendMenuItem(MF_STRING, 910, "保持图像比例");
		_menu2.CheckMenuItem(910, cover.keepaspectratio);
		_menu2.AppendMenuItem(MF_STRING, 911, "合计项目");
		_menu2.CheckMenuItem(911, ppt.showAllItem);
		_menu2.AppendMenuSeparator();
		_menu2.AppendMenuItem(MF_STRING, 913, "重置缓存索引文件");
		_menu2.AppendMenuSeparator();
		_menu2.AppendMenuItem(MF_STRING, 912, "重置磁盘缓存");
		_menu2.AppendTo(_menu, MF_STRING, "显示");
		_menu.AppendMenuItem(MF_STRING, 200, "刷新封面 (F5)");
		_menu.AppendMenuItem(MF_STRING, 202, "刷新封面及缓存");
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(MF_STRING, 201, "加载时动画效果");
		_menu.CheckMenuItem(201, ppt.showloading);
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(MF_STRING, 991, "面板属性");

		idx = _menu.TrackPopupMenu(x, y);

		switch (true) {
		case (idx >= 50 && idx <= 51):
			ppt.sourceMode = idx - 50;
			window.SetProperty("_PROPERTY: Source Mode", ppt.sourceMode);
			window.Reload();
			break;
		case (idx == 52):
			ppt.locklibpl = !ppt.locklibpl;
			if (ppt.lock_lib_playlist) g_active_playlist = 0;
			else g_active_playlist = plman.ActivePlaylist;
			window.SetProperty("_PROPERTY: Lock to Library playlist", ppt.locklibpl);
			window.NotifyOthers("lock_lib_playlist", ppt.locklibpl);
			window.Reload();
			break;
		case (idx >= 111 && idx <= 112):
			ppt.tagMode = 1;
			ppt.albumMode = idx - 111;
			window.SetProperty("_PROPERTY: Tag Mode", ppt.tagMode);
			window.SetProperty("_PROPERTY: Album Mode", ppt.albumMode);
			get_tagprop();
			get_botGridHeight();
			brw.reset_swbtn();
			brw.populate();
			break;
		case (idx >= 113 && idx <= 114):
			ppt.tagMode = 2;
			ppt.artistMode = idx - 113;
			window.SetProperty("_PROPERTY: Tag Mode", ppt.tagMode);
			window.SetProperty("_PROPERTY: Album Mode", ppt.artistMode);
			get_tagprop();
			get_botGridHeight();
			brw.reset_swbtn();
			brw.populate();
			break;
		case (idx >= 115 && idx <= 116):
			ppt.tagMode = 3;
			ppt.dirMode = idx - 115;
			window.SetProperty("_PROPERTY: Tag Mode", ppt.tagMode);
			window.SetProperty("_PROPERTY: Folder or Library directory", ppt.dirMode);
			get_tagprop();
			get_botGridHeight();
			brw.reset_swbtn();
			brw.populate();
			break;
		case (idx == 117):
			ppt.tagMode = 4;
			window.SetProperty("_PROPERTY: Tag Mode", ppt.tagMode);
			get_tagprop();
			get_botGridHeight();
			brw.reset_swbtn();
			brw.populate();
			break;
		case (idx == 200):
			refresh_cover();
			break;
		case (idx == 201):
			ppt.showloading = !ppt.showloading;
			window.SetProperty("_PROPERTY: Show loading animation", ppt.showloading);
			break;
		case (idx == 202):
			refresh_cover(true);
			break;
		case (idx >= 900 && idx <= 903):
			ppt.panelMode = idx - 900;
			window.SetProperty("_PROPERTY: Display Mode", ppt.panelMode);
			get_metrics();
			brw.setList();
			brw.update();
			break;
		case (idx == 910):
			cover.keepaspectratio = !cover.keepaspectratio;
			window.SetProperty("Cover keep aspect ratio", cover.keepaspectratio);
			brw.repaint();
			break;
		case (idx == 911):
			ppt.showAllItem = !ppt.showAllItem;
			window.SetProperty("_PROPERTY: Show ALL item", ppt.showAllItem);
			brw.populate();
			break;
		case (idx == 912):
			if (utils.IsDirectory(CACHE_FOLDER)){
				for (let i = 0; i < crcloaded.length; i++) {
					crclist[i] = [];
				}
				try{
					fso.DeleteFile(CACHE_FOLDER + "\\artist_album\\*");
					fso.DeleteFile(CACHE_FOLDER + "\\album\\*");
					fso.DeleteFile(CACHE_FOLDER + "\\artist\\*");
					fso.DeleteFile(CACHE_FOLDER + "\\genre_dir\\*");
				} catch(e){}
			}
			var tot = brw.groups.length;
			var crc;
			for (var k = (ppt.showAllItem ? 1 : 0); k < tot; k++) {
				crc = brw.groups[k].cachekey;
				brw.groups[k].load_requested = 0;
				g_image_cache.reset(crc);
				brw.groups[k].cover_img = null;
			}
			brw.repaint();
			break;
		case (idx == 913):
			if (utils.IsDirectory(CACHE_FOLDER)){
				for (let i = 0; i < crcloaded.length; i++) {
					crcmod[i] = false;
				}
				try{fso.DeleteFile(CACHE_FOLDER + "\\artist_album\\crc");}catch(e){}
				try{fso.DeleteFile(CACHE_FOLDER + "\\album\\crc");}catch(e){}
				try{fso.DeleteFile(CACHE_FOLDER + "\\artist\\crc");}catch(e){}
				try{fso.DeleteFile(CACHE_FOLDER + "\\genre_dir\\crc");}catch(e){}
			}
			break;
		case (idx == 991):
			window.ShowProperties();
			break;
		};
		return true;
	};

	this.incrementalSearch = function() {
		var count = 0;
		var groupkey = [];
		var chr;
		var gstart;
		var pid = -1;

		// exit if no search string in cache
		if (cList.search_string.length <= 0) return true;

		var total = this.groups.length;

		// 1st char of the search string
		var first_chr = cList.search_string.substring(0, 1);
		var len = cList.search_string.length;

		// which start point for the search
		if (total > 1000) {
			chr = this.groups[Math.floor(total / 2)].groupkey.substring(0, 1);
			if (first_chr.charCodeAt(first_chr) > chr.charCodeAt(chr)) {
				gstart = Math.floor(total / 2);
			} else {
				gstart = (ppt.showAllItem ? 1 : 0);
			};
		} else {
			gstart = (ppt.showAllItem ? 1 : 0);
		};

		var format_str = "";
		for (var i = gstart; i < total; i++) {
			if(ppt.tagMode == 1 && ppt.albumMode == 0) groupkey = this.groups[i].groupkey.split(" ^^ ");
			else groupkey[0] = this.groups[i].groupkey;
			for (var j = 0; j < groupkey.length; j++) {
				if (len <= groupkey[j].length) {
					format_str = groupkey[j].substring(0, len);
				} else {
					format_str = groupkey[j];
				};
				if (format_str.toLowerCase() == cList.search_string.toLowerCase()) {
					pid = i;
					break;
				};
			}
			if(pid >= 0) break;
		};

		if (pid >= 0) { // found
			this.showItemFromItemIndex(pid);
		} else { // not found on "album artist" TAG, new search on "artist" TAG
			cList.inc_search_noresult = true;
			brw.repaint();
		};

		cList.clear_incsearch_timer && window.ClearTimeout(cList.clear_incsearch_timer);
		cList.clear_incsearch_timer = window.SetTimeout(function() {
			// reset incremental search string after 1 seconds without any key pressed
			cList.search_string = "";
			cList.inc_search_noresult = false;
			brw.repaint();
			window.ClearInterval(cList.clear_incsearch_timer);
			cList.clear_incsearch_timer = false;
		}, 1000);
	};
};

const load_image_to_cache = async () =>
{
	if(!crcloaded[crcidx]){
		try{
			crclist[crcidx] = utils.ReadTextFile(CACHE_FOLDER + ppt.cache_subdir + "crc", 0).split(",");
			crcloaded[crcidx] = true;
		} catch(e){crclist[crcidx] = [];return;}
		if(!crclist[crcidx].length){
			return;
		}
	}
	for (let i = 0; i < crclist[crcidx].length; i++) {
		if(!g_image_cache._cachelist[crclist[crcidx][i]]){//initial "undefined"
			try{
				const image = await gdi.LoadImageAsyncV2(0, CACHE_FOLDER + ppt.cache_subdir + crclist[crcidx][i] + ".jpg");
				if(typeof(image) != "undefined") {
					g_image_cache._cachelist[crclist[crcidx][i]] = image;
				}
			} catch(e){}
		}
	}
};

//==============================Main=========================================================

var fso = new ActiveXObject("Scripting.FileSystemObject");
var brw = null;
var isScrolling = false;
var g_switchbar = null;
var g_filterbox = null;
var filter_text = "";

// fonts
var g_font = null, g_font_b = null, g_font_s = null, g_font_bb = null;
//
var ww = 0,
	wh = 0;
clipboard = {
	selection: null
};
// wallpaper infos
var m_x = 0,
	m_y = 0;
var g_active_playlist = null;
// color vars
var g_color_normal_bg = 0;
var g_color_selected_bg = 0;
var g_color_normal_txt = 0;
var g_color_highlight = 0, c_default_hl = 0;
var g_scroll_color = 0;
var g_color_grid_bg = 0;
var g_btn_color1, g_color_bt_overlay;
// boolean to avoid callbacks
var g_avoid_on_item_focus_change = false;
var g_avoid_on_playlist_items_removed = false;
// mouse actions
var g_lbtn_click = false;
var g_rbtn_click = false;
//
var g_total_duration_text = "";
var launch_time = fb.CreateProfiler("launch_time");
var form_text = "";
var	repaint_main1 = true,
	repaint_main2 = true;
var scroll_ = 0,
	scroll = 0,
	scroll_prev = 0;
var time222;
var g_start_ = 0,
	g_end_ = 0;

var g_rightClickedIndex = -1;
var playing_title;

function on_init() {
	window.DlgCode = DLGC_WANTALLKEYS;
	if (!utils.IsDirectory(CACHE_FOLDER)) {
		fso.CreateFolder(CACHE_FOLDER);
		fso.CreateFolder(CACHE_FOLDER + "\\artist_album");
		fso.CreateFolder(CACHE_FOLDER + "\\album");
		fso.CreateFolder(CACHE_FOLDER + "\\artist");
		fso.CreateFolder(CACHE_FOLDER + "\\genre_dir");
	} else {
		if (!utils.IsDirectory(CACHE_FOLDER + "\\artist_album")) fso.CreateFolder(CACHE_FOLDER + "\\artist_album");
		if (!utils.IsDirectory(CACHE_FOLDER + "\\album")) fso.CreateFolder(CACHE_FOLDER + "\\album");
		if (!utils.IsDirectory(CACHE_FOLDER + "\\artist")) fso.CreateFolder(CACHE_FOLDER + "\\artist");
		if (!utils.IsDirectory(CACHE_FOLDER + "\\genre_dir")) fso.CreateFolder(CACHE_FOLDER + "\\genre_dir");
	}
	get_font();
	get_colors();
	g_switchbar = new oSwitchbar();
	get_metrics();
	if(ppt.locklibpl) {
		if(!fb.IsLibraryEnabled()) {
			ppt.locklibpl = false;
		} else {
			g_active_playlist = 0;
			if (plman.GetPlaylistName(0) != "媒体库") {
				g_active_playlist = plman.ActivePlaylist;
			}
		}
		var timeout_lock = window.SetTimeout(function() {
			window.NotifyOthers("lock_lib_playlist", ppt.locklibpl);
			timeout_lock && window.ClearTimeout(timeout_lock);
			timeout_lock = false;
		}, 400);
	} else g_active_playlist = plman.ActivePlaylist;

	get_tagprop();
	get_images_static();
	get_images();
	get_images_loading();
	brw = new oBrowser();
	pman = new oPlaylistManager();
	g_filterbox = new oFilterBox();
	g_filterbox.setSize(cFilterBox.w, cFilterBox.h);
	g_filterbox.inputbox.visible = true;
	if(ppt.cache_size < 100) ppt.cache_size = 100;
	if(ppt.cache_size > 1000) ppt.cache_size = 1000;
	
	if (isNaN(scroll) || isNaN(scroll_)) {
		scroll = scroll_ = 0;
	};
	brw.launch_populate();
};
on_init();
// START

function on_size() {
	ww = window.Width;
	wh = window.Height;

	if (!ww || !wh) {
		ww = ppt.default_lineHeightMin;
		wh = ppt.default_lineHeightMin;
	};

	window.MinWidth = ppt.default_lineHeightMin;
	window.MinHeight = ppt.default_lineHeightMin;
	// set Size of browser
	brw.setSize(0, ppt.headerBarHeight, ww - cScrollBar.width, wh - ppt.headerBarHeight);
	g_switchbar.setSize(g_switchbar.x, g_switchbar.y, g_switchbar.w, g_switchbar.h);
};

function on_paint(gr) {
	if (!window.Width || !window.Height) return;
	gr.FillSolidRect(0, 0, ww, wh, g_color_normal_bg);
	brw && brw.draw(gr);
	if (pman.offset > 0) pman.draw(gr);
	g_filterbox.draw(gr, cFilterBox.x, cFilterBox.y);
	g_switchbar.draw(gr);
};

function on_mouse_lbtn_down(x, y) {
	g_lbtn_click = true;
	g_rbtn_click = false;

	// stop inertia
	if (cTouch.timer) {
		window.ClearInterval(cTouch.timer);
		cTouch.timer = false;
		// stop scrolling but not abrupt, add a little offset for the stop
		if (Math.abs(scroll - scroll_) > ppt.rowHeight) {
			scroll = (scroll > scroll_ ? scroll_ + ppt.rowHeight : scroll_ - ppt.rowHeight);
			scroll = check_scroll(scroll);
		};
	};

	var is_scroll_enabled = brw.rowsCount > brw.totalRowsVis;
	if (ppt.enableTouchControl && is_scroll_enabled) {
		if (brw._isHover(x, y) && !brw.scrollbar._isHover(x, y)) {
			if (!timers.mouseDown) {
				cTouch.y_prev = y;
				cTouch.y_start = y;
				if (cTouch.t1) {
					cTouch.t1.Reset();
				} else {
					cTouch.t1 = fb.CreateProfiler("t1");
				};
				timers.mouseDown = window.SetTimeout(function() {
					window.ClearTimeout(timers.mouseDown);
					timers.mouseDown = false;
					if (Math.abs(cTouch.y_start - m_y) > 015) {
						cTouch.down = true;
					} else {
						brw.on_mouse("down", x, y);
					};
				}, 50);
			};
		} else {
			brw.on_mouse("down", x, y);
		};
	} else {
		brw.on_mouse("down", x, y);
	};

	// inputBox
	g_filterbox.on_mouse("lbtn_down", x, y);
	if(ppt.tagMode < 4) brw.switch_btn.checkstate("down", x, y);
};

function on_mouse_lbtn_up(x, y) {
		g_filterbox.on_mouse("lbtn_up", x, y);
		g_switchbar.on_mouse("lbtn_up", x, y);

	if (pman.state == 1) {
		pman.on_mouse("up", x, y);
	} else {
		brw.on_mouse("up", x, y);
		if (ppt.tagMode < 4 && brw.switch_btn.checkstate("up", x, y) == ButtonStates.hover) {
			switch (ppt.tagMode){
				case 1:
					ppt.albumMode = !ppt.albumMode;
					window.SetProperty("_PROPERTY: Album Mode", ppt.albumMode);
					get_botGridHeight();
					break;
				case 2:
					ppt.artistMode = !ppt.artistMode;
					window.SetProperty("_PROPERTY: Artist Mode", ppt.artistMode);
					break;
				case 3:
					ppt.dirMode = !ppt.dirMode;
					window.SetProperty("_PROPERTY: Folder or Library directory", ppt.dirMode);
					break;
			}
			get_tagprop();
			brw.populate();
			brw.reset_swbtn();
		}
	};

	if (timers.mouseDown) {
		window.ClearTimeout(timers.mouseDown);
		timers.mouseDown = false;
		if (Math.abs(cTouch.y_start - m_y) <= 030) {
			brw.on_mouse("down", x, y);
		};
	};

	// create scroll inertia on mouse lbtn up
	if (cTouch.down) {
		cTouch.down = false;
		cTouch.y_end = y;
		cTouch.scroll_delta = scroll - scroll_;
		if (Math.abs(cTouch.scroll_delta) > 015) {
			cTouch.multiplier = ((1000 - cTouch.t1.Time) / 20);
			cTouch.delta = Math.round((cTouch.scroll_delta) / 015);
			if (cTouch.multiplier < 1) cTouch.multiplier = 1;
			if (cTouch.timer) window.ClearInterval(cTouch.timer);
			cTouch.timer = window.SetInterval(function() {
				scroll += cTouch.delta * cTouch.multiplier;
				scroll = check_scroll(scroll);
				cTouch.multiplier = cTouch.multiplier - 1;
				cTouch.delta = cTouch.delta - (cTouch.delta / 10);
				if (cTouch.multiplier < 1) {
					window.ClearInterval(cTouch.timer);
					cTouch.timer = false;
				};
			}, 75);
		};
	};

	g_lbtn_click = false;
};

function on_mouse_lbtn_dblclk(x, y, mask) {
	if (y >= brw.y) {
		brw.on_mouse("dblclk", x, y);
	} else if (x > brw.x && x < brw.x + brw.w - cSwitchBtn.w - 2 + cScrollBar.width) {
		brw.showNowPlaying();
	}
};

function on_mouse_rbtn_down(x, y, mask) {

};

function on_mouse_rbtn_up(x, y) {
	g_rbtn_click = true;
	if (!utils.IsKeyPressed(VK_SHIFT)) {
		g_filterbox.on_mouse("rbtn_down", x, y);
		if (pman.state == 1) {
			pman.on_mouse("right", x, y);
		};
	};
	brw.on_mouse("right", x, y);
	g_rbtn_click = false;
	
	//if (!utils.IsKeyPressed(VK_SHIFT)) {
	return true;
	//};
};

function on_mouse_move(x, y) {
	if (m_x == x && m_y == y) return;
	g_filterbox.on_mouse("move", x, y);
	g_switchbar.on_mouse("move", x, y);

	if (pman.state == 1) {
		pman.on_mouse("move", x, y);
	} else {
		if (cTouch.down) {
			cTouch.y_current = y;
			cTouch.y_move = (cTouch.y_current - cTouch.y_prev);
			if (x < brw.w) {
				scroll -= cTouch.y_move;
				cTouch.scroll_delta = scroll - scroll_;
				if (Math.abs(cTouch.scroll_delta) < 030) cTouch.y_start = cTouch.y_current;
				cTouch.y_prev = cTouch.y_current;
			};
		} else {
			brw.on_mouse("move", x, y);
			if(ppt.tagMode < 4) brw.switch_btn.checkstate("move", x, y);
		};
	};

	m_x = x;
	m_y = y;
};

function on_mouse_wheel(step) {
	if (cTouch.timer) {
		window.ClearInterval(cTouch.timer);
		cTouch.timer = false;
	};

	if (utils.IsKeyPressed(VK_SHIFT)) { // zoom cover size only
		var zoomStep = Math.round(ppt.thumbnailWidthMin / 4);
		var previous = ppt.default_thumbnailWidthMin;
		if (!timers.mouseWheel) {
			ppt.default_thumbnailWidthMin += step * zoomStep;
			if (ppt.default_thumbnailWidthMin < 130) ppt.default_thumbnailWidthMin = 130;
			if (ppt.default_thumbnailWidthMin > 250) ppt.default_thumbnailWidthMin = 250;
			if (previous != ppt.default_thumbnailWidthMin) {
				timers.mouseWheel = window.SetTimeout(function() {
					window.SetProperty("SYSTEM thumbnails Minimal Width", ppt.default_thumbnailWidthMin);
					//g_image_cache = new image_cache;
					get_metrics();
					brw.setList();
					brw.update();
					timers.mouseWheel && window.ClearTimeout(timers.mouseWheel);
					timers.mouseWheel = false;
				}, 100);
			};
		};
	} else {
		if (pman.state == 1) {
			if (pman.scr_w > 0) pman.on_mouse("wheel", m_x, m_y, step);
		} else {
			scroll -= step * (brw.rowHeight / ppt.rowScrollStep);
			scroll = check_scroll(scroll)
			brw.on_mouse("wheel", m_x, m_y, step);
		};
	};
};

function on_mouse_leave() {
	g_filterbox.on_mouse("leave", 0, 0);
	if(ppt.tagMode < 4) brw.switch_btn.checkstate("leave", 0, 0);
	brw.on_mouse("leave", 0, 0);

	if (pman.state == 1) {
		pman.on_mouse("leave", 0, 0);
	};
	g_switchbar.on_mouse("leave", 0, 0);
};

//=================================================// Metrics & Fonts & Colors & Images
function get_botGridHeight(){
	if(ppt.tagMode == 1 && ppt.albumMode == 0){
		ppt.botGridHeight = Math.floor((ppt.default_botGridHeight + 14) * zdpi);
	}
	else ppt.botGridHeight = Math.floor(ppt.default_botGridHeight * zdpi);
}

function get_metrics() {
	ppt.lineHeightMin = Math.floor(ppt.default_lineHeightMin * zdpi);
	ppt.thumbnailWidthMin = Math.floor(ppt.default_thumbnailWidthMin * zdpi);
	get_botGridHeight();
	ppt.botStampHeight = 48*zdpi;
	ppt.botTextRowHeight =  17*zdpi;
	ppt.textLineHeight = 10*zdpi;
	cPlaylistManager.width = 230*zdpi;
	cPlaylistManager.topbarHeight = 30*zdpi;
	cPlaylistManager.botbarHeight = 4*zdpi;
	cPlaylistManager.scrollbarWidth = 10*zdpi;
	cPlaylistManager.rowHeight = 30*zdpi;
	cScrollBar.width = sys_scrollbar ? get_system_scrollbar_width() : 12*zdpi;
	cScrollBar.minCursorHeight = 25*zdpi;
	cScrollBar.maxCursorHeight = sys_scrollbar ? 125*zdpi : 110*zdpi;
	ppt.headerBarHeight = z(26) + 2;
	g_switchbar.x = 0;
	g_switchbar.y = z(5);
	g_switchbar.w = z(157);
	g_switchbar.h = ppt.headerBarHeight;
	cFilterBox.x = g_switchbar.x + g_switchbar.w + z(11);
	cFilterBox.w = 120*zdpi;
	cFilterBox.h = 20*zdpi;
	cFilterBox.y = Math.ceil((ppt.headerBarHeight - cFilterBox.h)/2);
	cSwitchBtn.h = 12 * zdpi + 12;
	cSwitchBtn.y = Math.ceil((ppt.headerBarHeight - cSwitchBtn.h) / 2);
	cSwitchBtn.w = 24 * zdpi;
	if (brw) {
		brw.setSize(0, ppt.headerBarHeight, ww - cScrollBar.width, wh - ppt.headerBarHeight);
	};
};

function get_images_static() {
	let gb;
	let color_ico = dark_mode ? RGBA(255,255,255,10) : RGBA(0,0,0,10);
	let nw = 250, nh = 250;
	
	images.all = gdi.CreateImage(150, 150);
	gb = images.all.GetGraphics();
	gb.FillSolidRect(0, 0, 150, 150, color_ico);
	images.all.ReleaseGraphics(gb);
	
	images.noart = gdi.CreateImage(nw, nh);
	gb = images.noart.GetGraphics();
	gb.FillSolidRect(0, 0, nw, nh, color_ico);
	gb.SetSmoothingMode(2);
	gb.DrawEllipse(70,70,100,100,50,color_ico);
	gb.SetSmoothingMode(0);
	images.noart.ReleaseGraphics(gb);
}

function get_images() {
	var gb;
	var txt = "";
	var x5 = 5*zdpi, _x10 = 10*zdpi, _x14 = 14*zdpi;
	
	images.sw_btn_n0 = gdi.CreateImage(cSwitchBtn.w, cSwitchBtn.h);
	gb = images.sw_btn_n0.GetGraphics();
	gb.SetSmoothingMode(2);
	gb.FillRoundRect(2*zdpi,x5, 18*zdpi,_x10, x5,x5, g_btn_color1);
	gb.FillRoundRect(2*zdpi+2,x5+2, _x10-4,_x10-4, x5-2,x5-2, RGBA(255, 255, 255, 180));
	images.sw_btn_n0.ReleaseGraphics(gb);
	
	images.sw_btn_n1 = gdi.CreateImage(cSwitchBtn.w, cSwitchBtn.h);
	gb = images.sw_btn_n1.GetGraphics();
	gb.SetSmoothingMode(2);
	gb.FillRoundRect(2*zdpi,x5, 18*zdpi,_x10, x5,x5, g_btn_color1);
	gb.FillRoundRect(_x10+2,x5+2, _x10-4,_x10-4, x5-2,x5-2, RGBA(255, 255, 255, 180));
	images.sw_btn_n1.ReleaseGraphics(gb);
	
	let nw = Math.round(16*zdpi);
	let nh = Math.round(15*zdpi);
	images.album = gdi.CreateImage(nw, nw);
	gb = images.album.GetGraphics();
	gb.SetSmoothingMode(2);
	gb.DrawEllipse(zdpi,zdpi, _x14,_x14, 1, g_color_normal_txt);
	gb.DrawEllipse(6*zdpi,6*zdpi, 4*zdpi,4*zdpi, 1, g_color_normal_txt);
	gb.SetSmoothingMode(0);
	images.album.ReleaseGraphics(gb);
	
	images.artist = gdi.CreateImage(nw, nh);
	gb = images.artist.GetGraphics();
	gb.SetSmoothingMode(2);
	gb.DrawEllipse(4*zdpi,zdpi, 8*zdpi,8*zdpi, 1, g_color_normal_txt);
	gb.DrawEllipse(zdpi,9*zdpi, _x14,_x14, 1, g_color_normal_txt);
	gb.SetSmoothingMode(0);
	images.artist.ReleaseGraphics(gb);
	
	images.genre = gdi.CreateImage(nw, nh);
	gb = images.genre.GetGraphics();
	gb.SetSmoothingMode(2);
	gb.DrawEllipse(zdpi,_x10, 4*zdpi,4*zdpi, 1, g_color_normal_txt);
	gb.DrawEllipse(_x10,_x10, 4*zdpi,4*zdpi, 1, g_color_normal_txt);
	gb.SetSmoothingMode(0);
	gb.DrawLine(Math.round(x5),12*zdpi, Math.round(x5),2*zdpi, 1, g_color_normal_txt);
	gb.DrawLine(Math.round(_x14),12*zdpi, Math.round(_x14),2*zdpi, 1, g_color_normal_txt);
	gb.DrawLine(Math.round(x5),2*zdpi, Math.round(_x14),2*zdpi, 1, g_color_normal_txt);
	gb.DrawLine(Math.round(x5),x5, Math.round(_x14),x5, 1, g_color_normal_txt);
	images.genre.ReleaseGraphics(gb);
	
	images.folder = gdi.CreateImage(nw, nh);
	gb = images.folder.GetGraphics();
	gb.SetSmoothingMode(0);
	var pointArr = Array(zdpi,zdpi, 6*zdpi,zdpi, 8*zdpi,3*zdpi, _x14,3*zdpi, _x14,_x14, zdpi,_x14);
	gb.DrawPolygon(g_color_normal_txt, 1, pointArr);
	gb.SetSmoothingMode(0);
	gb.DrawLine(zdpi,z(6), _x14,z(6), 1, g_color_normal_txt);
	images.folder.ReleaseGraphics(gb);
}

function get_images_loading() {
	images.img_loading = gdi.CreateImage(300, 300);
	gb = images.img_loading.GetGraphics();
	gb.SetSmoothingMode(2);
	gb.FillEllipse(136,108, 28, 28, g_color_highlight&0x75ffffff);
	gb.FillEllipse(108,136, 28, 28, g_color_highlight&0x55ffffff);
	gb.FillEllipse(136,164, 28, 28, g_color_highlight&0x35ffffff);
	gb.FillEllipse(164,136, 28, 28, g_color_highlight&0x15ffffff);
	gb.SetSmoothingMode(0);
	images.img_loading.ReleaseGraphics(gb);
	
	var iw = ppt.rowHeight / 2;
	images.loading_draw = images.img_loading.Resize(iw, iw, 2);
}

function get_font() {
	g_font = window.GetFontDUI(FontTypeDUI.playlists);
	g_fname = g_font.Name;
	g_fsize = g_font.Size;
	g_fstyle = g_font.Style;
	zdpi = g_fsize / 12;
	g_font_b = GdiFont(g_fname, g_fsize, 1);
	g_font_s = GdiFont(g_fname, g_fsize - 1, 0);
	g_font_bb = GdiFont(g_fname, g_fsize + 1, 1);
	g_font_lock = GdiFont(g_fname, g_fsize*2, 1);
	cList.incsearch_font = GdiFont(g_fname, g_fsize + 10, 1);
};

function get_colors() {
	g_color_normal_bg_default = window.GetColourDUI(ColorTypeDUI.background);
	g_color_normal_bg = g_color_normal_bg_default;
	g_color_normal_txt = window.GetColourDUI(ColorTypeDUI.text);
	g_scroll_color = g_color_normal_txt & 0x95ffffff;
	g_btn_color1 = g_color_normal_txt & 0x35ffffff;
	g_color_bt_overlay = g_color_normal_txt & 0x35ffffff;
	c_default_hl =  window.GetColourDUI(ColorTypeDUI.highlight);
	g_color_highlight = c_default_hl;
	g_color_grid_bg = g_color_normal_bg & 0x60ffffff;
	if(isDarkMode(g_color_normal_bg)) {
		dark_mode = 1;
		g_color_topbar = RGBA(0,0,0,30);
	}
	else {
		dark_mode = 0;
		g_color_topbar = RGBA(0,0,0,15);
	}
	g_color_selected_bg_default = window.GetColourDUI(ColorTypeDUI.selection);
	g_color_selected_bg = g_color_selected_bg_default;
};

function on_script_unload() {
	if(crcmod[0]) utils.WriteTextFile(CACHE_FOLDER + "\\artist_album\\" + "crc", crclist[0]);
	if(crcmod[1]) utils.WriteTextFile(CACHE_FOLDER + "\\album\\" + "crc", crclist[1]);
	if(crcmod[2]) utils.WriteTextFile(CACHE_FOLDER + "\\artist\\" + "crc", crclist[2]);
	if(crcmod[3]) utils.WriteTextFile(CACHE_FOLDER + "\\genre_dir\\" + "crc", crclist[3]);
	brw.g_time && window.ClearInterval(brw.g_time);
	brw.g_time = false;
};

//=================================================// Keyboard Callbacks

function on_key_up(vkey) {
	g_filterbox.on_key("up", vkey);
	// scroll keys up and down RESET (step and timers)
	cScrollBar.timerCounter = -1;
	cScrollBar.timerID && window.ClearTimeout(cScrollBar.timerID);
	cScrollBar.timerID = false;
	brw.repaint();
};


function on_key_down(vkey) {
	var mask = GetKeyboardMask();
	g_filterbox.on_key("down", vkey);

	if (mask == KMask.none) {
		switch (vkey) {
		case VK_F2:
			brw.showNowPlaying();
			break;
		case VK_F5:
			refresh_cover();
			break;
		case VK_BACK:
			if (cList.search_string.length > 0) {
				cList.inc_search_noresult = false;
				brw.tt_x = ((brw.w) / 2) - (((cList.search_string.length * 13) + (10 * 2)) / 2);
				brw.tt_y = brw.y + Math.floor((brw.h / 2) - 30);
				brw.tt_w = ((cList.search_string.length * 13) + (10 * 2));
				brw.tt_h = 60;
				cList.search_string = cList.search_string.substring(0, cList.search_string.length - 1);
				brw.repaint();
				cList.clear_incsearch_timer && window.ClearTimeout(cList.clear_incsearch_timer);
				cList.clear_incsearch_timer = false;
				cList.incsearch_timer && window.ClearTimeout(cList.incsearch_timer);
				cList.incsearch_timer = window.SetTimeout(function() {
					brw.incrementalSearch();
					window.ClearTimeout(cList.incsearch_timer);
					cList.incsearch_timer = false;
					cList.inc_search_noresult = false;
				}, 500);
			};
			break;
		case VK_ESCAPE:
		case 222:
			brw.tt_x = ((brw.w) / 2) - (((cList.search_string.length * 13) + (10 * 2)) / 2);
			brw.tt_y = brw.y + Math.floor((brw.h / 2) - 30);
			brw.tt_w = ((cList.search_string.length * 13) + (10 * 2));
			brw.tt_h = 60;
			cList.search_string = "";
			window.RepaintRect(0, brw.tt_y - 2, brw.w, brw.tt_h + 4);
			break;
		case VK_UP:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				var g_start_fix = g_start_ > 0 ? g_start_ + brw.totalColumns : 0;
				if(g_start_fix > g_end_) g_start_fix = g_end_;
				if(brw.selectedIndex > g_start_fix - 1 && brw.selectedIndex < g_end_ + 1)
					var act_idx = brw.selectedIndex;
				else if (brw.activeIndex > g_start_fix - 1 && brw.activeIndex < g_end_ + 1)
					var act_idx = brw.activeIndex;
				else {
					brw.activeIndex = g_start_fix;
					brw.selectedIndex = g_start_fix;
					brw.change_active_item();
					break;
				}
				var active_idx = act_idx - brw.totalColumns;
				if(active_idx > -1) {
					brw.selectedIndex = active_idx;
					brw.activeIndex = active_idx;
					brw.change_active_item();
					if(g_start_fix == 0) g_start_fix += brw.totalColumns;
					if(brw.selectedIndex < g_start_fix){
						scroll -= brw.rowHeight;
						scroll = check_scroll(scroll);
					}
				}
			}
			break;
		case VK_DOWN:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				var g_start_fix = g_start_ > 0 ? g_start_ + brw.totalColumns : 0;
				if(g_start_fix > g_end_) g_start_fix = g_end_;
				if(brw.selectedIndex > g_start_fix - 1 && brw.selectedIndex < g_end_ + 1)
					var act_idx = brw.selectedIndex;
				else if (brw.activeIndex > g_start_fix - 1 && brw.activeIndex < g_end_ + 1)
					var act_idx = brw.activeIndex;
				else {
					brw.activeIndex = g_start_fix;
					brw.selectedIndex = g_start_fix;
					brw.change_active_item();
					break;
				}
				var active_idx = act_idx + brw.totalColumns;
				if (active_idx > brw.groups.length - 1) active_idx = brw.groups.length - 1;
				if(active_idx > -1) {
					brw.selectedIndex = active_idx;
					brw.activeIndex = active_idx;
					brw.change_active_item();
					if(brw.selectedIndex > g_end_ - brw.totalColumns - 1){
						scroll += brw.rowHeight;
						scroll = check_scroll(scroll);
					}
				}
			}
			break;
		case VK_LEFT:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				var g_start_fix = g_start_ > 0 ? g_start_ + brw.totalColumns : 0;
				if(g_start_fix > g_end_) g_start_fix = g_end_;
				if(brw.selectedIndex > g_start_fix - 1 && brw.selectedIndex < g_end_ + 1)
					var act_idx = brw.selectedIndex;
				else if (brw.activeIndex > g_start_fix - 1 && brw.activeIndex < g_end_ + 1)
					var act_idx = brw.activeIndex;
				else {
					brw.activeIndex = g_start_fix;
					brw.selectedIndex = g_start_fix;
					brw.change_active_item();
					break;
				}
				var active_idx = act_idx - 1;
				if(active_idx > -1) {
					brw.selectedIndex = active_idx;
					brw.activeIndex = active_idx;
					brw.change_active_item();
					if(g_start_fix == 0) g_start_fix += brw.totalColumns;
					if(brw.selectedIndex < g_start_fix){
						scroll -= brw.rowHeight;
						scroll = check_scroll(scroll);
					}
				}
			}
			break;
		case VK_RIGHT:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				var g_start_fix = g_start_ > 0 ? g_start_ + brw.totalColumns : 0;
				if(g_start_fix > g_end_) g_start_fix = g_end_;
				if(brw.selectedIndex > g_start_fix - 1 && brw.selectedIndex < g_end_ + 1)
					var act_idx = brw.selectedIndex;
				else if (brw.activeIndex > g_start_fix - 1 && brw.activeIndex < g_end_ + 1)
					var act_idx = brw.activeIndex;
				else {
					brw.activeIndex = g_start_fix;
					brw.selectedIndex = g_start_fix;
					brw.change_active_item();
					break;
				}
				var active_idx = act_idx + 1;
				if (active_idx > brw.groups.length - 1) active_idx = brw.groups.length - 1;
				if(active_idx > -1) {
					brw.selectedIndex = active_idx;
					brw.activeIndex = active_idx;
					brw.change_active_item();
					if(brw.selectedIndex > g_end_ - brw.totalColumns - 1){
						scroll += brw.rowHeight;
						scroll = check_scroll(scroll);
					}
				}
			}
			break;
		case VK_PGUP:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				scroll -= brw.rowHeight * brw.totalRowsVis;
				scroll = check_scroll(scroll);
			};
			break;
		case VK_PGDN:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				scroll += brw.rowHeight * brw.totalRowsVis;
				scroll = check_scroll(scroll);
			};
			break;
		case VK_RETURN:
			if (brw.selectedIndex > -1) {
				if (ppt.sourceMode == 0) plman.ExecutePlaylistDefaultAction(g_active_playlist, 0);
				else plman.ExecutePlaylistDefaultAction(g_active_playlist, plman.GetPlaylistFocusItemIndex(g_active_playlist));
			};
			break;
		case VK_HOME:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				scroll -= brw.rowHeight * brw.rowsCount;
				scroll = check_scroll(scroll);
			};
			break;
		case VK_END:
			if (brw.rowsCount > 0 && !cScrollBar.timerID) {
				reset_cover_timers();
				scroll += brw.rowHeight * brw.rowsCount;
				scroll = check_scroll(scroll);
			};
			break;
		};
	} else {
		switch (mask) {
		case KMask.alt:
			if(vkey == 115) fb.RunMainMenuCommand("文件/退出");
			break;
		};
	};
};

function on_char(code) {
		g_filterbox.on_char(code);
	if (g_filterbox.inputbox.edit) {
	} else {
		if (brw.list.Count > 0) {
			brw.tt_x = ((brw.w) / 2) - (((cList.search_string.length * 13) + (10 * 2)) / 2);
			brw.tt_y = brw.y + Math.floor((brw.h / 2) - 30);
			brw.tt_w = ((cList.search_string.length * 13) + (10 * 2));
			brw.tt_h = 60;
			if (code == 32 && cList.search_string.length == 0) return true; // SPACE Char not allowed on 1st char
			if (cList.search_string.length <= 20 && brw.tt_w <= brw.w - 20) {
				if (code > 31) {
					cList.search_string = cList.search_string + String.fromCharCode(code);
					brw.repaint();
					cList.clear_incsearch_timer && window.ClearTimeout(cList.clear_incsearch_timer);
					cList.clear_incsearch_timer = false;
					cList.incsearch_timer && window.ClearTimeout(cList.incsearch_timer);
					cList.incsearch_timer = window.SetTimeout(function() {
						brw.incrementalSearch();
						window.ClearTimeout(cList.incsearch_timer);
						cList.incsearch_timer = false;
					}, 500);
				};
			};
		};
	};
};

//=================================================// Playback Callbacks

function on_playback_stop(reason) {
	brw.playingIndex = -1;
	brw.repaint();
};

function on_playback_new_track(metadb) {
	if(ppt.sourceMode == 0) {
		try{
			playing_title = fb.TitleFormat("$if2(%title%,%filename%)").EvalWithMetadb(fb.GetNowPlaying());
		} catch (e) {};
		return;	
	}
	try {
		if (!ppt.locklibpl) {//pure playlist mode
			if (plman.PlayingPlaylist != plman.ActivePlaylist) {
				brw.playingIndex = -1;
			} else {
				var handle = fb.GetNowPlaying();
				brw.FindItemFromItemHandle(handle, true);
			}
		} else {
			var handle = fb.GetNowPlaying();
			if (fb.IsMetadbInMediaLibrary(handle)) {
				brw.FindItemFromItemHandle(handle, true);
			};
		};
	}
	catch (e) {};
	try{
		playing_title = fb.TitleFormat("$if2(%title%,%filename%)").EvalWithMetadb(fb.GetNowPlaying());
	} catch (e) {};
	brw.repaint();
};

//================// Playlist Callbacks

function on_playlists_changed() {
	if (plman.PlaylistCount > 0 && (plman.ActivePlaylist < 0 || plman.ActivePlaylist > plman.PlaylistCount - 1)) {
		plman.ActivePlaylist = 0;
	};
	if (!ppt.locklibpl && g_active_playlist != plman.ActivePlaylist) {
		g_active_playlist = plman.ActivePlaylist;
	};

	if (ppt.locklibpl) {
		if (plman.GetPlaylistName(0) != "媒体库") {
			ppt.locklibpl = false;
			g_active_playlist = plman.ActivePlaylist;
			window.NotifyOthers("lock_lib_playlist", ppt.locklibpl);
			window.SetProperty("_PROPERTY: Lock to Library playlist", ppt.locklibpl);
		}
	}
	// refresh playlists list
	pman.populate(exclude_active = false, reset_scroll = false);
};

function on_playlist_switch() {
	if (!ppt.locklibpl) {
		g_active_playlist = plman.ActivePlaylist;
		if(g_active_playlist != plman.PlayingPlaylist) brw.playingIndex = -1;
	}
	if (ppt.sourceMode == 1 && !ppt.locklibpl) {
		scroll = scroll_ = 0;
		brw.populate();
	};
	// refresh playlists list
	pman.populate(exclude_active = false, reset_scroll = false);
};

function on_playlist_items_added(playlist_idx) {
	g_avoid_on_playlist_items_removed = false;
	if (ppt.sourceMode == 1) {
		if (playlist_idx == g_active_playlist) {
			brw.populate();
		};
	};
};

function on_playlist_items_removed(playlist_idx, new_count) {

	if (g_avoid_on_playlist_items_removed) return;

	if (playlist_idx == g_active_playlist && new_count == 0) scroll = scroll_ = 0;

	if (ppt.sourceMode == 1) {
		if (playlist_idx == g_active_playlist) {
			brw.populate();
		};
	};
};

function on_playlist_items_reordered(playlist_idx) {
	if (ppt.sourceMode == 1) {
		if (playlist_idx == g_active_playlist) {
			brw.populate();
		};
	};
};


function on_item_focus_change(playlist_idx, from, to) {
	if (g_avoid_on_item_focus_change) {
		g_avoid_on_item_focus_change = false;
		return;
	};
	if(!brw.list) return;
	if (ppt.sourceMode == 1) {
		if (playlist_idx == g_active_playlist) {//当fb活动列表与右栏列表一致时
			var handle = fb.GetFocusItem();
			brw.showItemFromItemHandle(handle);
		};
	};
};

function on_metadb_changed(handles, fromhook) {
	if(!fromhook) {
		var _repaint = false; 
		for (var i = 0; i < handles.Count; i++) {
			var found = -1;
			for (var j = 1; j < brw.groups.length; j++) {
				var _same = brw.groups[j].metadb.Compare(handles[i]);
				if (_same) {
					found = j;
					if(j >= g_start_ && j <= g_end_) _repaint = true;
					break;
				}
			}
			if(found > -1){
				brw.groups[found].load_requested = 0;
				brw.groups[found].cover_img = null;
			}
		}
		if(_repaint) brw.repaint();
	}
};

function on_playlist_items_selection_change() {
	if (ppt.sourceMode == 1) brw.repaint();
};

function on_focus(is_focused) {
	g_filterbox.on_focus(is_focused);
};

//=================================================// Custom functions

function match(input, str) {
	var temp = "";
	input = input.toLowerCase();
	for (var j in str) {
		if (input.indexOf(str[j]) < 0) return false;
	};
	return true;
};

function process_string(str) {
	str_ = [];
	str = str.toLowerCase();
	while (str != (temp = str.replace("  ", " ")))
	str = temp;
	var str = str.split(" ").sort();
	for (var i in str) {
		if (str[i] != "") str_[str_.length] = str[i];
	};
	return str_;
};

function check_scroll(scroll___) {
	if (scroll___ < 0) scroll___ = 0;
	var end_limit = (brw.rowsCount * ppt.rowHeight) - brw.scrollbar.totalRowsVish;
	if (scroll___ != 0 && scroll___ > end_limit) {
		scroll___ = end_limit;
	};
	return scroll___;
};

function g_sendResponse() {
	if (g_filterbox.inputbox.text.length == 0) {
		filter_text = "";
	} else {
		filter_text = g_filterbox.inputbox.text;
	};

	// filter in current panel
	brw.populate();
};

function on_font_changed() {
	get_font();
	get_metrics();
	get_images();
	get_images_loading();
	g_filterbox.inputbox.FontUpdte();
	g_filterbox.getImages();
	g_filterbox.setSize(cFilterBox.w, cFilterBox.h);
	brw.init_swbtn();
	brw.repaint();
};

function on_colours_changed() {
	get_colors();
	get_images();
	get_images_static();
	get_images_loading();
	if (brw)
		brw.scrollbar.setNewColors();
	g_filterbox.getImages();
	g_filterbox.reset_colors();
	brw.reset_swbtn();
	refresh_cover();
};

function on_notify_data(name, info) {
	switch (name) {
	case "color_scheme_updated":
		if(!info) {
			g_color_highlight = c_default_hl;
			g_color_normal_bg = g_color_normal_bg_default;
			g_color_selected_bg = g_color_selected_bg_default;
		} else {
			g_color_highlight = RGB(info[0], info[1], info[2]);
			if(info.length > 3) {
				g_color_normal_bg = RGB(info[3], info[4], info[5]);
				g_color_selected_bg = RGB(info[6], info[7], info[8]);
				g_color_grid_bg = g_color_normal_bg & 0x60ffffff;
			}
		}
		repaint_main1 = repaint_main2;
		get_images_loading();
		break;
	case "show_Now_Playing":
		brw.showNowPlaying();
		break;
	case "set_dir_name":
		dir_cover_name = info;
		window.SetProperty("foobox.cover.folder.name", dir_cover_name);
		if(ppt.tagMode == 3){
			brw.populate();
		}
		break;
	case "scrollbar_width":
		sys_scrollbar = info;
		window.SetProperty("foobox.ui.scrollbar.system", sys_scrollbar);
		cScrollBar.width = sys_scrollbar ? get_system_scrollbar_width() : 12*zdpi;
		cScrollBar.maxCursorHeight = sys_scrollbar ? 125*zdpi : 110*zdpi;
		get_metrics();
		brw.scrollbar.updateScrollbar();
		brw.scrollbar.setSize();
		brw.repaint();
		break;
	case "alb_ignoring_art":
		albcov_lt = info;
		window.SetProperty("Album.cover.ignoring.artist", albcov_lt);
		get_tagprop();
		if(ppt.tagMode == 1){
			brw.populate();
		}
		break;
	case "set_cache_size":
		ppt.cache_size = info;
		window.SetProperty("Cover image cache dimension (100-1000)", ppt.cache_size);
		break;
	};
};

// ======================================================================================================================= //

function path_img(path) {
	var file_ext =path.substring(path.length - 4);
	if(file_ext == ".jpg" || file_ext == ".png") return true;
	else return false;
}

function check_cache(albumIndex) {
	var crc = brw.groups[albumIndex].cachekey;
	if (utils.FileExists(CACHE_FOLDER + ppt.cache_subdir + crc + ".jpg")) {
		return true;
	}
	return false;
};

const load_image_from_cache = async (albumIndex, preload) =>
{
	try{
		var crc = brw.groups[albumIndex].cachekey;
		const image = await gdi.LoadImageAsyncV2(0, CACHE_FOLDER + ppt.cache_subdir + crc + ".jpg");
		brw.groups[albumIndex].cover_img = g_image_cache.getit(albumIndex, image, false);
		if (!preload && albumIndex >= g_start_ && albumIndex <= g_end_) {
			if (!timers.coverDone) {
				timers.coverDone = setInterval(() => {
					brw.repaint();
					clearInterval(timers.coverDone);
					timers.coverDone = false;
				}, 2);
			};
		}
	} catch(e){}
};

const get_album_art_async = async (albumIndex) =>
{
	try{
		let result = await utils.GetAlbumArtAsyncV2(0, brw.groups[albumIndex].metadb, ppt.albumArtId, false);
		let img = result.image;
		if(img){
			let s = Math.min(ppt.cache_size / img.Width, ppt.cache_size / img.Height);
			if(s < 1){
				let w = Math.floor(img.Width * s);
				let h = Math.floor(img.Height * s);
				img = img.Resize(w, h, 2);
			}
		}
		brw.groups[albumIndex].cover_img = g_image_cache.getit(albumIndex, img, true);
		if (albumIndex >= g_start_ && albumIndex <= g_end_) {
			if (!timers.coverDone) {
				timers.coverDone = setInterval(() => {
					brw.repaint();
					clearInterval(timers.coverDone);
					timers.coverDone = false;
				}, 10);
			};
		}
    } catch(e){}
};

function get_tagprop(){
	switch (ppt.tagMode) {
	case 1:
		ppt.albumArtId = 0;
		if(ppt.albumMode == 0){
			ppt.tf_groupkey = fb.TitleFormat("%album artist% ^^ %album% ## %title%");
			ppt.TFsorting = "%album artist% | $if(%album%,%date%,'9999') | %album% | %discnumber% | %tracknumber% | %title%";
			if(albcov_lt){
				ppt.cache_subdir = "\\album\\";
				ppt.tf_crc = fb.TitleFormat("$crc32('alb'%album%)");
				crcidx = 1;
			}else{
				ppt.cache_subdir = "\\artist_album\\";
				ppt.tf_crc = fb.TitleFormat("$crc32('aa'%album artist%-%album%)");
				crcidx = 0;
			}
		} else {
			ppt.cache_subdir = "\\album\\";
			ppt.TFsorting = "%album% | %discnumber% | %tracknumber% | %title%";
			ppt.tf_groupkey = fb.TitleFormat("$if2(%album%,单曲) ## %title%");
			ppt.tf_crc = fb.TitleFormat("$crc32('alb'%album%)");;
			crcidx = 1;
		}
		
		
		ppt.tf_autopl = "%album%";
		window.NotifyOthers("lib_cover_type", ppt.tagMode);//1
		break;
	case 2:
		ppt.albumArtId = 4;
		ppt.cache_subdir = "\\artist\\";
		if(ppt.artistMode == 0){
			ppt.TFsorting = "%album artist% | $if(%album%,%date%,'9999') | %album% | %discnumber% | %tracknumber% | %title%";
			ppt.tf_groupkey = fb.TitleFormat("$if2(%album artist%,未知艺术家) ## %title%");
			ppt.tf_autopl = "%album artist%";
			ppt.tf_crc = fb.TitleFormat("$crc32('art'%album artist%)");
		} else {
			ppt.TFsorting = "%artist% | $if(%album%,%date%,'9999') | %album% | %discnumber% | %tracknumber% | %title%";
			ppt.tf_groupkey = fb.TitleFormat("$if2(%artist%,未知艺术家) ## %title%");
			ppt.tf_autopl = "%artist%";
			ppt.tf_crc = fb.TitleFormat("$crc32('art'%artist%)");
		}
		crcidx = 2;
		window.NotifyOthers("lib_cover_type", ppt.tagMode + ppt.artistMode);//2,3
		break;
	case 3:
		ppt.albumArtId = 5;
		ppt.cache_subdir = "\\genre_dir\\";
		ppt.TFsorting = "$directory_path(%path%) | %album artist% | $if(%album%,%date%,'9999') | %album% | %discnumber% | %tracknumber% | %title%";
		ppt.tf_groupkey = fb.TitleFormat("$directory_path(%path%) ## %title%");
		ppt.tf_autopl = "%directoryname%";
		ppt.tf_crc = fb.TitleFormat("$crc32($directory_path(%path%))");
		crcidx = 3;
		window.NotifyOthers("lib_cover_type", ppt.tagMode + ppt.dirMode + 2);//5,6
		break;
	case 4:
		ppt.albumArtId = 5;
		ppt.cache_subdir = "\\genre_dir\\";
		ppt.TFsorting = "%genre% | %album artist% | $if(%album%,%date%,'9999') | %album% | %discnumber% | %tracknumber% | %title%";
		ppt.tf_groupkey = fb.TitleFormat("$if2(%genre%,未知流派) ## %title%");
		ppt.tf_autopl = "%genre%";
		ppt.tf_crc = fb.TitleFormat("$crc32('gen'%genre%)");
		crcidx = 3;
		window.NotifyOthers("lib_cover_type", ppt.tagMode);//4
		break;
	}
	
	load_image_to_cache();
}

function process_cachekey(str) {
	var str_return = "";
	str = str.toLowerCase();
	var len = str.length;
	for (var i = 0; i < len; i++) {
		var charcode = str.charCodeAt(i);
		if (charcode > 96 && charcode < 123) str_return += str.charAt(i);
		if (charcode > 47 && charcode < 58) str_return += str.charAt(i);
	};
	return str_return;
};

function reset_this_cache(idx, crc){
	if (utils.FileExists(CACHE_FOLDER + ppt.cache_subdir + crc + ".jpg")) {
		try {
			fso.DeleteFile(CACHE_FOLDER + ppt.cache_subdir + crc + ".jpg");
		}
		catch (e) {
			console.log("错误: 图像缓存 [" + crc + "] 无法删除, 文件正在使用中,稍后重试或重载面板.");
		};
	};
	brw.groups[idx].load_requested = 0;
	g_image_cache.reset(crc);
	brw.groups[idx].cover_img = null;
	var indexid = crclist[crcidx].indexOf(crc);
	if(indexid >= 0){
		crclist[crcidx].splice(indexid, 1);
		crcmod[crcidx] = true;
	}
}

function refresh_cover(resetcache) {
	if(resetcache) g_image_cache = new image_cache;
	var total = brw.groups.length;
	for (var i = 0; i < total; i++) {
		brw.groups[i].load_requested = 0;
		brw.groups[i].cover_img = null;
	};
	brw.repaint();
}