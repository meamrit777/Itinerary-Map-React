import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DATA_TEMPLATE,
  DEFAULT_SELECTED_DAY,
  DEFAULT_SELECTED_STOP,
  createGeoJSON,
  mergePolylines,
} from "./ItineraryFormNewSupportComponents";
import { useGetItineraryByPackageIdQuery } from "../../../redux/slice/itinerary/itineraryApiSlice";
import { Spin } from "antd";
import polyline from "polyline-encoded";
import PreviewMap from "../../Common/preview-map";

const CustomPreviewMap = () => {
  let params = useParams();
  const [formFields, setFormFields] = useState({
    1: {
      1: {
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
        gallery_media: null,
      },
    },
  });

  const { data: itinerarys, isLoading: loading } =
    useGetItineraryByPackageIdQuery(params.id);
  let isUpdateForm = true;

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
  const [formFieldsReady, setFormFieldsReady] = useState(false);
  useEffect(() => {
    if (!isUpdateForm || loading) {
      return;
    }

    let itinerariesDetails = itinerarys?.details || [];
    const isValid = validateItineraryDetails(itinerariesDetails);

    const structuredItineraries = itinerariesDetails.reduce(
      (acc, itinerary) => {
        const day = itinerary.itinerary_day;
        if (!acc[day]) {
          acc[day] = {};
        }
        const stopNumber = Object.keys(acc[day]).length + 1;

        acc[day][stopNumber] = {
          ...itinerary,
          origin:
            isValid && itinerary.origin !== "null" ? itinerary.origin : "",
          destination:
            isValid && itinerary.destination !== "null"
              ? itinerary.destination
              : "",
          origin_elevation:
            isValid && itinerary.origin_elevation !== "null"
              ? parseInt(itinerary.origin_elevation)
              : null,
          destination_elevation:
            isValid && itinerary.destination_elevation !== "null"
              ? parseInt(itinerary.destination_elevation)
              : null,
          destination_coordinate:
            isValid && itinerary.destination_coordinate !== "null"
              ? itinerary.destination_coordinate.split(",")
              : null,
          origin_coordinate:
            isValid && itinerary.origin_coordinate !== "null"
              ? itinerary.origin_coordinate.split(",")
              : null,
          encoded_polyline:
            isValid && itinerary.encoded_polyline !== "null"
              ? itinerary.encoded_polyline
              : "",
          duration:
            isValid && itinerary.duration !== "null"
              ? itinerary.duration
              : null,
          distance:
            isValid &&
            itinerary.distance !== "null" &&
            itinerary.distance !== "undefined"
              ? itinerary.distance
              : null,
        };

        return acc;
      },
      {}
    );

    const formFieldData =
      Object.keys(structuredItineraries).length === 0
        ? {
            [DEFAULT_SELECTED_DAY]: { [DEFAULT_SELECTED_STOP]: DATA_TEMPLATE },
          }
        : structuredItineraries;

    setFormFields(formFieldData);
    setFormFieldsReady(true);
  }, [isUpdateForm, itinerarys, loading]);

  if (loading || !formFieldsReady) {
    return <Spin />;
  } else {
    return (
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
      </div>
    );
  }
};

export default CustomPreviewMap;
