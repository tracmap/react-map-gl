import {
  Map,
  AttributionControl,
  FullscreenControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl, MapProvider
} from 'react-map-gl';
import * as React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import test from 'tape-promise/tape';

test('Controls', t => {
  const renderer = ReactTestRenderer.create(<MapProvider><Map /></MapProvider>);
  renderer.update(
    <MapProvider>
      <Map>
        <AttributionControl />
      </Map>
    </MapProvider>
  );
  t.ok(renderer.root, 'Rendered <AttributionControl />');
  renderer.update(
    <MapProvider>
      <Map>
        <FullscreenControl />
      </Map>
    </MapProvider>
  );
  t.ok(renderer.root, 'Rendered <FullscreenControl />');
  renderer.update(
    <MapProvider>
      <Map>
        <GeolocateControl />
      </Map>
    </MapProvider>
  );
  t.ok(renderer.root, 'Rendered <GeolocateControl />');
  renderer.update(
    <MapProvider>
      <Map>
        <NavigationControl />
      </Map>
    </MapProvider>
  );
  t.ok(renderer.root, 'Rendered <NavigationControl />');
  renderer.update(
    <MapProvider>
      <Map>
        <ScaleControl />
      </Map>
    </MapProvider>
  );
  t.ok(renderer.root, 'Rendered <ScaleControl />');

  renderer.unmount();

  t.end();
});
