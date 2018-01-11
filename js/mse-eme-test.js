VideoTagAdapter = function(tag) {

    var _tag = tag,
        _event_map = {};

    try{ _tag.src = null; _tag.load(); } catch(e) {};

    _tag.addEventListener("error", function(evt){
         console.log("Error: " + evt);
    }, false);

    _tag.addEventListener("playing", function(){
         if (_event_map["state_changed"]) {
             _event_map["state_changed"]({detail: {type: "video", state: "playing"}});
         }
    }, false);

    _tag.addEventListener("pause", function(){
         if (_event_map["state_changed"]) {
             _event_map["state_changed"]({detail: {type: "video", state: "paused"}});
         }
    }, false);

    _tag.addEventListener("seeking", function(){
         if (_event_map["state_changed"]) {
             _event_map["state_changed"]({detail: {type: "video", state: "seeking"}});
         }
    }, false);

    _tag.addEventListener("ended", function(){
         if (_event_map["state_changed"]) {
             _event_map["state_changed"]({detail: {type: "video", state: "stopped"}});
         }
    }, false);

    return {
        load: function(stream) {
            while(_tag.firstChild) { _tag.removeChild(_tag.firstChild); };
            var src = document.createElement("source");
            src.src = stream.url;
            switch (stream.format) {
                case "MS-SSTR": src.type = "application/vnd.ms-sstr+xml"; break;
                case "MPEG-Dash": src.type = "application/dash+xml"; break;
            }
            _tag.appendChild(src);
            _tag.load();
            _tag.play();
        },
        stop: function() {
            _tag.src = null;
            _tag.load();
        },
        play: function() {
            _tag.play();
        },
        pause: function() {
            _tag.pause();
        },
        seek: function(pos) {
            _tag.currentTime = pos;
        },
        getPosition: function() {
            return _tag.currentTime;
        },
        addEventListener: function(evt, handler) {
            _event_map[evt] = handler;
        },
    };
};

