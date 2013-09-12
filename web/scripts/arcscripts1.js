/**
 * Created with IntelliJ IDEA.
 * User: jcorrea
 * Date: 8/1/13
 * Time: 1:18 PM
 * To change this template use File | Settings | File Templates.
 */


/* require statements */
dojo.require("esri.map");
dojo.require("esri.tasks.query");
dojo.require("esri.tasks.QueryTask");
dojo.require("esri.dijit.Legend");
dojo.require("esri.dijit.AttributeInspector-all");
dojo.require("esri.arcgis.utils");

dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.layers.Field");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dijit.dijit");
dojo.require("dijit.dijit-all");
dojo.require("dojo.parser");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.AccordionContainer");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");




/* proxy workaround */
esri.config.defaults.io.proxyUrl = location.protocol.toString() +
    "//" + location.host.toString() +
    location.pathname.toString().replace('index.html', '') + "proxy.ashx";

/* variables */
var townshipLayer;
var map;
var currentState = "ND";
var activeCounty;
var ndOperationalLayer;
var attInspector;




/**
 * All functions for map
 * interaction and data loading **/
function init() {

    map = new esri.Map("map", {
        basemap:"topo",
        center :[-98.882818, 48.116371],
        zoom   :13
    });



    ndOperationalLayer = new esri.layers.FeatureLayer("http://fema-services2.esri.com/arcgis/rest/services/FEMA_R8/PATracking/FeatureServer/1", {
        mode     :esri.layers.FeatureLayer.MODE_ONDEMAND,
        outFields:["DISASTER_NUMBER", "PW_NUMBER", "MAP_SITE", "COMMENTARY", "DATE_OBLIGATED", "REVIEW_STATUS", "REPAIR_TYPE_ID"]
    });

    ndTownshipLayer = new esri.layers.FeatureLayer("http://fema-services2.esri.com/arcgis/rest/services/FEMA_R8/PATracking/FeatureServer/3");

    map.addLayer(ndTownshipLayer);


    var drDijit = new dijit.form.TextBox({
        regExp : "\\d{1-5}",
        disabled: true,
        readonly: true
    });

    var pwDijit = new dijit.form.TextBox({
        regExp : "\\d{1-5}",
        disabled: true,
        readonly: true
    });

    var msDijit = new dijit.form.TextBox({
        disabled: true,
        readonly: true
    });


    var layerInfo = [
        {'featureLayer': ndOperationalLayer,
            'showAttachments': false,
            'isEditable': true,
            'showDeleteButton': false,
            'fieldInfos': [
                {'fieldName': 'DISASTER_NUMBER', 'tooltip': 'Disaster', 'label': 'Disaster:', 'isEditable': false, 'customField':drDijit },
                {'fieldName': 'PW_NUMBER', 'tooltip': 'Project Worksheet', 'label':  'Project', 'customField':pwDijit },
                {'fieldName': 'MAP_SITE','tooltip': 'Map Site', 'label': 'Map Site:', 'isEditable': false, 'customField':msDijit},
                {'fieldName': 'COMMENTARY','tooltip': this.innerHTML, 'label': 'Notes:', 'isEditable': true, 'stringFieldOption':esri.dijit.AttributeInspector.STRING_FIELD_OPTION_TEXTAREA },
                {'fieldName': 'REPAIR_TYPE_ID', 'label': 'Repair :', 'isEditable': true},
                {'fieldName': 'DATE_OBLIGATED', 'label': 'Date Obligated:', 'isEditable': true},
                {'fieldName': 'REVIEW_STATUS', 'label': 'Review Status:', 'isEditable': true}
            ]}
    ]

    //ndOperationalLayer.setSelectionSymbol(new esri.symbol.SimpleFillSymbol());

    dojo.connect(map, 'onLayersAddResult', function (results) {
        //add the legend
        var legend = new esri.dijit.Legend({
            map       :map,
            layerInfos:[
                {layer:ndOperationalLayer, title:"PA Tracking Points"}
            ]
        }, "legendDiv");
        legend.startup();

        attInspector = new esri.dijit.AttributeInspector({layerInfos:layerInfo}, "attributeEdit" );
        attInspector.startup();


        //add a save button next to the delete button
        var saveButton = new dijit.form.Button({ label: "Save", "class": "saveButton"});
        dojo.place(saveButton.domNode, attInspector.deleteBtn.domNode, "after");

        saveButton.on("click", function(){
            ndOperationalLayer.applyEdits(null, [ndOperationalLayer], null);
        });

        attInspector.on("attribute-change", function(evt) {
            //store the updates to apply when the save button is clicked
            var updateFeature = evt.feature;
            updateFeature.attributes[evt.fieldName] = evt.fieldValue;
            updateFeature.getLayer().applyEdits(null, [updateFeature], null);

        });

    });



    var selectQuery = new esri.tasks.Query();

    ndOperationalLayer.on("click", function(e){
        dojo.byId("details").innerHTML = "";
        selectQuery.objectIds = [e.graphic.attributes.ID];
        ndOperationalLayer.selectFeatures(selectQuery);

    });

    map.addLayers([ndOperationalLayer]);

}
/* init() */

