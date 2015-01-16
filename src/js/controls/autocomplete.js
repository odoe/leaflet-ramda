export default L;

import L from 'leaflet';
import R from 'ramda';
import debounce from 'lodash.debounce';

var compose = R.compose;
var curry = R.curry;
var get = R.get;
var filter = R.filter;
var map = R.map;
var eq = R.eq;
var take = R.take;
var last = R.last;
var sortBy = R.sortBy;

var isValid = (a, b) => a.indexOf(b) > -1;
var getName = get('NAME');
var getProps = get('properties');
var getPropName = compose(getName, getProps);

var upper = function(s) {
  return s.toUpperCase();
};

var filtername = function(name) {
  return filter(x => eq(upper(getPropName(x)), upper(name)));
};
var fuzzyname = function(name) {
  return filter(x => isValid(upper(getName(x)), upper(name)));
};
var getfuzzyname = function(name) {
  return compose(fuzzyname(name), map(getProps));
};

var makeListItem = function(x) {
  var a = L.DomUtil.create('a', 'list-group-item');
  a.href = '';
  a.setAttribute('data-result-name', getName(x));
  a.innerHTML = getName(x);
  return a;
};

// heavy influence from Leaflet.Control.Geocoder
// https://github.com/perliedman/leaflet-control-geocoder
L.Control.AutoComplete = L.Control.extend({
  options: {
    position: 'topright',
    placeholder: 'Search...'
  },

  rawdata: [],
  data: null,

  layerLoaded: false,

  initialize: function (options) {
    L.Util.setOptions(this, options);
    if (options.layer) {
      options.layer.on('createfeature', this.featureAdded, this);
      options.layer.on('load', this.layerLoad, this);
    }
  },

  onAdd: function (m) {
    var container = L.DomUtil.create('div', 'auto-complete-container');
    var form = this._form = L.DomUtil.create('form', 'form', container);
    var group = L.DomUtil.create('div', 'form-group', form);
    var input =
      this._input =
      L.DomUtil.create('input', 'form-control input-sm', group);
    input.type = 'text';
    input.placeholder = this.options.placeholder;
    this._results = L.DomUtil.create('div', 'list-group', group);
    L.DomEvent.addListener(input, 'keyup', debounce(this.keyup, 300), this);
    L.DomEvent.addListener(form, 'submit', this.find, this);
    L.DomEvent.disableClickPropagation(container);
    return container;
  },

  onRemove: function(m) {
    L.DomEvent.removeListener(this._input, 'keyup', this.keyup, this);
    L.DomEvent.removeListener(form, 'submit', this.find, this);
  },

  keydown: function(e) {
    console.debug('keycode', e);
    switch(e.keyCode) {
      case 38: //up
        this.select(1);
        console.debug('key up', e);
        break;
      case 40: //down
        this.select(-1);
        console.debug('key down', e);
        break;
      default:
        console.debug('key default');
    }
  },

  select: function(i) {
    this._count = this._count - i;
    if (this._count < 0) this._count = this.resultElems.length - 1;
    if (this._count > this.resultElems.length - 1) this._count = 0;
    if (this._selection) {
      L.DomUtil.removeClass(this._selection, 'active');
      this._selection = this.resultElems[this._count];
    }
    if (!this._selection) {
      this._selection = this.resultElems[this._count];
      L.DomUtil.addClass(this._selection, 'active');
    }
    if (this._selection) {
      L.DomUtil.addClass(this._selection, 'active');
    }
  },

  keyup: function(e) {
    if (e.keyCode === 38 || e.keyCode === 40) {
      this.keydown(e);
    } else {
      this._results.innerHTML = '';
      if (this._input.value.length > 2) {
        var results = getfuzzyname(this._input.value)(this.data);
        this.resultElems = compose(map(x => {
          this._results.appendChild(x);
          L.DomEvent.addListener(x, 'click', this.itemSelected, this);
          return x;
        }), map(makeListItem), take(10))(results);
        this._count = -1;
      }
    }
  },

  resultSelected: function() {
    var elem = this._selection;;
    var value = elem.innerHTML;
    this._results.innerHTML = '';
    this._input.value = elem.getAttribute('data-result-name');
    this._selection = null;
    this.find();
  },

  itemSelected: function(e) {
    if (e) L.DomEvent.preventDefault(e);
    var elem = e.target;
    var value = elem.innerHTML;
    this._input.value = elem.getAttribute('data-result-name');
    var result = filtername(this._input.value)(this.data);
    var data = result.shift();
    if (data) {
      var feature = this.options.layer.getFeature(data.id);
      this._map.fitBounds(feature.getBounds());
    }
    this._results.innerHTML = '';
  },

  find: function(e) {
    if (e) L.DomEvent.preventDefault(e);
    if (this._selection) {
      this.resultSelected(e);
    } else {
      var data = last(filtername(this._input.value)(this.data));
      if (data) {
        var feature = this.options.layer.getFeature(data.id);
        this._map.fitBounds(feature.getBounds());
      }
    }
  },

  featureAdded: function(e) {
    this.rawdata.push(e.feature);
  },

  layerLoad: function() {
    console.debug('has layer loaded?');
    this.data = map(x => x, sortBy(getPropName)(this.rawdata));
  }
});

L.control.autocomplete = function(id, options) {
  return new L.Control.AutoComplete(id, options);
};

