import { useState } from "react";
import InteractiveMap from "../Common/interactive-map";
import PreviewMap from "../Common/preview-map";
import { encode } from "@mapbox/polyline";
import axios from "axios";
import polyline from "polyline-encoded";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Input, Typography, Card, Row, Col, Collapse, Button, Popconfirm, Spin } from "antd";
import {
  ItineraryGeneralInfoForm,
  Header,
  IteneraryDaysCountForm,
  PreviewModal,
  ItineraryValues,
  mergePolylines,
  DATA_TEMPLATE,
  DEFAULT_SELECTED_DAY,
  DEFAULT_SELECTED_STOP,
  createGeoJSON,
} from "./ItineraryFormNewSupportComponents";
import ModalWithMap from "./ModalWithMap";

export const DEFAULT_TRAVEL_MODE = "car";

const MapDataForm = ({
  itineraryThumb,
  setItineraryThumb,
  formFields,
  setFormFields,
  isUpdateForm,
}) => {
  const [days, setDays] = useState(1);
  const [thumb, setThumb] = useState();
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [chosenItem, setChosenItem] = useState({
    day: DEFAULT_SELECTED_DAY,
    stop: DEFAULT_SELECTED_STOP,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formState, setFormState] = useState("itinerary");
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [openMapModal, setOpenMapModal] = useState(false);
  const closeMapModal = () => setOpenMapModal(false);

  const closeModal = () => setPreviewOpen(false);
  const handleDayChange = (e) => setDays(parseInt(e.target.value));
  // const handleNavigate = () => navigate(`/itineraries`);

  // console.log("formFields", formFields);

  function validateItineraryDetails(itineraryDetails) {
    if (!itineraryDetails || itineraryDetails.length === 0) {
      return false;
    }

    const firstItem = itineraryDetails[0];

    if (
      !firstItem.origin_coordinate ||
      !firstItem.origin_elevation ||
      !firstItem.destination_coordinate ||
      !firstItem.destination_elevation ||
      !firstItem.encoded_polyline
    ) {
      return false;
    }
    return true;
  }

  const handleDaySubmit = async (e) => {
    e.preventDefault();
    const newFormFields = {};
    for (let i = 1; i <= days; i++) {
      newFormFields[i] = { [DEFAULT_SELECTED_STOP]: DATA_TEMPLATE };
    }
    setFormFields(newFormFields);
    setFormState("itinerary");
  };
  const addDays = () => {
    const day_count = days + 1;
    setDays(day_count);
    setFormFields({
      ...formFields,
      [day_count]: {
        ...formFields[day_count],
        [DEFAULT_SELECTED_STOP]: DATA_TEMPLATE,
      },
    });
  };

  const addStops = (day_count) => {
    setFormFields({
      ...formFields,
      [day_count]: {
        ...formFields[day_count],
        [Object.keys(formFields[day_count]).length + 1]: DATA_TEMPLATE,
      },
    });
  };

  const handleDestinationChange = (e, index) => {
    const newFormFields = [...formFields];
    if (index < days - 1) {
      newFormFields[index + 1].origin = e.target.value;
    }
    setFormFields(newFormFields);
  };

  const setValues = (day_count, stop_count, key, value) => {
    setFormFields((prevFormFields) => {
      const updatedFormFields = {
        ...prevFormFields,
        [day_count]: {
          ...prevFormFields[day_count],
          [stop_count]: {
            ...prevFormFields[day_count][stop_count],
            [key]: value,
          },
        },
      };

      // Update destination when origin is updated
      if (key === "origin" || key === "origin_coordinate" || key === "origin_elevation") {
        // const reverseKey = key === "origin" ? "destination" : "destination_coordinate"
        let reverseKey;
        if (key === "origin") {
          reverseKey = "destination";
        } else if (key === "origin_coordinate") {
          reverseKey = "destination_coordinate";
        } else if (key === "origin_elevation") {
          reverseKey = "destination_elevation";
        }
        const prevStop = stop_count - 1;
        const prevDay = day_count - 1;
        if (
          prevStop > 0 &&
          prevFormFields[day_count][prevStop] &&
          prevFormFields[day_count][prevStop][reverseKey] !== value
        ) {
          updatedFormFields[day_count][prevStop] = {
            ...prevFormFields[day_count][prevStop],
            [reverseKey]: value,
          };
        } else if (
          prevDay > 0 &&
          prevFormFields[prevDay][Object.keys(prevFormFields[prevDay]).length] &&
          prevFormFields[prevDay][Object.keys(prevFormFields[prevDay]).length][reverseKey] !== value
        ) {
          updatedFormFields[prevDay][Object.keys(prevFormFields[prevDay]).length] = {
            ...prevFormFields[prevDay][Object.keys(prevFormFields[prevDay]).length],
            [reverseKey]: value,
          };
        }
      }

      // Update origin when destination is updated
      if (
        key === "destination" ||
        key === "destination_coordinate" ||
        key === "destination_elevation"
      ) {
        let reverseKey;
        if (key === "destination") {
          reverseKey = "origin";
        } else if (key === "destination_coordinate") {
          reverseKey = "origin_coordinate";
        } else if (key === "destination_elevation") {
          reverseKey = "origin_elevation";
        }
        const nextStop = parseInt(stop_count) + 1;
        const nextDay = parseInt(day_count) + 1;
        const totalDays = Object.keys(prevFormFields).length;
        const totalStopsInDay = Object.keys(prevFormFields[day_count]).length;
        console.log("prevFormFields", prevFormFields);
        if (
          nextStop <= totalStopsInDay &&
          prevFormFields[day_count][nextStop] &&
          prevFormFields[day_count][nextStop][reverseKey] !== value
        ) {
          updatedFormFields[day_count][nextStop] = {
            ...prevFormFields[day_count][nextStop],
            [reverseKey]: value,
          };
        } else if (
          nextStop === totalStopsInDay + 1 &&
          day_count < totalDays &&
          prevFormFields[parseInt(day_count) + 1] &&
          prevFormFields[parseInt(day_count) + 1][1] &&
          prevFormFields[parseInt(day_count) + 1][1][reverseKey] !== value
        ) {
          updatedFormFields[parseInt(day_count) + 1][1] = {
            ...prevFormFields[parseInt(day_count) + 1][1],
            [reverseKey]: value,
          };
        }
      }
      return updatedFormFields;
    });
  };

  const createStraightPolyline = (startLatLng, endLatLng) => {
    const polylineCoordinates = polyline.decode(
      mergePolylines(
        Object.keys(formFields)
          .map((day) =>
            Object.keys(formFields[day]).map((stop) => formFields[day][stop].encoded_polyline)
          )
          .flat()
      )
    );
    const numIntermediatePoints = 1 + Math.ceil(Math.pow(polylineCoordinates.length, 0.8));
    const coordinates = [startLatLng];
    const latDiff =
      (parseFloat(endLatLng[0]) - parseFloat(startLatLng[0])) / (numIntermediatePoints + 1);
    const lngDiff =
      (parseFloat(endLatLng[1]) - parseFloat(startLatLng[1])) / (numIntermediatePoints + 1);

    for (let i = 0; i < numIntermediatePoints; i++) {
      const lat = parseFloat(startLatLng[0]) + latDiff * (i + 1);
      const lng = parseFloat(startLatLng[1]) + lngDiff * (i + 1);
      coordinates.push([lat, lng]);
    }

    coordinates.push(endLatLng);

    const encoded_polyline = encode(coordinates);
    return encoded_polyline;
  };

  const fetchEncodedPolyline = async (override_mode_of_transportation) => {
    const data = formFields[chosenItem.day][chosenItem.stop];
    const originLatitude = data?.origin_coordinate && data?.origin_coordinate[0];
    const originLongitude = data?.origin_coordinate && data?.origin_coordinate[1];
    const destLatitude = data?.destination_coordinate && data?.destination_coordinate[0];
    const destLongitude = data?.destination_coordinate && data?.destination_coordinate[1];

    const mode_of_transportation = override_mode_of_transportation || data.travel_mode;

    if (mode_of_transportation === "air") {
      const encoded_polyline = createStraightPolyline(
        [originLatitude, originLongitude],
        [destLatitude, destLongitude]
      );
      setValues(chosenItem.day, chosenItem.stop, "encoded_polyline", encoded_polyline);
    } else {
      if (originLatitude && originLongitude && destLongitude && destLatitude) {
        const osrmElevationUrl = `https://routing.openstreetmap.de/routed-${
          mode_of_transportation || DEFAULT_TRAVEL_MODE
        }/route/v1/driving/`;
        const lngLatOrigin = `${originLongitude},${originLatitude}`;
        const lngLatDestination = `${destLongitude},${destLatitude}`;
        const queryParams = "overview=false&alternatives=true&steps=true";
        const reqUrl = `${osrmElevationUrl}${lngLatOrigin};${lngLatDestination}?${queryParams}`;
        try {
          const response = await axios.post(reqUrl);
          if (response.status === 200) {
            const array_of_objects = response.data.routes[0].legs[0].steps;
            const duration = (response.data.routes[0].legs[0].duration / 60 / 60).toFixed(1);
            const encoded_polyline = mergePolylines(array_of_objects.map((obj) => obj.geometry));
            setValues(chosenItem.day, chosenItem.stop, "encoded_polyline", encoded_polyline);
            setValues(chosenItem.day, chosenItem.stop, "duration", `${duration} hours`);
          }
        } catch (error) {
          console.error("Error fetching encoded polyline:", error);
        }
      }
    }
  };

  const fetchElevation = async () => {
    const data = formFields[chosenItem.day][chosenItem.stop];
    const originLatitude = data?.origin_coordinate && data?.origin_coordinate[0];
    const originLongitude = data?.origin_coordinate && data?.origin_coordinate[1];
    const destLatitude = data?.destination_coordinate && data?.destination_coordinate[0];
    const destLongitude = data?.destination_coordinate && data?.destination_coordinate[1];
    let originElevation = null;
    let destinationElevation = null;
    if (originLatitude && originLongitude) {
      const apiUrlOrigin = `https://api.open-elevation.com/api/v1/lookup?locations=${originLatitude},${originLongitude}`;
      try {
        const response = await axios.get(apiUrlOrigin);
        if (response.status === 200) {
          const elevationData = response.data;
          const elevation = elevationData.results[0].elevation;
          originElevation = elevation;
        }
      } catch (error) {
        console.error("Error fetching elevation:", error);
      }
      setValues(chosenItem.day, chosenItem.stop, "origin_elevation", originElevation);
    }
    if (destLatitude && destLongitude) {
      const apiUrlDestination = `https://api.open-elevation.com/api/v1/lookup?locations=${destLatitude},${destLongitude}`;
      try {
        const response = await axios.get(apiUrlDestination);
        if (response.status === 200) {
          const elevationData = response.data;
          const elevation = elevationData.results[0].elevation;
          destinationElevation = elevation;
        }
      } catch (error) {
        console.error("Error fetching elevation:", error);
      }
      setValues(chosenItem.day, chosenItem.stop, "destination_elevation", destinationElevation);
    }
  };

  const generateRouteInfo = (override_mode_of_transportation) => {
    fetchEncodedPolyline(override_mode_of_transportation);
    fetchElevation();
  };

  const updateCoordinate = (coordinate, key) => {
    setValues(chosenItem.day, chosenItem.stop, key, coordinate);
  };

  const onSubmit = () => {
    setGeneratingThumb(true);
    setPreviewOpen(true);
  };

  const hitNetwork = async (thumbnail) => {
    const flat_itineraries = [];
    Object.keys(formFields).forEach((day, i) => {
      Object.keys(formFields[day]).forEach((stop, j) => {
        flat_itineraries.push({
          itinerary_day: day,
          itinerary_stop: stop,
          itinerary_title: formFields[day][stop].title,
          itinerary_description: formFields[day][stop].description,
          facts: Object.keys(formFields[day][stop])
            .map((item, idx) => {
              if (!(item === "title" || item === "description" || item === "facts")) {
                return {
                  fact_title: item,
                  fact_value: formFields[day][stop][item],
                };
              }
            })
            .filter((i) => i),
        });
      });
    });

    const req_obj = {
      itineraries: flat_itineraries,
      itinerary_title: undefined,
      url_title: undefined,
      slug: undefined,
      package_id: undefined,
      status: undefined,
      _method: "put",
    };

    const formData = new FormData();
    Object.keys(req_obj).forEach((key) => {
      formData.append(key, req_obj[key]);
    });
  };
  return (
    <Row>
      <Col span={12}>
        <Button
          onClick={() => {
            setChosenItem({ day: null, stop: null });
            setOpenMapModal(true);
          }}
        >
          Generate Thumbnail
        </Button>
        <Collapse
          style={{ backgroundColor: "white" }}
          activeKey={parseInt(chosenItem?.day - 1)}
          onChange={(v) => setChosenItem({ day: parseInt(v) + 1, stop: 1 })}
          accordion
        >
          {Object.keys(formFields)?.map((day_count, index) => (
            <Collapse.Panel
              key={index}
              header={
                <div>
                  <span>
                    Day {day_count}
                    {Object.keys(formFields[day_count]).length > 1 &&
                      ` (${Object.keys(formFields[day_count]).length} Stops)`}
                  </span>
                </div>
              }
            >
              {day_count !== "1" && (
                <Popconfirm
                  placement="topLeft"
                  title="Are you sure you want to remove this?"
                  description={`Delete Itinerary for day ${day_count}`}
                  okText="Yes"
                  cancelText="No"
                  onCancel={() => {}}
                  onConfirm={() => {
                    const newFormFields = { ...formFields };
                    delete newFormFields[day_count];
                    const newKeys = Object.keys(newFormFields).sort();
                    for (let i = 0; i < newKeys.length; i++) {
                      const currentKey = newKeys[i];
                      const newKey = (i + 1).toString();
                      if (currentKey !== newKey) {
                        newFormFields[newKey] = newFormFields[currentKey];
                        delete newFormFields[currentKey];
                      }
                    }
                    setChosenItem({
                      day: chosenItem.day > 1 ? chosenItem.day - 1 : chosenItem.day,
                      stop: 1,
                    });
                    setFormFields(newFormFields);
                  }}
                >
                  <Button
                    danger
                    style={{ marginBottom: 10 }}
                    onClick={() => {
                      // setModalOpen(day_count)
                    }}
                  >
                    Delete Day {day_count}
                  </Button>
                </Popconfirm>
              )}

              <ItineraryValues
                {...{
                  setFormFields,
                  generateRouteInfo,
                  setChosenItem,
                  chosenItem,
                  setValues,
                  day_count,
                  formFields,
                  handleDestinationChange,
                }}
              />
              <br />
              {parseInt(chosenItem.day) === parseInt(day_count) && (
                <Button
                  onClick={() => {
                    addStops(parseInt(day_count));
                  }}
                  block
                >
                  <PlusOutlined />
                  Add a stop
                </Button>
              )}
            </Collapse.Panel>
          ))}
        </Collapse>
        <br />
        <Button onClick={() => addDays()} block>
          <PlusOutlined />
          Add a day
        </Button>
        <div>
          <br />
          <PreviewModal
            {...{ previewOpen, closeModal, formFields }}
            generatingThumb={generatingThumb}
            thumbGenerationIsComplete={(thumbnailDataUrl) => {
              // const newTab = window.open();
              // newTab.document.write('<img src="' + thumbnailDataUrl + '" alt="Screenshot"/>');
              setThumb(thumbnailDataUrl);
              setPreviewOpen(false);
              setGeneratingThumb(false);
              hitNetwork(thumbnailDataUrl);
            }}
          />
        </div>
      </Col>
      <Col span={12}>
        {formState === "itinerary" && (
          <div
            style={{
              padding: 10,
              marginLeft: 10,
              backgroundColor: "white",
              borderRadius: 10,
            }}
          >
            {chosenItem &&
            chosenItem.day &&
            chosenItem.stop &&
            formFields &&
            Object.keys(formFields).length > 0 ? (
              <InteractiveMap
                zoom={2}
                mapPosition={[27.7090302, 85.284933]}
                data={formFields && formFields[chosenItem.day][chosenItem.stop]}
                updateCoordinate={updateCoordinate}
                generateRouteInfo={generateRouteInfo}
                chosenItem={chosenItem}
              />
            ) : (
              <div>
                <PreviewMap
                  mapPosition={[27.7090302, 85.284933]}
                  polylineCoordinates={polyline.decode(
                    mergePolylines(
                      Object.keys(formFields)
                        .map((day) =>
                          Object.keys(formFields[day]).map(
                            (stop) => formFields[day][stop].encoded_polyline
                          )
                        )
                        .flat()
                    )
                  )}
                  geojsonData={createGeoJSON(formFields)}
                  isPreviewMode={true}
                />
                <ModalWithMap
                  {...{ openMapModal, closeMapModal, formFields, thumbnailLoading }}
                  onGenerate={() => {
                    setGeneratingThumb(true);
                    setThumbnailLoading(true);
                  }}
                  generatingThumb={generatingThumb}
                  thumbGenerationIsComplete={(thumbnailDataUrl) => {
                    setItineraryThumb(thumbnailDataUrl);
                    setOpenMapModal(false);
                    setGeneratingThumb(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Col>
    </Row>
  );
};
export default MapDataForm;
