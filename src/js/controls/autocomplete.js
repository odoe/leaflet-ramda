export default L;

import L from 'leaflet';
import debounce from 'lodash.debounce';

import {
  compose,
  curry,
  get,
  filter,
  map,
  eq,
  take,
  last,
  sortBy
} from 'ramda';

var isValid = (a, b) => a.indexOf(b) > -1;
var getName = get('NAME');
var getProps = get('properties');
var getPropName = compose(getName, getProps);

var upper = s => {
  return s.toUpperCase();
};

var filtername = name => {
  return filter(x => eq(upper(getPropName(x)), upper(name)));
};
var fuzzyname = name => {
  return filter(x => isValid(upper(getName(x)), upper(name)));
};
var getfuzzyname = name => compose(fuzzyname(name), map(getProps));

var makeListItem = x => {
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

  initialize(options) {
    L.Util.setOptions(this, options);
    if (options.layer) {
      options.layer.on('createfeature', this.featureAdded, this);
      options.layer.on('load', this.layerLoad, this);
    }
  },

  onAdd(m) {
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

  onRemove(m) {
    L.DomEvent.removeListener(this._input, 'keyup', this.keyup, this);
    L.DomEvent.removeListener(form, 'submit', this.find, this);
  },

  keydown(e) {
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

  select(i) {
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

  keyup(e) {
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

  resultSelected() {
    var elem = this._selection;;
    var value = elem.innerHTML;
    this._results.innerHTML = '';
    this._input.value = elem.getAttribute('data-result-name');
    this._selection = null;
    this.find();
  },

  itemSelected(e) {
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

  find(e) {
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

  featureAdded(e) {
    this.rawdata.push(e.feature);
  },

  layerLoad() {
    console.debug('has layer loaded?');
    this.data = map(x => x, sortBy(getPropName)(this.rawdata));
  }
});

L.control.autocomplete = (id, options) => {
  return new L.Control.AutoComplete(id, options);
};

