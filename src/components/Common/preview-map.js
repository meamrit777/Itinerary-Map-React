import React, { useRef, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  GeoJSON,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import domtoimage from "dom-to-image-more";
import "leaflet/dist/leaflet.css";
import MarkerIcon from "../../assets/images/map-marker.svg";
import ElevationChart from "./chart/elevation-chart";

import { Row, Col } from "antd";

function createThumbnail(dataUrl, thumbnailHeight) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = function () {
      const aspectRatio = image.width / image.height;
      const thumbnailWidth = Math.round(thumbnailHeight * aspectRatio);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = thumbnailWidth;
      canvas.height = thumbnailHeight;
      ctx.drawImage(image, 0, 0, thumbnailWidth, thumbnailHeight);
      const thumbnailDataUrl = canvas.toDataURL("image/png");
      resolve(thumbnailDataUrl);
    };
    image.src = dataUrl;
    image.onerror = function (error) {
      reject(error);
    };
  });
}

function calculatePolylineBounds(coordinates) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  coordinates.forEach((coord) => {
    const [lat, lng] = coord;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

const PreviewMap = ({
  generatingThumb,
  thumbGenerationIsComplete,
  isPreviewMode,
  polylineCoordinates,
  mapPosition,
  geojsonData,
}) => {
  const mapRef = useRef(null);
  const [dotPosition, setDotPosition] = useState(0);
  const [loadingThumb, setLoadingThumb] = useState(false);

  const handleConvertToImage = () => {
    if (!loadingThumb) {
      const mapElement = mapRef.current._container;
      domtoimage
        .toPng(mapElement)
        .then((dataUrl) => {
          const thumbnailHeight = 200; // Set your desired thumbnail height
          createThumbnail(dataUrl, thumbnailHeight)
            .then((thumbnailDataUrl) => {
              thumbGenerationIsComplete(thumbnailDataUrl);
              setLoadingThumb(false);
            })
            .catch((error) => {
              console.error("Error creating thumbnail:", error);
            });
        })
        .catch((error) => {
          console.error("Error converting to image:", error);
        });
    }
  };

  useEffect(() => {
    if (generatingThumb && mapRef.current) {
      setLoadingThumb(true);
      setTimeout(() => {
        handleConvertToImage();
      }, 3000);
    }
  }, [generatingThumb, mapRef.current]);

  useEffect(() => {
    const minimized_val = Math.ceil(Math.sqrt(polylineCoordinates.length));
    const jump_size = parseInt(minimized_val);
    const jump_time = 5000 / minimized_val;
    const intervalId = setInterval(() => {
      setDotPosition((prevPosition) => (prevPosition + jump_size) % polylineCoordinates.length);
    }, jump_time);
    return () => {
      clearInterval(intervalId);
    };
  }, [polylineCoordinates?.length]);
  useEffect(() => {
    if (polylineCoordinates.length > 0) {
      mapRef?.current?.fitBounds(calculatePolylineBounds(polylineCoordinates));
    }
  }, [mapRef.current]);

  const chartData = {
    itinerary: geojsonData.features.map((f) => ({
      id: f.id,
      title: f.properties.origin,
      description: `${f.properties.origin} to ${f.properties.destination}`,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      elevation: f.properties.origin_elevation,
    })),
  };

  return (
    <div>
      {isPreviewMode && (
        <div style={{ padding: 5, fontSize: 10, fontWeight: "bold" }}>TRAVEL PREVIEW</div>
      )}
      <Row>
        <Col span={12}>
          <MapContainer
            ref={mapRef}
            center={mapRef?.current?._lastCenter ? mapRef?.current?._lastCenter : mapPosition}
            zoom={13}
            style={{ height: "400px", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Polyline positions={polylineCoordinates} color="green" weight={6} />
            {polylineCoordinates.length > 0 && dotPosition !== null && (
              <CircleMarker
                center={polylineCoordinates[dotPosition]}
                radius={5}
                fillColor="red"
                fillOpacity={1}
                color="red"
                className="dot"
              />
            )}

            {geojsonData.features.map((feature, index) => {
              const coordinates = feature.geometry.coordinates;
              return (
                <Marker
                  key={index}
                  position={[coordinates[1], coordinates[0]]}
                  icon={L.icon({ iconUrl: MarkerIcon, iconSize: [40, 40] })}
                >
                  <Popup>
                    <div>
                      <strong>Name:</strong> {feature.properties.origin}{" "}
                      {feature.properties.origin_elevation && (
                        <>({feature.properties.origin_elevation} m)</>
                      )}
                      <br />
                      {feature.properties.destination && (
                        <>
                          <br />
                          <strong>Destination:</strong> {feature.properties.destination}{" "}
                          {feature.properties.destination_elevation && (
                            <>({feature.properties.destination_elevation} m)</>
                          )}
                          <br />
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Col>
        <Col span={12}>
          <ElevationChart chartData={chartData} />
        </Col>
      </Row>
    </div>
  );
};

export default PreviewMap;
