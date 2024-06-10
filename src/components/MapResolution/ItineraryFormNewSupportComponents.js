import { useState, useMemo, useEffect } from "react";
// import leftArrow from "../../../assets/images/left-arrow.png";
import PreviewMap from "../Common/preview-map";
import { decode, encode } from "@mapbox/polyline";
import axios from "axios";
import polyline from "polyline-encoded";
import {
  Typography,
  Button,
  Row,
  Col,
  Form,
  Input,
  Switch,
  Collapse,
  Modal,
  Popconfirm,
} from "antd";
import { SaveOutlined, CloseCircleOutlined } from "@ant-design/icons";
import debounce from "lodash.debounce";
import { DEFAULT_TRAVEL_MODE } from "./MapDataForm";
const { TextArea } = Input;

export const Header = ({ handleNavigate, edit, data, formState, setPreviewOpen, onSubmit }) => {
  return (
    <span>
      <Typography.Title
        style={{
          margin: 0,
        }}
      >
        {edit ? "Update" : "Add"} Itinerary
      </Typography.Title>
      {formState === "itinerary" && (
        <Button type="primary" shape="round" icon={<SaveOutlined />} onClick={onSubmit}>
          Update Itinerary
        </Button>
      )}{" "}
      <Button
        danger
        type="primary"
        shape="round"
        icon={<CloseCircleOutlined />}
        onClick={handleNavigate}
      >
        Discard
      </Button>{" "}
      {formState === "itinerary" && (
        <Button type="primary" shape="round" onClick={() => setPreviewOpen(true)}>
          Preview
        </Button>
      )}
      <hr />
    </span>
  );
};

export const ItineraryGeneralInfoForm = ({ data, list, setData }) => {
  const col_data = [
    {
      name: "itinerary_title",
      label: "Title",
      input_type: "text",
      value: data?.itinerary_title,
    },
    {
      name: "urlinfo.url_title",
      label: "Url Title",
      input_type: "text",
      value: data?.urlinfo?.url_title,
    },
    {
      name: "urlinfo.url_slug",
      label: "Auto Generate from Url Title",
      input_type: "text",
      value: data?.urlinfo?.url_slug,
      disabled: true,
    },
    {
      name: "package_id",
      label: "Select a package",
      input_type: "select",
      value: data?.package_id,
    },
    {
      name: "status",
      label: "Status",
      input_type: "switch",
      value: data?.status,
    },
  ];
  const onChange = (e) => {
    const split_name = e.target.name.split(".");
    if (split_name.length > 1) {
      setData({
        ...data,
        [split_name[0]]: {
          ...data[split_name[0]],
          [split_name[1]]: e.target.value,
        },
      });
    } else {
      setData({
        ...data,
        [e.target.name]: e.target.value,
      });
    }
  };
  const cols = col_data.map((i, idx) => {
    if (i.input_type === "text") {
      return (
        <Col key={idx} span={8}>
          <Form.Item label={i.label} required disabled={i.disabled}>
            <Input
              placeholder="input placeholder"
              value={i.value}
              onChange={onChange}
              name={i.name}
            />
          </Form.Item>
        </Col>
      );
    } else if (i.input_type === "switch") {
      return (
        <Col>
          <Form.Item label={i.label} required>
            <Switch
              defaultChecked
              onChange={(v) => onChange({ target: { value: v ? 1 : 0, name: i.name } })}
            />
          </Form.Item>
        </Col>
      );
    } else if (i.input_type === "select") {
      return (
        <Col>
          <Form.Item
            label="Select a package"
            name="package_id"
            rules={[{ required: true, message: "Please select a package" }]}
            validateStatus="success"
          >
            <select
              placeholder="Select a package"
              size="large"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              value={data?.package_id}
              onChange={onChange}
              name={i.name}
            >
              {list?.data?.map((item, idx) => (
                <option key={idx} value={item.package_id}>
                  {item.itinerary_title}
                </option>
              ))}
            </select>
          </Form.Item>
        </Col>
      );
    }
  });
  return <Row>{cols}</Row>;
};

export const IteneraryDaysCountForm = ({ handleDaySubmit, days, handleDayChange }) => {
  return (
    <>
      <form onSubmit={handleDaySubmit}>
        <div>
          <div>Enter the number of days this tour takes:</div>
          <div>
            <input type="number" value={days} onChange={handleDayChange} required />
          </div>
          <div>
            <button type="submit">Submit</button>
          </div>
        </div>
      </form>
      {days <= 0 && <h3>The entered number must be a positive integer.</h3>}
    </>
  );
};

