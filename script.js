'use strict';

(function () {
  
  var TextInput = function($parent) {
    this.$textEditor = document.createElement('textarea');
    this.$textEditor.classList.add('tileInput');
    this.currentValue = '';
    this.x = 0;
    this.y = 0;
    this.hide();
    $parent.appendChild(this.$textEditor);
    this.attachListener();
  };

  TextInput.prototype.attachListener = function() {
    var self = this;
    this.$textEditor.addEventListener('keypress', function(event) {
      if (event.keyCode === 13) {
        self.hide();
        var event = new CustomEvent('updateCell', {
          'detail': {
            'value': event.target.value,
            'row': self.row,
            'col': self.col
          }
        });
        document.dispatchEvent(event);
        self.clear();
      }
    });

    this.$textEditor.addEventListener('blur',  function(event) {
      if (event.target.classList.contains('hide')) return;
      self.hide();
      var event = new CustomEvent('updateCell', {
        'detail': {
          'value': event.target.value,
          'row': self.row,
          'col': self.col
        }
      });
      document.dispatchEvent(event);
      self.clear();
    });
  };

  TextInput.prototype.show = function() {
    this.$textEditor.classList.remove('hide');
  };

  TextInput.prototype.hide = function() {
    this.$textEditor.classList.add('hide');
  };

  TextInput.prototype.clear = function() {
    this.$textEditor.value = '';
  };

  TextInput.prototype.setValue = function(value) {
    this.currentValue = value;
    this.$textEditor.value = value;
  };

  TextInput.prototype.getValue = function() {
    return this.currentValue;
  };

  TextInput.prototype.setPosition = function(x, y, value) {
    this.row = y;
    this.col = x;
    this.$textEditor.style.top = y * 22;
    this.$textEditor.style.left = x * 89;
    this.show();
    this.setValue(value);
    this.$textEditor.focus();
  };










  var Excel = function(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.clickCount = 0;
    this.$container = document.getElementById('container');
    this.$board = document.createElement('table');
    this.$board.classList.add('tileTable');
    this.textInput = new TextInput(this.$container);
    this.currentSelectedCell = null;

    this.selectedCells = [];
  };

  Excel.prototype.render = function() {
    var $tr, $td;
    var data = JSON.parse(localStorage.getItem('data') || '{}');
    for (var i=0; i<this.rows; i++) {
      $tr = document.createElement('tr');
      for (var j=0; j<this.cols; j++) {
        $td = document.createElement('td');
        $td.classList.add('tile');
        $td.innerHTML = (data[i] && data[i][j]) ? data[i][j] : '';
        $tr.appendChild($td);
      }
      this.$board.appendChild($tr);
    }
    this.$container.appendChild(this.$board);
    this.attachListener();
  };

  Excel.prototype.updateCell = function(row, col, value) {
    this.$board.rows[row].cells[col].innerHTML = value;
    var data = JSON.parse(localStorage.getItem('data') || '{}');
    if (!data[row]) data[row] = {};
    data[row][col] = value;
    localStorage.setItem('data', JSON.stringify(data));
  };

  Excel.prototype.setCurrentCell = function($target) {
    this.currentSelectedCell && this.currentSelectedCell.classList.remove('current');
    $target.classList.add('current');
    this.currentSelectedCell = $target;
  };

  Excel.prototype.attachListener = function() {
    var self = this,
      singleClickTimer,
      isMouseDown = false,
      isHighlighted;

    var singleClick = function($target) {
      
    };

    var doubleClick = function($target) {
      var x = $target.cellIndex;
      var y = $target.parentNode.rowIndex;
      var value = $target.innerHTML;
      this.textInput.setPosition(x, y, value);
    };

    this.$board.addEventListener('click', function(event) {
      var $target = event.target;
      self.clickCount++;
      if (self.clickCount === 1) {
        singleClickTimer = setTimeout(function() {
          self.clickCount = 0;
          singleClick.call(self, $target);
        }, 200);
      } else if (self.clickCount === 2) {
        clearTimeout(singleClickTimer);
        self.clickCount = 0;
        doubleClick.call(self, $target);
      }
    });

    this.$board.addEventListener('mousedown', function(event) {
      var $target = event.target;
      var x = $target.cellIndex;
      var y = $target.parentNode.rowIndex;
      isMouseDown = true;
      self.setCurrentCell.call(self, $target);

      self.selectedCells.forEach(function(el) {
        el.classList.remove('highlighted');
      });
      self.selectedCells = [$target];
      self.actions.setPosition(x, y);
      return false;
    });

    this.$board.addEventListener('mouseover', function(event) {
      var $target = event.target;
      if (self.currentSelectedCell && $target.cellIndex !== self.currentSelectedCell.cellIndex) return;
      if (isMouseDown) {
        $target.classList.add('highlighted');
        self.selectedCells.push($target);
      }
    });

    this.$board.addEventListener('mouseup', function(event) {
      isMouseDown = false;
    });


    document.addEventListener('cut', function(event) {
      var copiedData = [], row, col;
      for (var i=0; i<self.selectedCells.length; i++) {
        copiedData.push(self.selectedCells[i].innerHTML);
        row = self.selectedCells[i].parentNode.rowIndex;
        col = self.selectedCells[i].cellIndex;
        self.updateCell(row, col, '');
      }
      event.clipboardData.setData('text/plain', JSON.stringify(copiedData));
      event.preventDefault();
    });

    document.addEventListener('copy', function(event) {
      var copiedData = [];
      for (var i=0; i<self.selectedCells.length; i++) {
        copiedData.push(self.selectedCells[i].innerHTML);
      }
      event.clipboardData.setData('text/plain', JSON.stringify(copiedData));
      event.preventDefault();
    });

    document.addEventListener('paste', function(event) {
      if (event.target.classList.contains('tile') || event.target.tagName === 'TABLE') {
        var data = JSON.parse(event.clipboardData.getData('text'));
        var row = self.currentSelectedCell.parentNode.rowIndex;
        var col = self.currentSelectedCell.cellIndex;
        for (var i=0; i< data.length; i++) {
          if (row >= self.rows) break;
          self.updateCell(row++, col, data[i]);
        }
      }
      event.preventDefault();
    });

    document.addEventListener('updateCell', function(event) {
      self.updateCell(event.detail.row, event.detail.col, event.detail.value);
    }, false);

    this.actions.$rowActions.addEventListener('click', function(event) {
      var $target = event.target;
      var action = $target.dataset.action;
      if (action === 'add') {
        self.addRow.call(self);
      } else if (action === 'delete') {
        self.deleteRow.call(self);
      }
      self.actions.hide();
    });

    this.actions.$colActions.addEventListener('click', function(event) {
      var $target = event.target;
      var action = $target.dataset.action;
      if (action === 'add') {
        self.addColumn.call(self);
      } else if (action === 'delete') {
        self.deleteColumn.call(self);
      }
      self.actions.hide();
    });
  };

  Excel.prototype.addRow = function() {
    var row = this.currentSelectedCell.parentNode.rowIndex;
    var newRow = this.$board.insertRow(row);
    var newCell;
    for (var i=0; i<this.cols; i++) {
      newCell = newRow.insertCell(0);
      newCell.classList.add('tile');
    }
    this.rows++;
  };

  Excel.prototype.deleteRow = function() {
    var row = this.currentSelectedCell.parentNode.rowIndex;
    this.$board.deleteRow(row);
    this.rows--;
  };

  Excel.prototype.addColumn = function() {
    var col = this.currentSelectedCell.cellIndex;
    var newCell;
    for (var i=0; i<this.rows; i++) {
      newCell = this.$board.rows[i].insertCell(col);
      newCell.classList.add('tile');
    }
    this.cols++;
  };

  Excel.prototype.deleteColumn = function() {
    var col = this.currentSelectedCell.cellIndex;

    for (var i=0; i< this.rows; i++) {
      this.$board.rows[i].deleteCell(col);
    }
    this.cols--;
  };

  Excel.prototype.actions = {
    $rowActions: document.querySelector('.rowActions'),
    $colActions: document.querySelector('.colActions'),
    setPosition: function(x, y) {
      this.$rowActions.style.top = y * 22;
      this.$colActions.style.left = x * 89;
      this.show();
    },

    show: function() {
      this.$rowActions.classList.remove('hide');
      this.$colActions.classList.remove('hide');
    },

    hide: function() {
      this.$rowActions.classList.add('hide');
      this.$colActions.classList.add('hide');
    }
  };


  var ex = new Excel(20, 13);
  ex.render();

})();