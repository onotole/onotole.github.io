GridController = function(grid, streams, player) {
    const COLUMNS = 4;

    var _grid = grid, _streams = streams, _player = player, _active = undefined,
        _rows = Math.floor(_streams.length / COLUMNS) + (_streams.length % COLUMNS ? 1 : 0);

    const KEY_OK            = 13;
    const KEY_BACK          = 27;
    const KEY_LEFT          = 37;
    const KEY_RIGHT         = 39;
    const KEY_UP            = 38;
    const KEY_DOWN          = 40;
    const KEY_REWIND        = 227;
    const KEY_FASTFORWARD   = 228;
    const KEY_PLAY          = 179;
    const KEY_INFO          = 116;

    function _element(idx) {
        var row = Math.floor(idx / COLUMNS), col = idx % COLUMNS;     
        return _grid.childNodes[row].childNodes[col];
    };

    function _activate(idx) {
        if (idx === _active) return;
        try {  _element(_active).className = "grid_element inactive"; } catch (e) {};
        _active = idx;
        _element(_active).className = "grid_element active";
        _player.load({url: _streams[_active].url});
        _player.play();
    };
    
    function _left(idx) {
        var row = Math.floor(idx / COLUMNS), col = (idx + COLUMNS - 1) % COLUMNS;
        _element(COLUMNS * row + col).focus();
    };

    function _right(idx) {
        var row = Math.floor(idx / COLUMNS), col = (idx + 1) % COLUMNS;
        _element(COLUMNS * row + col).focus();
    };

    function _up(idx) {
        var row = (Math.floor(idx / COLUMNS) + _rows - 1) % _rows, col = idx % COLUMNS;
        _element(COLUMNS * row + col).focus();
    };

    function _down(idx) {
        var row = (Math.floor(idx / COLUMNS) + 1) % _rows, col = idx % COLUMNS;
        _element(COLUMNS * row + col).focus();
    };

    function _keypress(idx, key) { 
        switch (key) {
            case KEY_OK: _activate(idx); break;
            case KEY_LEFT: _left(idx); break;
            case KEY_RIGHT: _right(idx); break;
            case KEY_UP: _up(idx); break;
            case KEY_DOWN: _down(idx); break;
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
            this.focus();
        };
        div.onkeypress = function(evt) {
            _keypress(this.tabIndex, evt.keyCode);
        };
        row.appendChild(div);
    });

    try {
    	_grid.appendChild(row);
        _element(0).focus();
    } catch (e) {};

    function _filter(f) {
    };
    
    return {
	filter: function(f) {
            _filter.call(this);
        }
    };
};
