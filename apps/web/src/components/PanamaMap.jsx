import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { getLandPosition } from "../data/province-centers";

const PANAMA_CENTER = [8.9824, -79.4849];
const DEFAULT_ZOOM = 7;

function MapController({ center, zoom }) {
  const map = useMap();
  const prevKey = useRef(null);

  useEffect(() => {
    if (!center || !center[0] || !center[1]) return;
    const key = `${center[0]}-${center[1]}`;
    if (key !== prevKey.current) {
      prevKey.current = key;
      map.flyTo(center, zoom, { duration: 1 });
    }
  }, [map, center, zoom]);

  return null;
}

function ProvinceLayer({ lands, provinces }) {
  const provinceCounts = {};
  lands.forEach((land) => {
    const prov = land.location?.province;
    if (prov) provinceCounts[prov] = (provinceCounts[prov] || 0) + 1;
  });

  if (!provinces) return null;

  const style = (feature) => {
    const provinceName = feature.properties?.NOMBRE;
    const count = provinceCounts[provinceName] || 0;
    const hasLand = count > 0;
    
    return {
      fillColor: hasLand ? "#0b5f37" : "#e8e4d9",
      fillOpacity: hasLand ? 0.3 : 0.1,
      color: hasLand ? "#0b5f37" : "#c9c4b5",
      weight: hasLand ? 2 : 1,
    };
  };

  const onEachFeature = (feature, layer) => {
    const provinceName = feature.properties?.NOMBRE;
    const count = provinceCounts[provinceName] || 0;
    
    if (count > 0) {
      layer.bindPopup(`<strong>${provinceName}</strong><br/>${count} terreno${count !== 1 ? "s" : ""}`);
    }
  };

  return (
    <GeoJSON 
      data={provinces} 
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

function MapPin({ land, onClick }) {
  const position = getLandPosition(land.location);
  if (!position) return null;

  return (
    <Marker 
      position={position}
      eventHandlers={{
        click: () => onClick(land),
      }}
    >
      <Popup>
        <div className="land-popup">
          <span className="popup-badge">{land.allowedUses?.[0]}</span>
          <h4>{land.title}</h4>
          <p>{land.location?.province} · {land.location?.district}</p>
          <strong>${land.priceRule?.pricePerMonth}/mes</strong>
        </div>
      </Popup>
    </Marker>
  );
}

export default function PanamaMap({ lands, selectedLand, onSelectLand }) {
  const [provinces, setProvinces] = useState(null);

  useEffect(() => {
    fetch("/panama-provinces.geojson")
      .then((res) => res.json())
      .then(setProvinces)
      .catch(console.error);
  }, []);

  const selectedPosition = selectedLand 
    ? getLandPosition(selectedLand.location)
    : null;
  
  const flyZoom = selectedLand ? 10 : DEFAULT_ZOOM;

  return (
    <div className="panama-map-container">
      <MapContainer
        center={PANAMA_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <ProvinceLayer lands={lands} provinces={provinces} />
        
        {lands.map((land) => (
          <MapPin
            key={land.id}
            land={land}
            onClick={onSelectLand}
          />
        ))}
        
        {selectedPosition && (
          <MapController center={selectedPosition} zoom={flyZoom} />
        )}
      </MapContainer>
    </div>
  );
}