import { useEffect } from "react";
import c3 from "c3";
import "c3/c3.css";
import "./chart.css";
const Chart = ({ chartData }) => {
  useEffect(() => {
    const elevationData = chartData.itinerary.map((item) => item.elevation);
    const elevationLabels = chartData.itinerary.map((item) => `Day ${item.id}`);
    const labels = chartData.itinerary.map((item) => ` ${item.title} `);
    c3.generate({
      bindto: "#elevation-chart",

      data: {
        x: "x",
        columns: [
          ["x", ...elevationLabels],
          ["Elevation", ...elevationData],
        ],
        type: "area-spline",
        labels: {
          format: function (v, id, i, j) {
            // Custom label formatting function
            // v: Value of the data point
            // id: ID of the data point
            // i: Index of the x-axis
            // j: Index of the data point
            // Return formatted label
            return `${v}(m)`;
          },
        },
      },
      color: {
        pattern: ["green"],
      },
      area: {
        zerobased: true, // Fills the area below the line
      },
      axis: {
        x: {
          type: "category",
          tick: {
            // rotate: 75,
            multiline: false,
            centered: true,
          },
        },
        y: {
          show: false,
        },
      },
      legend: {
        show: false,
      },
      title: {
        text: "Elevation Chart",
      },
      point: {
        show: true,
      },
      tooltip: {
        // horizontal: false,
        format: {
          title: function (d) {
            return labels[d];
          },
        },
      },
    });
  }, []);
  return (
    <div className="chartContainer" id="elevation-chart-container">
      <div className="elevationChart" id="elevation-chart"></div>
    </div>
  );
};
export default Chart;
