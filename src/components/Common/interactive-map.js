import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
// import { MarkerIcon } from "../../assets/images/marker.png";
import polyline from "polyline-encoded";
import "leaflet/dist/leaflet.css";

const CustomMap = ({
  updateCoordinate,
  generateRouteInfo,
  data,
  mapPosition,
  zoom,
  chosenItem,
}) => {
  const mapRef = useRef(null);
  const [mapIsReady, setMapIsReady] = useState(false);

  useEffect(() => {
    if ((mapIsReady, mapRef.current && data?.origin_coordinate && data?.destination_coordinate)) {
      const bounds = L.latLngBounds([
        [data.origin_coordinate[0], data.origin_coordinate[1]],
        [data.destination_coordinate[0], data.destination_coordinate[1]],
      ]);
      mapRef.current.fitBounds(bounds);
      generateRouteInfo();
    } else if (mapRef.current && (data?.origin_coordinate || data?.destination_coordinate)) {
      const coordinates = data.origin_coordinate || data.destination_coordinate;
      const bounds = L.latLngBounds([
        [coordinates[0], coordinates[1]],
        [coordinates[0], coordinates[1]],
      ]);
      mapRef.current.fitBounds(bounds);
      generateRouteInfo();
    }
  }, [
    data?.origin_coordinate,
    data?.destination_coordinate,
    chosenItem.day,
    chosenItem.stop,
    mapIsReady,
  ]);

  const getValidCoordinate = (coordinate) => {
    if (coordinate && coordinate.length === 2) {
      return [parseFloat(coordinate[0]), parseFloat(coordinate[1])];
    }
    return null;
  };

  const originCoordinate = getValidCoordinate(data?.origin_coordinate);
  const destinationCoordinate = getValidCoordinate(data?.destination_coordinate);

  const center = originCoordinate || destinationCoordinate || [0, 0];

  const handleMarkerDragEnd = (event, key) => {
    updateCoordinate([event.target.getLatLng().lat, event.target.getLatLng().lng], key);
  };
  const polylineCoordinates = data?.encoded_polyline ? polyline.decode(data.encoded_polyline) : [];

  const render_manual_option =
    (data?.origin && !data?.origin_coordinate) ||
    (data?.destination && !data.destination_coordinate);
  const handleMapClick = (e) => {
    mapRef?.current?.off("click", handleMapClick);
    if (render_manual_option) {
      const key = data.origin_coordinate ? "destination_coordinate" : "origin_coordinate";
      updateCoordinate([e.latlng.lat, e.latlng.lng], key);
    }
  };
  mapRef?.current?.on("click", handleMapClick);

  return (
    <MapContainer
      center={(mapRef?.current?._lastCenter ? mapRef?.current?._lastCenter : mapPosition) || center}
      zoom={mapRef?.current?._zoom ? mapRef.current._zoom : zoom}
      style={{ height: "500px", width: "100%" }}
      ref={mapRef}
      whenReady={() => setMapIsReady(true)}
    >
      {render_manual_option && (
        <div
          style={{
            backgroundColor: "white",
            width: 200,
            position: "absolute",
            zIndex: 1000,
            top: 10,
            left: 60,
            border: "1px solid #aaa",
            boxShadow: "0px 0px 1px black",
            padding: 5,
          }}
        >
          <b>
            Location of "{data[data.origin && !data.origin_coordinate ? "origin" : "destination"]}"
          </b>
          <br />
          <div>Click on the map to set location manually</div>
        </div>
      )}
      {data?.origin && data?.destination && data.origin_elevation && data.destination_elevation && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            bottom: 10,
            right: 10,
            padding: 5,
            border: "1px solid #aaa",
            boxShadow: "0px 0px 1px black",
            backgroundColor: "white",
          }}
        >
          <div>
            <b>Elevation</b>
          </div>
          <div>
            {data.origin}: {data.origin_elevation} m
          </div>
          <div>
            {data.destination}: {data.destination_elevation} m
          </div>
        </div>
      )}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <Polyline positions={polylineCoordinates} color="green" weight={6} />

      {originCoordinate && (
        <Marker
          draggable={true}
          position={originCoordinate}
          icon={L.icon({
            iconUrl:
              "data:image/png;base64,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",
            iconSize: [40, 40],
          })}
          eventHandlers={{
            dragend: (e) => {
              if (data.origin_coordinate && data.destination_coordinate) {
                generateRouteInfo();
              }
              handleMarkerDragEnd(e, "origin_coordinate");
            },
          }}
        >
          <Popup>
            Origin: {data.origin}
            <br />
            Elevation: {data.origin_elevation} m
          </Popup>
        </Marker>
      )}

      {destinationCoordinate && (
        <Marker
          draggable={true}
          position={destinationCoordinate}
          icon={L.icon({
            iconUrl:
              "data:image/png;base64,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",
            iconSize: [40, 40],
          })}
          eventHandlers={{
            dragend: (e) => {
              if (data.origin_coordinate && data.destination_coordinate) {
                generateRouteInfo();
              }
              handleMarkerDragEnd(e, "destination_coordinate");
            },
          }}
        >
          <Popup>
            Destination: {data.destination} <br />
            Elevation: {data.destination_elevation} m
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default CustomMap;