export const PreviewModal = ({
  previewOpen,
  closeModal,
  formFields,
  generatingThumb,
  thumbGenerationIsComplete,
}) => {
  return (
    <Modal
      title="Preview Itinerary Map"
      open={previewOpen}
      onOk={closeModal}
      onCancel={closeModal}
      width={"100%"}
    >
      <PreviewMap
        mapPosition={[27.7090302, 85.284933]}
        generatingThumb={generatingThumb}
        thumbGenerationIsComplete={thumbGenerationIsComplete}
        polylineCoordinates={polyline.decode(
          mergePolylines(
            Object.keys(formFields)
              .map((day) =>
                Object.keys(formFields[day]).map((stop) => formFields[day][stop].encoded_polyline)
              )
              .flat()
          )
        )}
        geojsonData={createGeoJSON(formFields)}
      />
    </Modal>
  );
};

export const ItineraryValues = ({
  setFormFields,
  generateRouteInfo,
  setChosenItem,
  chosenItem,
  day_count,
  formFields,
  setValues,
  handleDestinationChange,
}) => {
  const [searchResults, setSearchResults] = useState({
    origin: [],
    destination: [],
  });
  const handleSearch = async (inputValue, location) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${inputValue}&format=json&addressdetails=1`
      );
      const places = response.data;
      setSearchResults({ ...searchResults, [location]: places });
    } catch (error) {
      console.error("Error fetching places:", error);
    }
  };
  const debouncedHandleSearch = useMemo(
    () =>
      debounce((inputValue, location) => {
        handleSearch(inputValue, location);
      }, 500),
    []
  );
  useEffect(() => {
    return () => {
      debouncedHandleSearch.cancel();
    };
  }, [debouncedHandleSearch]);
  const handleResultClick = (selectedPlace, stop_count, place) => {
    setValues(parseInt(day_count), parseInt(stop_count), `${place}_coordinate`, [
      selectedPlace.lat,
      selectedPlace.lon,
    ]);
    setValues(parseInt(day_count), parseInt(stop_count), place, selectedPlace.name);
  };

  return (
    <Collapse
      activeKey={parseInt(chosenItem?.stop - 1)}
      onChange={(v) => {
        if (!v) {
          setChosenItem({ day: day_count });
        } else if (v) {
          setChosenItem({ day: day_count, stop: parseInt(v) + 1 });
        }
      }}
      accordion
    >
      {Object.keys(formFields[day_count]).map((stop_count, idx) => {
        const values = formFields[day_count][stop_count];
        return (
          <Collapse.Panel
            key={idx}
            header={
              <div>
                <span>Stop {stop_count}</span>
              </div>
            }
          >
            {stop_count !== "1" && (
              <Popconfirm
                placement="topLeft"
                title="Are you sure you want to remove this?"
                description={`Delete Itinerary for day ${day_count}`}
                okText="Yes"
                cancelText="No"
                onCancel={() => {}}
                onConfirm={() => {
                  const newFormFields = { ...formFields[day_count] };
                  delete newFormFields[stop_count];
                  const newKeys = Object.keys(newFormFields).sort();
                  for (let i = 0; i < newKeys.length; i++) {
                    const currentKey = newKeys[i];
                    const newKey = (i + 1).toString();
                    if (currentKey !== newKey) {
                      newFormFields[newKey] = newFormFields[currentKey];
                      delete newFormFields[currentKey];
                    }
                  }
                  setChosenItem({ day: day_count, stop: 1 });
                  setFormFields({ ...formFields, [day_count]: newFormFields });
                }}
              >
                <Button
                  danger
                  style={{ marginBottom: 10 }}
                  onClick={() => {
                    // setModalOpen(day_count)
                  }}
                >
                  Delete Stop {stop_count}
                </Button>
              </Popconfirm>
            )}
            <Form layout="vertical">
              <Form.Item label="Title">
                <Input
                  placeholder="Itinerary Title"
                  allowClear
                  onChange={(e) => {
                    setValues(
                      parseInt(day_count),
                      parseInt(stop_count),
                      "itinerary_title",
                      e.target.value
                    );
                  }}
                  value={values.itinerary_title}
                />
              </Form.Item>
              <Form.Item label="Description">
                <TextArea
                  allowClear
                  value={values.itinerary_description}
                  placeholder="Itinerary description"
                  onChange={(value) => {
                    setValues(
                      parseInt(day_count),
                      parseInt(stop_count),
                      "itinerary_description",
                      value
                    );
                  }}
                />
              </Form.Item>
              <Row>
                <Col span="12">
                  <Form.Item label="Meals">
                    <Input
                      placeholder="Meals"
                      value={values.meals}
                      onChange={(e) => {
                        setValues(
                          parseInt(day_count),
                          parseInt(stop_count),
                          "meals",
                          e.target.value
                        );
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span="12">
                  <Form.Item label="Accommodation">
                    <Input
                      placeholder="Accommodation"
                      value={values.accommodation}
                      onChange={(e) => {
                        setValues(
                          parseInt(day_count),
                          parseInt(stop_count),
                          "accommodation",
                          e.target.value
                        );
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span="12">
                  <Form.Item label="Origin">
                    <Input
                      placeholder="Origin"
                      value={values.origin}
                      onBlur={(e) =>
                        setTimeout(() => setSearchResults({ origin: [], destination: [] }), 300)
                      }
                      onClick={(e) => debouncedHandleSearch(e.target.value, "origin")}
                      onChange={(e) => {
                        setValues(
                          parseInt(day_count),
                          parseInt(stop_count),
                          "origin",
                          e.target.value
                        );
                        debouncedHandleSearch(e.target.value, "origin");
                      }}
                    />
                  </Form.Item>
                  {searchResults["origin"].length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 100,
                        backgroundColor: "white",
                        marginTop: -20,
                      }}
                    >
                      {searchResults["origin"].map((result) => (
                        <div
                          key={result.place_id}
                          style={{
                            border: "1px solid #ccc",
                            cursor: "pointer",
                            padding: 5,
                          }}
                          onClick={() => handleResultClick(result, stop_count, "origin")}
                        >
                          {result.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </Col>
                <Col span="12">
                  <Form.Item label="Destination">
                    <Input
                      placeholder="Destination"
                      value={values.destination}
                      onBlur={(e) =>
                        setTimeout(() => setSearchResults({ origin: [], destination: [] }), 300)
                      }
                      onClick={(e) => debouncedHandleSearch(e.target.value, "destination")}
                      onChange={(e) => {
                        setValues(
                          parseInt(day_count),
                          parseInt(stop_count),
                          "destination",
                          e.target.value
                        );
                        debouncedHandleSearch(e.target.value, "destination");
                      }}
                    />
                  </Form.Item>
                  {searchResults["destination"].length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 100,
                        backgroundColor: "white",
                        marginTop: -20,
                      }}
                    >
                      {searchResults["destination"].map((result) => (
                        <div
                          key={result.place_id}
                          style={{
                            border: "1px solid #ccc",
                            cursor: "pointer",
                            padding: 5,
                          }}
                          onClick={() => handleResultClick(result, stop_count, "destination")}
                        >
                          {result.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
              <Row>
                <Col span="12">
                  <Form.Item label="Duration">
                    <Input
                      placeholder="Duration"
                      value={values.duration}
                      onChange={(e) => {
                        setValues(
                          parseInt(day_count),
                          parseInt(stop_count),
                          "duration",
                          e.target.value
                        );
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col span="12">
                  <Form.Item
                    label="Mode of Transportation"
                    name="Mode of Transportation"
                    rules={[
                      {
                        required: true,
                        message: "Please input!",
                      },
                    ]}
                  >
                    <select
                      value={values.travel_mode || DEFAULT_TRAVEL_MODE}
                      onChange={(e) => {
                        setValues(day_count, stop_count, "travel_mode", e.target.value);
                        generateRouteInfo(e.target.value);
                      }}
                      required
                      placeholder="Select Mode of Transportation"
                    >
                      <option value="car">Car</option>
                      <option value="foot">Foot</option>
                      <option value="bike">Bike</option>
                      <option value="air">Air (Plane / Helicopter) </option>
                    </select>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Collapse.Panel>
        );
      })}
    </Collapse>
  );
};

export const mergePolylines = (polylines) => {
  const mergedPoints = polylines
    .filter((i) => i)
    ?.reduce((acc, encoded_polyline) => {
      const decodedPoints = decode(encoded_polyline);
      acc.push(...decodedPoints);
      return acc;
    }, []);
  const mergedEncodedPolyline = encode(mergedPoints);
  return mergedEncodedPolyline;
};

export const DATA_TEMPLATE = {
  origin: "",
  destination: "",
  origin_elevation: null,
  destination_elevation: null,
  travel_mode: "car",
  encoded_polyline: "",
  origin_coordinate: null,
  destination_coordinate: null,
  duration: null,
  accommodation: null,
  meals: null,
  itinerary_title: null,
  itinerary_description: null,
  gallery: null,
};

export const DEFAULT_SELECTED_DAY = 1;
export const DEFAULT_SELECTED_STOP = 1;

export const createGeoJSON = (data) => {
  const features = [];
  for (const routeId in data) {
    for (const legId in data[routeId]) {
      const route = data[routeId][legId];
      const coordinates = [route.origin_coordinate, route.destination_coordinate];
      const feature = (coordinates) => ({
        type: "Feature",
        properties: {
          origin: route.origin,
          destination: route.destination,
          origin_elevation: route.origin_elevation,
          destination_elevation: route.destination_elevation,
          travel_mode: route.travel_mode,
        },
        geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        id: routeId + legId,
      });
      if (route.destination_coordinate) {
        features.push(feature([route.destination_coordinate[1], route.destination_coordinate[0]]));
      }
      if (route.origin_coordinate) {
        features.push(feature([route.origin_coordinate[1], route.origin_coordinate[0]]));
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: features,
  };
};
