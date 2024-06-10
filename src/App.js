import { useState } from "react";
import "./App.css";
import MapDataForm from "./components/MapResolution/MapDataForm";
import {
  DATA_TEMPLATE,
  DEFAULT_SELECTED_DAY,
  DEFAULT_SELECTED_STOP,
} from "./components/MapResolution/ItineraryFormNewSupportComponents";

function App() {
  const [itinerarythumb, setItinerarythumb] = useState(null);
  const [formFields, setFormFields] = useState({
    [DEFAULT_SELECTED_DAY]: { [DEFAULT_SELECTED_STOP]: DATA_TEMPLATE },
  });

  return (
    <div className="App">
      <header className="App-header">
        {/* isUpdateForm */}
        <MapDataForm {...{ itinerarythumb, setItinerarythumb, formFields, setFormFields }} />
      </header>
    </div>
  );
}

export default App;
