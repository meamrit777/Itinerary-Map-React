import Modal from "react-modal";
import PreviewMap from "../Common/preview-map";
import { createGeoJSON, mergePolylines } from "./ItineraryFormNewSupportComponents";
import polyline from "polyline-encoded";
import { Button, Spin } from "antd";

const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "60%",
  },
};
Modal.setAppElement("#root");

function ModalWithMap({
  openMapModal,
  onGenerate,
  closeMapModal,
  formFields,
  generatingThumb,
  thumbGenerationIsComplete,
  thumbnailLoading,
}) {
  return (
    <Modal isOpen={openMapModal} onRequestClose={closeMapModal} style={customStyles}>
      <Spin spinning={thumbnailLoading}>
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
        <Button onClick={closeMapModal}>Close</Button>
        <Button onClick={onGenerate}>Generate</Button>
      </Spin>
    </Modal>
  );
}
export default ModalWithMap;
