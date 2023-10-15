require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Search",
  "esri/widgets/Legend",
  "esri/symbols/SimpleFillSymbol",
], (
  Map,
  MapView,
  FeatureLayer,
  GraphicsLayer,
  Search,
  Legend,
  SimpleFillSymbol,
) => {
  // Create a GraphicsLayer for displaying selected counties with a yellow outline
  const selectedCountiesLayer = new GraphicsLayer();

  // Create a FeatureLayer with no renderer initially
  const featureLayer = new FeatureLayer({
    url: "https://services.arcgis.com/GL0fWlNkwysZaKeV/arcgis/rest/services/Minn_2012_2020_Electoral_Counties/FeatureServer",
    outFields: ["*"],
    definitionExpression: "ST IS NOT NULL AND Percent_Dem_2020 IS NOT NULL AND Percent_GOP_2020 IS NOT NULL",
  });

  // Create a map and view
  const map = new Map({
    basemap: "gray-vector", // Replace with the basemap you want
    layers: [featureLayer, selectedCountiesLayer],
  });

  const view = new MapView({
    container: "viewDiv", // Replace with the ID of your container
    map: map,
    zoom: 4,
    center: [-97.0, 39.5],
  });

  const searchWidget = new Search({
    view: view,
    includeDefaultSources: false,
    maxResults: 65,
    sources: [
      {
        layer: featureLayer,
        searchFields: ["ST"],
        displayField: "ST",
        exactMatch: false,
        outFields: ["*"],
        name: "ST",
        placeholder: "e.g. wv",
        autoNavigate: true,
      },
    ],
  });

  view.ui.add(searchWidget, "top-left");

  // Function to populate the sidebar with selected counties and their values
  function updateSidebar(selectedCounties) {
    const countyList = document.getElementById("list_counties");
    countyList.innerHTML = ""; // Clear the existing list

    selectedCounties.forEach(function (county, index) {
      const attributes = county.attributes;
      const name = attributes.Name;
      const percentDem = Math.round(attributes.Percent_Dem_2020); // Round to the nearest 10
      const percentGOP = Math.round(attributes.Percent_GOP_2020); // Round to the nearest 10

      // Create a list item for each county
      const listItem = document.createElement("li");
      listItem.classList.add("panel-result"); // Apply styling

      listItem.innerHTML = `
        ${name} (Dem: ${percentDem}%, GOP: ${percentGOP}%)
      `;

      // Add the list item to the county list
      countyList.appendChild(listItem);
    });
  }



  // Define a symbol for selected counties
  const selectedCountySymbol = new SimpleFillSymbol({
    outline: {
      color: [255, 255, 0, 1], // Yellow outline color
      width: 2,
    },
  });


  // "search-complete" Event Handler
  searchWidget.on("search-complete", function (event) {
    if (event.results && event.results.length > 0) {
      const userInput = event.results[0].results;

      const selectedCounties = userInput.map(function (result) {
        return result.feature;
      });


      updateSidebar(selectedCounties);


      // Clear the existing selected counties
      selectedCountiesLayer.removeAll();

      selectedCounties.forEach(function (county) {
        // Set the custom symbol for selected counties
        county.symbol = selectedCountySymbol;
        selectedCountiesLayer.add(county);
      });

      // Zoom to the extent of selected counties
      zoomToSelectedCounties(selectedCounties);
    }
  });

  // // Add error handling to capture and log any search errors
  // searchWidget.on("search-error", function (error) {
  //   console.error("Search Error:", error);
  // });

  // Add a click event listener to the list items in the sidebar
  const listNode = document.getElementById("list_counties");
  listNode.addEventListener("click", function (event) {
    const target = event.target;
    const resultId = target.getAttribute("data-result-id");

    if (resultId) {
      // Retrieve the feature associated with the clicked list item
      const feature = selectedCounties[parseInt(resultId, 10)];

      if (feature) {
        // Use the FeatureLayerView to select the feature
        featureLayer
          .queryObjectIds({
            where: `OBJECTID = ${feature.attributes.OBJECTID}`,
          })
          .then((objectIds) => {
            if (objectIds.length > 0) {
              view.goTo({
                target: feature.geometry.extent,
              });
              featureLayer.highlight(objectIds);
            }
          });
      }
    }
  });


  // Add the legend widget
  const legend = new Legend({
    view: view,
    layerInfos: [
      {
        layer: featureLayer,
        title: "Legend",
      },
    ],
  });

  view.ui.add(legend, "bottom-left");
});