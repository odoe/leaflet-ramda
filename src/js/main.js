import L from 'leaflet';
import { curry, get, compose } from 'ramda';
import 'esri-leaflet';
import './controls/autocomplete';

var popup = curry((a, b) => L.Util.template(a, b));
var getProps = get('properties');
var div = L.DomUtil.create('div', 'map-canvas', L.DomUtil.get('main'));
var parkStyle = { color: '#70ca49', weight: 2 };
var lmap = L.map(div).setView([34.0831, -118.2389], 13);
L.esri.basemapLayer('Gray').addTo(lmap);

var layer = new L.esri.FeatureLayer('http://services2.arcgis.com/j80Jz20at6Bi0thr/arcgis/rest/services/Parks/FeatureServer/0', {
  style() {
    return parkStyle;
  }
}).addTo(lmap);

L.control.autocomplete({ layer }).addTo(lmap);

var popupTemplate = '<h3>{NAME}</h3>{ACRES} Acres<br><small>Type: {TYPE}<small>';
var popupFeature = compose(popup(popupTemplate), getProps);
layer.bindPopup(popupFeature);