function callStateCounties(stateName) {

    /* determine the state of focus */
    if (stateName == "North Dakota") {

        currentState = "ND";
        queryCounty(stateName);

    } else {


        currentState = "SD";
        queryCounty(stateName);

    } // if / else
}
/* callIt() */


function queryCounty(stateName) {

    var queryTask = new esri.tasks.QueryTask
        ("http://fema-services2.esri.com/arcgis/rest/services/FEMA_R8/PATracking/FeatureServer/6");

    var query = new esri.tasks.Query();

    query.returnGeometry = false;
    query.outFields = ["STATE_NM", "COUNTY", "STATE"];
    query.where = "STATE_NM =  '" + stateName + "'";
    queryTask.execute(query, populateCountyCombo);

}

function populateCountyCombo(results) {

    //Populate the ComboBox with unique values
    var zone;
    var values = [];
    var testVals = {};

    //Loop through the QueryTask results and populate an array with the unique values
    var features = results.features;
    dojo.forEach(features, function (feature) {

        zone = feature.attributes.COUNTY;

        if (!testVals[zone]) {
            testVals[zone] = true;
            values.push({ name: zone });
        }
    });

    //ComboBox's data source
    var dataItems = {
        identifier: 'name',
        label: 'name',
        items: values
    };

    var store = new dojo.data.ItemFileReadStore({data: dataItems});

    dijit.byId("cbCounty").set("store", store);
    dijit.byId("cbCounty").select(0);

}

function zoomToTownship(township) {

    var queryTask = new esri.tasks.QueryTask(townshipLayer);

    var query = new esri.tasks.Query();
    query.where = "NAME = '" + township + "' AND COUNTY ='" + activeCounty + "'";
    query.returnGeometry = true;

    queryTask.execute(query, zoom);
    dojo.setStyle("legendDiv", {
        "opacity": 1
    });


}

function zoom(results) {

    var feature = results.features[0];
    var extent = feature.geometry.getExtent().expand(1.7);

    map.setExtent(extent);


}

function queryTownship(countyName) {

    var queryTask;
    var field1;
    var field2;
    if (currentState == "ND") {

        townshipLayer = "http://fema-services2.esri.com/arcgis/rest/services/FEMA_R8/PATracking/FeatureServer/3";
        queryTask = new esri.tasks.QueryTask(townshipLayer);
        field1 = "NAME";
        field2 = "COUNTY";

    } else if (currentState == "SD") {

        townshipLayer = "http://fema-services2.esri.com/arcgis/rest/services/FEMA_R8/PATracking/FeatureServer/5";
        queryTask = new esri.tasks.QueryTask(townshipLayer);
        field1 = "Name";
        field2 = "County";
    }

    activeCounty = countyName;

    var query = new esri.tasks.Query();


    query.returnGeometry = false;
    query.outFields = [field1, field2 ];
    query.where = field2 + " = '" + countyName + "'";
    queryTask.execute(query, populateTownshipCombo);


}

function populateTownshipCombo(results) {
    //Populate the ComboBox with unique values
    var zone;
    var values = [];
    var testVals = {};

    //Loop through the QueryTask results and populate an array with the unique values
    var features = results.features;
    dojo.forEach(features, function (feature) {


        if (currentState == "ND") {
            zone = feature.attributes.NAME;
        } else {
            zone = feature.attributes.Name;
        }

        if (!testVals[zone]) {
            testVals[zone] = true;
            values.push({ name: zone });
        }
    });

    //ComboBox's data source
    var dataItems = {
        identifier: 'name',
        label: 'name',
        items: values
    };

    var store = new dojo.data.ItemFileReadStore({data: dataItems});

    dijit.byId("township").set("store", store);
}

dojo.addOnLoad(init);