GridController = function(streams, tag) {
    const COLUMNS = 4;

    var _tag = tag,
        _streams = streams,
        _player = new MediaPlayer,
        _active = undefined,
        _rows = Math.floor(_streams.length / COLUMNS) + (_streams.length % COLUMNS ? 1 : 0),
        _last_row = _streams.length % COLUMNS ? _streams.length % COLUMNS : COLUMNS;
        _grid = document.getElementById("grid"),
        _stream_info = document.getElementById("left"),
        _playback_info = document.getElementById("right"),
        _player_state = "stopped",
        _video_width = 0, _video_height = 0, _video_bitrate = 0,
        _errors = [], // { t: "(warn | err)", m: "Error message", d: "{"extra": "info"}" }
        _streaming_mode = "MSE/EME",
        _title = document.getElementById("title");
    
     _player.init(_tag);

     _stream_info.style.marginTop = "50px";

    function _update_playback_info() {
        _playback_info.innerHTML = "";
        _playback_info.style.color = "white";
        function add_info_line(info) {
            var p = document.createElement("p");
            p.style.marginTop = p.style.marginBottom = "0px";
            p.style.fontSize = "medium";
            p.innerHTML = info;
            _playback_info.appendChild(p);
        }
        add_info_line("state: " + _player_state);
        add_info_line("quality: " + _video_width + "x" + _video_height + " @ " + _video_bitrate);
        add_info_line("==============================");
        for (var e in _errors) {
            var p = document.createElement("p");
            p.style.color = _errors[e].t === "warn" ? "orange" : "red";
            p.style.marginTop = p.style.marginBottom = "0px";
            p.style.fontSize = "small";
            p.innerHTML = _errors[e].m;
            if (_errors[e].d)
                p.innerHTML += " " + JSON.stringify(_errors[e].d);
            _playback_info.appendChild(p);
        }
    };

    function _subscribe_events() {
        _player.addEventListener("error", function(evt) {
            _errors.push({ t: "err", m: evt.data.message, d: evt.data.data });
            _update_playback_info();
        });
        _player.addEventListener("warning", function(evt) {
            _errors.push({ t: "warn", m: evt.data.message, d: evt.data.data });
            _update_playback_info();
        });
        _player.addEventListener("state_changed", function(evt) {
            if (evt.detail.type === "video")
                _player_state = evt.detail.state;
            _update_playback_info();
        });
        _player.addEventListener("play_bitrate", function(evt) {
            const _K = 1024;
            const _M = _K*_K;
            if (evt.detail.type === "video") {
                _video_width = evt.detail.width;
                _video_height = evt.detail.height;
                _video_bitrate = evt.detail.bitrate;
                if (_video_bitrate >= _M) _video_bitrate = (_video_bitrate / _M).toFixed(3) + "M";
                else if (_video_bitrate >= _K) _video_bitrate = (_video_bitrate / _K).toFixed(3) + "K";
            }
            _update_playback_info();
        });
    }

    const KEY_OK            = 13;
    const KEY_BACK          = 27;
    const KEY_LEFT          = 37;
    const KEY_RIGHT         = 39;
    const KEY_UP            = 38;
    const KEY_DOWN          = 40;
    const KEY_REWIND        = 112;
    const KEY_FASTFORWARD   = 114;
    const KEY_PLAY          = 113;
    const KEY_INFO          = 116;

    function _update_stream_info(idx) {
        var s = _streams[idx];
        _stream_info.innerHTML = "";
        _stream_info.style.color = idx === _active ? "orange" : "white";
        function add_attribute(attr) {
            var p = document.createElement("p");
            p.innerHTML = attr + ": " + s[attr];
            _stream_info.appendChild(p);
        };
        add_attribute("name");
        add_attribute("format");
        add_attribute("protection");
        add_attribute("type");
    };

    function _element(idx) {
        var row = Math.floor(idx / COLUMNS), col = idx % COLUMNS;
        return _grid.childNodes[row].childNodes[col];
    };

    function _columns(row) {
        return row == _rows - 1 ? _last_row : COLUMNS;
    };

    function _activate(idx) {
        if (idx === _active) return;
        try { _element(_active).className = "grid_element inactive"; } catch (e) {};
        _active = idx;
        _update_stream_info(idx);
        _element(_active).className = "grid_element active";
        _player_state = "stopped";
        _player.load({url: _streams[_active].url, format: _streams[_active].format});
        //_player.load({url: _streams[_active].url, protData: {"com.microsoft.playready": {cdmData: "DEADBEEF"}}});
        _errors.length = 0;
        _video_width = _video_height = _video_bitrate = 0;
        _update_playback_info();
    };

    function _focus(row, col) {
        var idx = typeof col === "undefined" ? row : COLUMNS * row + col;
        _element(idx).focus();
        _update_stream_info(idx);
    }
    
    function _left(idx) {
        var row = Math.floor(idx / COLUMNS), col = idx % COLUMNS;
        col = (col + _columns(row) - 1) % _columns(row);
        _focus(row, col);
    };

    function _right(idx) {
        var row = Math.floor(idx / COLUMNS), col = idx % COLUMNS;
        col = (col + 1) % _columns(row);
        _focus(row, col)
    };

    function _up(idx) {
        var row = (Math.floor(idx / COLUMNS) + _rows - 1) % _rows, col = idx % COLUMNS;
        _focus(row, col);
    };

    function _down(idx) {
        var row = (Math.floor(idx / COLUMNS) + 1) % _rows, col = idx % COLUMNS;
        _focus(row, col);
    };

    function _rewind() {
        _player.seek(_player.getPosition() - 10);
    };

    function _fast_forward() {
        _player.seek(_player.getPosition() + 10);
    };

    function _toggle_play() {
       if (_player_state === "playing") _player.pause();
       else _player.play();
    };

    function _toggle_streaming_mode() {
        if (_streaming_mode == "MSE/EME")
            _streaming_mode = "Native";
        else
            _streaming_mode = "MSE/EME";
        _title.innerHTML = "*[" + _streaming_mode + "] Streaming Test Suite";
        try {_player.stop();} catch(e) {};
        if (_streaming_mode == "MSE/EME") {
            _player = new MediaPlayer;
            _player.init(_tag);
            _subscribe_events();
        } else {
            _player = new VideoTagAdapter(_tag);
            _subscribe_events();
        }
        _activate(-1);
    };

    function _keypress(idx, key) { 
        switch (key) {
            case KEY_OK: _activate(idx); break;
            case KEY_LEFT: _left(idx); break;
            case KEY_RIGHT: _right(idx); break;
            case KEY_UP: _up(idx); break;
            case KEY_DOWN: _down(idx); break;
            case KEY_PLAY: _toggle_play(); break;
            case KEY_REWIND: _rewind(); break;
            case KEY_FASTFORWARD: _fast_forward(); break;
            case KEY_PLAY: _toggle_play(); break;
            case KEY_INFO: _toggle_streaming_mode(); break;
        }
    };

    var idx = 0, row;
    _streams.forEach(function(str) {
        if (!(idx % COLUMNS)) {
	    if (row) _grid.appendChild(row);
            row = document.createElement("div");
            row.className = "grid_row";
        }
        var div = document.createElement("div");
        div.className = "grid_element inactive";
        div.tabIndex = idx++;
        div.innerHTML = str.name;
        div.stream = str;
        div.onclick = function() {
            _focus(this.tabIndex);
        };
        div.onkeypress = function(evt) {
            _keypress(this.tabIndex, evt.keyCode);
        };
        row.appendChild(div);
    });

    try {
        _subscribe_events();
    	_grid.appendChild(row);
        _focus(0);
    } catch (e) {};

    return {};
};
