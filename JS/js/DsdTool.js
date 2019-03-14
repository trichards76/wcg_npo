//[{"SP_NAME": "Kliprand SP"},{"SP_NAME": "Matzikama NU"}] sample json
define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    'dojo/_base/Color',
    "dojo/has",
    "esri/kernel",
    "esri/config",
    "dijit/_WidgetBase",
    "dijit/a11yclick",
    "dijit/_TemplatedMixin",
    "dojo/on",
    "dojo/dom",
    "dojo/query",
    "dojo/mouse",
    "dojo/Deferred",
    "dojo/keys",
    // load template
    "dojo/text!application/dijit/templates/dsdTool.html",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dijit/Tooltip",
    "esri/request",
    "esri/geometry/webMercatorUtils",
    "esri/SpatialReference",
    "esri/tasks/ProjectParameters",
    "esri/urlUtils",
    "dijit/Dialog",
    "dijit/ConfirmDialog",
    "dojo/number",
    "dojo/_base/event",
    // main tools
    //####
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/kernel',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/toolbars/draw',
    'esri/toolbars/edit',
    'esri/graphic',
    'esri/graphicsUtils',
    'esri/geometry/Geometry',
    'esri/geometry/Extent',
    'esri/geometry/Point',
    'esri/tasks/PrintTask',
    'esri/tasks/PrintParameters',
    'esri/tasks/PrintTemplate',

    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/TextSymbol',
    'esri/symbols/Font',
    'esri/renderers/jsonUtils',
    'esri/urlUtils',

    'dojo/parser',
    'dojo/promise/all',

    'dojox/uuid/generateRandomUuid',

    'config/defaultMap',
    'dojo/topic',

    "application/Converter",
    "esri/SnappingManager",

    "esri/tasks/Geoprocessor",
    //####

    "dojo/domReady!"

], function(
    Evented, declare, lang, array, Color, has, esriNS, esriConfig, _WidgetBase, a11yclick, _TemplatedMixin, on, dom, query, mouse, Deferred, keys, dijitTemplate,
    domClass, domStyle, domAttr, domConstruct, Tooltip, esriRequest, webMercatorUtils, SpatialReference, ProjectParametrs, urlUtils,
    Dialog, ConfirmDialog, number, event, GraphicsLayer, FeatureLayer, esriNS, Query, QueryTask, Draw, Edit, Graphic, graphicsUtils, Geometry, Extent, Point, PrintTask, PrintParameters, PrintTemplate,
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Font, rendererJsonUtil, urlUtils, parser, all, uuid, defaultMap, topic, Converter, SnappingManager, Geoprocessor
) {

    var Widget = declare("esri.dijit.dsdTool", [_WidgetBase, _TemplatedMixin, Evented], {
        templateString: dijitTemplate,
        _editTool: null,
        _drawTool: null,
        _highlightedPolygonSymbol: null,
        _sdaColors: [],
        _sdaSymbols: [],
        _newlySelectedPolygonSymbol: null,
        _graphicsLayer: null,
        _defaultGraphicsLayer: null,
        _labelLayer: null,
        _tempVertexLayer: null,
        _hasSaved: null,
        _jsonReturnData: null,
        _generatedGUID: null,
        _generatedImage: null,
        _printparams: null,
        _printTask: null,
        _printTemplate: null,
        _editObjectID: "",
        _editGUID: null,
        _editCreateDate: null,
        options: {
            theme: "dsdTool",
            dialog: null,
            useExtent: true,
            embedVisible: false,
            map: null,
            url: window.location.href,
            image: "",
            title: window.document.title,
            visible: false,
            //dsdid: this.config.dsd_UniqueID,
            //dsdBoundaryLabel: this.config.dsd_BoundaryLabel,
            serviceUrls: this.config.dsdServices,
            serviceHelpers: this.config.dsdPrintServices,
            dsdJson: this.config.dsdJson,
            dsdTab: this.config.dsdTab,
            //dsdAction: this.config.dsd_Action,
            defaultSymbols: this.config.defaultSymbols
        },
        _makeRandomGuid: function() {
            return "{" + uuid().toUpperCase() + "}";
        },

        _makeDate: function() {
            //Format Expected for Featureclass Date Field: "M-D-Y H:M:S"
            var newDate = new Date();

            var month = (newDate.getMonth() + 1).toString();
            var day = newDate.getDate().toString();
            var year = newDate.getFullYear().toString();
            var hours = (newDate.getHours() - 2).toString();
            var minutes = newDate.getMinutes().toString();
            var seconds = newDate.getSeconds().toString();

            var dateNow = month + "-" + day + "-" + year + " " + hours + ":" + minutes + ":" + seconds;

            return dateNow;
        },
        //editied: jfeeke: 15/10/2018
        _convertDate: function(oldDate) {
            //Format Expected for Featureclass Date Field: "M-D-Y H:M:S"
            var newDate = new Date(oldDate);

            var month = (newDate.getMonth() + 1).toString();
            var day = newDate.getDate().toString();
            var year = newDate.getFullYear().toString();
            var hours = (newDate.getHours() - 2).toString();
            var minutes = newDate.getMinutes().toString();
            var seconds = newDate.getSeconds().toString();

            var dateNow = month + "-" + day + "-" + year + " " + hours + ":" + minutes + ":" + seconds;

            return dateNow;
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {

            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // widget node
            this.domNode = srcRefNode;

            // properties
            this.set("theme", defaults.theme);
            this.set("url", defaults.url);
            this.set("visible", defaults.visible);
            this.set("dialog", defaults.dialog);
            this.set("image", defaults.image);
            this.set("title", defaults.title);
            //set map, dsdid, urls for services,dsdAction (if action is null, default to create)

            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            // embed class
            var embedClasses = "embed-page";
            if (!defaults.embedVisible) {
                embedClasses = "embed-page hide";
            }

            //set the symbology
            //this._highlightedPolygonSymbol = new SimpleFillSymbol(options.defaultSymbols.highlightedPolygonSymbols);
            //this._newlySelectedPolygonSymbol = new SimpleFillSymbol(options.defaultSymbols.newlySelectedPolygonSymbols);
        },
        // bind listener for button to action
        postCreate: function() {
            this.inherited(arguments);
        },
        // start widget. called by user
        startup: function() {
            this._init();
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */

        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _getProjectedExtent: function(map) {

            var deferred = new Deferred();
            // include extent in url
            if (this.useExtent && map) {
                // get map extent in geographic
                if (map.geographicExtent) {
                    deferred.resolve(map.geographicExtent);
                } else {
                    var sr = new SpatialReference(4326);
                    if (webMercatorUtils.canProject(map.extent, sr)) {
                        deferred.resolve(webMercatorUtils.project(map.extent, sr));
                    } else {
                        var params = new ProjectParametrs();
                        params.geometries = [map.extent];
                        params.outSR = sr;
                        esriConfig.defaults.geometryService.project(params).then(function(results) {
                            if (results && results.length && results.length > 0) {
                                deferred.resolve(results[0]);
                            } else {
                                deferred.resolve();
                            }
                        });
                    }
                }
            } else {
                deferred.resolve();
            }
            return deferred.promise;
        },
        _init: function() {
            // set sizes for select box

            var dialog = new Dialog({
                title: "dsd Tool",
                draggable: false
            }, domConstruct.create("div"));
            this.set("dialog", dialog);

            this._graphicsLayer = new GraphicsLayer();
            this._defaultGraphicsLayer = new GraphicsLayer();
            this.map.addLayer(this._graphicsLayer);
            this._drawTool = new Draw(this.map);

            //initialise print task
            //check if the printtask is sync or async
            esriRequest({
                url: this.serviceHelpers.url,
                content: {
                    f: 'json'
                },
                handleAs: 'json',
                callbackParamName: 'callback',
                load: lang.hitch(this, function(data) {
                    //setup the printtask
                    this._printTask = new PrintTask(this.serviceHelpers.url, {
                        async: data.executionType === 'esriExecutionTypeAsynchronous'
                    });

                    this._template = new PrintTemplate();
                    this._template.exportOptions = {
                        width: 600,
                        height: 600,
                        dpi: 96
                    };
                    this._template.format = "PNG32";
                    this._template.layout = "MAP_ONLY",
                        this._template.preserveScale = false;

                    this._printparams = new PrintParameters();
                    this._printparams.map = this.map;
                    this._printparams.template = this._template;

                }),
                error: lang.hitch(this, function(err) {
                    //TODO:: alert the user that the print service cannot be reached
                })
            });

            // wire up events
            //click on the polygon button
            this.own(on(this._polygonButton, a11yclick, lang.hitch(this, function() {
                this._toggleEdit();
            })));

            //click on the save button
            this.own(on(this._saveButton, a11yclick, lang.hitch(this, function() {
                var currentGraphics = this._graphicsLayer.graphics;
                //zoom to current graphic for the purpose of creating the image
                this._zoomToBoundary(currentGraphics, true);
            })));

            //click on the clear button
            this.own(on(this._clearButton, a11yclick, lang.hitch(this, function() {
                this._clear();
            })));

            //click on graphic
            this.own(on(this._graphicsLayer, a11yclick, lang.hitch(this, function(graphic) {
                this._graphicClick(graphic);
            })));

            //draw end
            this.own(on(this._drawTool, 'DrawEnd', lang.hitch(this, function(geom) {
                this._drawEnd(geom);
            })));

            //map click (to disable edit toolbar)
            this.own(on(this.map, 'Click', lang.hitch(this, function() {
                this._mapClick();
            })));


            // loaded
            this.set("loaded", true);
            this.emit("load", {});

            //listen for the event where the geoenablement layers are updated
            topic.subscribe('dsdBoundaryUpdate/topic', lang.hitch(this, function() {
                this._sendMessage("Information", "Return Completed Successfully!", "success");

                //:disable all buttons (only 3)
                this._buttonStatus(true, true, true, false, false);

                //:set _hasSaved to true
                this._hasSaved = true;

                //show the busy indicator
                document.getElementById("busyIndicator").style.display = "block";
                //get all the other data
                this._getAllData();
                //busy.className = "boundary-loading-indicator";
            }));
            //listen for the event where the geoenablement layers are updated
            topic.subscribe('dsdBoundaryUpdateFail/topic', lang.hitch(this, function() {
                //if does not Return successfully 
                //:alert message
                this._sendMessage("Information", "Return Failed: Please try Again! If the Problem Persists contact the System Administrator!", "error");
            }));
            //listen for the event where the toolbar div is hidden
            topic.subscribe('dsdBoundaryHiddenToolbar/topic', lang.hitch(this, function() {
                //first check to see if the user was editing so we can stop editing
                var btnPoly = document.getElementById("_polygonButtonIcon");
                if (btnPoly.className == 'esri-icon-grant') {
                    this._editTool.deactivate();
                    this._buttonStatus(false, false, false, false, true);
                }
            }));

            //editied: jfeeke: 15/10/2018
            if (this.dsdTab === "SDA" || this.dsdTab === "IMG") {
				document.getElementById("busyIndicator").style.display = "block";
				
                var json = this.dsdJson;
                var myObject = JSON.parse(json);
                var queryString = "";
                for (i = 0; i < myObject.fieldValues.length; i++) {
                    if (i > 0) {
                        queryString = queryString + " OR " + myObject.fieldName + " = " + myObject.fieldValues[i];
                    } else {
                        queryString = queryString + myObject.fieldName + " = " + myObject.fieldValues[i];
                    }
                }

                //queryString = "dsd_ID = '" + this.dsdid + "' AND (STATUS = " + 1 + ")";
                var queryUrl = this.serviceUrls.dsdnpoSubplaces;
                var queryTaskFilterID = new QueryTask(queryUrl);
                var queryFilterID = new esri.tasks.Query();
                queryFilterID.returnGeometry = true;
                queryFilterID.outFields = ['*'];
                queryFilterID.outSpatialReference = { wkid: this.map.spatialReference };
                queryFilterID.where = queryString;
                var returnResults = queryTaskFilterID.execute(queryFilterID, lang.hitch(this, '_checkdsdBoundaryStatus'));
                returnResults.then(
                    lang.hitch(this, function() {
                        if (returnResults.results[0].features.length >= 1) {
                            var extent = new Extent(returnResults.results[0].features[0].geometry.getExtent());

                            //added setting extent for many geometries
                            for (i = 0; i < returnResults.results[0].features.length; i++) {
                                var graphic = returnResults.results[0].features[i];
                                var attr = returnResults.results[0].features[i].attributes;
                                var sdaField = returnResults.results[0].features[i].attributes.MN_NAME;
                                var sdaColorFound = false;
                                var newSymbol = ""

                                //check for existing color or add if new
                                for (x = 0; x < this._sdaColors.length; x++) {
                                    if (this._sdaColors[x] == sdaField) {
                                        this.options.defaultSymbols.highlightedPolygonSymbols.color = this._sdaColors[sdaField];
                                        newSymbol = new SimpleFillSymbol(this.options.defaultSymbols.highlightedPolygonSymbols);
                                        sdaColorFound = true;
                                    }
                                }
                                if (sdaColorFound == false) {
                                    this._sdaColors[sdaField] = this._randomSymbolColor();
                                    this.options.defaultSymbols.highlightedPolygonSymbols.color = this._sdaColors[sdaField];
                                    newSymbol = new SimpleFillSymbol(this.options.defaultSymbols.highlightedPolygonSymbols);
                                }

                                //add geom to graphics layer
                                var mapGraphic = new Graphic(graphic.geometry, newSymbol, attr);
                                this._graphicsLayer.add(mapGraphic);
                                this._defaultGraphicsLayer.add(mapGraphic);

                                var thisExtent = graphic.geometry.getExtent();
                                extent = extent.union(thisExtent);
                            }

                            this.map.setExtent(extent.expand(1.2));
							
							if (this.dsdTab === "IMG") {
                                this._save();
                            }
							
                        } else {
                            this._sendMessage("Information", "Could not load any Data. Please contact the System Administrator!", "error");
                        }
						
						document.getElementById("busyIndicator").style.display = "none";
                    }), lang.hitch(this, function (err) {
                   document.getElementById("busyIndicator").style.display = "none";

                    this._sendMessage(err);

                }));
            }
        },
        _randomSymbolColor: function() {
            var o = Math.round,
                r = Math.random,
                s = 255;
            return [o(r() * s), o(r() * s), o(r() * s), 175];
        },
        //editied: jfeeke: 15/10/2018
        _checkdsdBoundaryStatus: function(results) {
            if (results.features.length == 0) {
                //no results found
            } else {
                //results found
            }
        },
        _toggleEdit: function() {
            var btnPoly = document.getElementById("_polygonButtonIcon");
            if (btnPoly.className == 'esri-icon-grant') {
                this._buttonStatus(false, true, true, false, true);
            } else {
                this._drawTool.activate(Draw.POINT);
                this._sendMessage("Information", "Please Click a Boundary to include or remove from the selection on the Map", "default");
            }
        },
        _zoomToBoundary: function(graphics, canSave) {
            var extent = graphics[0].geometry.getExtent();

            //added setting extent for many geometries
            for (i = 0; i < graphics.length; i++) {
                var graphic = graphics[i];
                var thisExtent = graphic.geometry.getExtent();
                extent = extent.union(thisExtent);
            }
            this.map.setExtent(extent.expand(2.5));
            if (canSave == true) {
                this._save();
            }
        },
        _save: function() {
            //use a confirm dialog
            var dialog = new ConfirmDialog({
                title: "Confirmation!",
                content: "Would you like to Save(Confirm) your Selected Boundaries? ",
                style: "width: 500px"
            });
            dialog.show();
            dialog.on("Execute", lang.hitch(this, function() {
                var currentGraphic = this._graphicsLayer.graphics;
                if (this.dsdTab == "SDA" || this.dsdTab == "IMG") {
                    //submit the current graphic to the correct feature service
                    console.log("Current Graphic being Selected: ");
                    console.log(currentGraphic);

                    if (!currentGraphic) {
                        // code should not reach this but just in case
                        var myDialog = new Dialog({
                            title: "Warning:",
                            content: "There is no Boundary to Return. Please Select a Boundary via the 'Boundary Select' Tool!",
                            style: "width: 500px"
                        });
                        myDialog.show();
                    } else {
                        //editied: jfeeke: 15/10/2018
                        var currentEditLayer = "not required"; //override the layer value as it is not required in this project
                        if (this.dsdTab === "SDA") {
                            this._insertFeature(currentGraphic, currentEditLayer, "SDA");
                        } else {
                            this._insertFeature(currentGraphic, currentEditLayer, "IMG");
                        }
                    }
                }
            }));
        },
        _insertFeature: function(graphic, layer, editType) {
            //editied: jfeeke: 15/10/2018
            if (editType === "SDA") {
                topic.publish('dsdBoundaryUpdate/topic');
            }
            if (editType === "IMG") {
                topic.publish('dsdBoundaryUpdate/topic');
            }
        },
        _clear: function() {
            var dialog = new ConfirmDialog({
                title: "Warning!",
                content: "Are you Sure you would like to Remove your Selected Boundaries from the Map?",
                style: "width: 500px"
            });
            dialog.show();
            dialog.on("Execute", lang.hitch(this, function() {
                //clear all graphics
                this._graphicsLayer.clear();
                for (x = 0; x < this._defaultGraphicsLayer.graphics.length; x++) {
                    this._graphicsLayer.add(this._defaultGraphicsLayer.graphics[x]);
                }
                this._buttonStatus(false, true, true, false, false);
            }));
        },
        _graphicClick: function(graphic) {
            //functions moved to toggle function
        },
        _drawEnd: function(geom) {
			document.getElementById("busyIndicator").style.display = "block";

            var queryUrl = this.serviceUrls.dsdnpoSubplaces;
            var queryTaskFilterID = new QueryTask(queryUrl);
            var queryFilterID = new esri.tasks.Query();
            queryFilterID.geometry = geom;
            queryFilterID.returnGeometry = true;
            queryFilterID.outFields = ['*'];
            queryFilterID.outSpatialReference = { wkid: this.map.spatialReference };
            queryFilterID.where = "";
            var returnResults = queryTaskFilterID.execute(queryFilterID, lang.hitch(this, '_checkdsdBoundaryStatus'));
            returnResults.then(
                lang.hitch(this, function() {
					document.getElementById("busyIndicator").style.display = "none";
					
                    if (returnResults.results[0].features.length >= 1) {
											
                        //added setting extent for many geometries
                        for (i = 0; i < returnResults.results[0].features.length; i++) {
                            var graphic = returnResults.results[0].features[i];
                            var attr = returnResults.results[0].features[i].attributes;

                            var sdaField = returnResults.results[0].features[i].attributes.MN_NAME;
                            var sdaColorFound = false;
							var sdaColor = "";

                            //check for existing color or add if new
                            for (x = 0; x < this._sdaColors.length; x++) {
                                if (this._sdaColors[x] == sdaField) {
                                    //this._highlightedPolygonSymbol.color = this._sdaColors[sdaField];
                                    this.options.defaultSymbols.highlightedPolygonSymbols.color = this._sdaColors[sdaField];
                                    newSymbol = new SimpleFillSymbol(this.options.defaultSymbols.highlightedPolygonSymbols);
                                    sdaColorFound = true;
                                }
                            }
                            if (sdaColorFound == false) {
                                this._sdaColors[sdaField] = this._randomSymbolColor();
                                //this._highlightedPolygonSymbol.color = this._sdaColors[sdaField];
                                this.options.defaultSymbols.highlightedPolygonSymbols.color = this._sdaColors[sdaField];
                                newSymbol = new SimpleFillSymbol(this.options.defaultSymbols.highlightedPolygonSymbols);
                            }

                            //we will either add or remove the graphic based on if it exists in the the map graphics or not
                            var didFind = false;
                            for (x = 0; x < this._graphicsLayer.graphics.length; x++) {
                                var currAttr = this._graphicsLayer.graphics[x].attributes.SP_NAME;
                                if (currAttr == attr.SP_NAME) {
                                    didFind = true;
                                    this._graphicsLayer.remove(this._graphicsLayer.graphics[x]);
                                }
                            }
                            if (didFind == false) {
                                //add geom to graphics layer
                                var mapGraphic = new Graphic(graphic.geometry, newSymbol, attr);
                                this._graphicsLayer.add(mapGraphic);
                            } else {

                            }
                        }
                    } else {
                        //bypass
                    }
                }), lang.hitch(this, function (err) {
                    document.getElementById("busyIndicator").style.display = "none";
                    this._sendMessage(err);
                })
            );

            //deactivate draw toolbar
            this._drawTool.deactivate();

            this._sendMessage("Information", "N.B. Click the Tickbox to Complete Edits! OR Click the Delete Icon to Clear Edits! OR Click the Save Icon to Return Results & Close the Map", "success");
            this._buttonStatus(false, false, false, true, false);
            //this._showTempVertex(false);
        },
        _buttonStatus: function(poly, save, clear, wasEditing, canEdit) {
            //disable or enable the button
            this._polygonButton.disabled = poly;
            var btnPoly = document.getElementById("_polygonButtonIcon");
            var btnPolyTitle = document.getElementById("_polygonButton");
            if (canEdit == true) {
                // the polygon is in edit vertice mode, this will start the edits
                btnPoly.className = ('esri-icon-edit');
                btnPolyTitle.title = "Edit Boundary";
            } else {
                if (wasEditing == true) {
                    // the polygon was in edit vertice mode, this will stop the edits
                    btnPoly.className = ('esri-icon-grant');
                    btnPolyTitle.title = "Complete Boundary Capture";
                } else {
                    //change icon depending on enabled or disabled
                    if (poly == true) {
                        btnPoly.className = ('');
                        btnPolyTitle.title = "";
                    } else {
                        btnPoly.className = ('esri-icon-polygon');
                        btnPolyTitle.title = "Select Boundary";
                    }
                }
            }

            //disable or enable the button
            this._saveButton.disabled = save;
            var btnSave = document.getElementById("_saveButtonIcon");
            var btnSaveTitle = document.getElementById("_saveButton");
            //change icon depending on enabled or disabled
            if (save == true) {
                btnSave.className = ('');
                btnSaveTitle.title = "";
            } else {
                btnSave.className = ('esri-icon-save');
                btnSaveTitle.title = "Save Boundaries";
            }

            //disable or enable the button
            this._clearButton.disabled = clear;
            var btnClear = document.getElementById("_clearButtonIcon");
            var btnClearTitle = document.getElementById("_clearButton");
            //change icon depending on enabled or disabled
            if (clear == true) {
                btnClear.className = ('');
                btnClearTitle.title = "";
            } else {
                btnClear.className = ('esri-icon-trash');
                btnClearTitle.title = "Clear Boundaries";
            }
        },
        _sendMessage: function(title, message, level) {
            this.msgGrowler.growl({
                title: title,
                message: message,
                level: level //#default, info, warning, success, error# :::: div background colors will show :::: #dark gray,blue,orange,green,red#
            });
        },
        _mapClick: function(evt) {
            //functions moved to toggle function
        },
        _getAllData: function() {
            //package the data depending on returns
            this._packageData(this._graphicsLayer.graphics);
            console.log("JSON Return Data in JS Array Format: ");
            console.log(this._jsonReturnData);
            var jsonString = JSON.stringify(this._jsonReturnData);
            this._jsonReturnData = jsonString;
            console.log("JSON Return Data in JSON Format: " + this._jsonReturnData);

            //if (parent) {
            //parent.document.getElementById('HiddenImage').value = this._generatedImage; //MOVED TO THE _getBase64ForImgUrl FUNCTION
            parent.document.getElementById('HiddenJSON').value = this._jsonReturnData;
            parent.document.getElementById('HiddenInputParameters').value = this.dsdJson;
            parent.document.getElementById('HiddenStatus').value = "Processing";

            //console.log("MVC Hidden Image: " + parent.document.getElementById('HiddenImage').value);//MOVED TO THE _getBase64ForImgUrl FUNCTION
            console.log("MVC Hidden JSON" + parent.document.getElementById('HiddenJSON').value);
            console.log("MVC Hidden Input Parameters" + parent.document.getElementById('HiddenInputParameters').value);
            console.log("MVC Hidden Status" + parent.document.getElementById('HiddenStatus').value);

            //do the screenshot via a PrintTask
            //var useEsriService = true;
            var fileHandle = this._printTask.execute(this._printparams);
            fileHandle.then(lang.hitch(this, function(data) {
                if (data.url) {
                    //var proxyRule = urlUtils.getProxyRule(data.url);
                    var imageUrl = data.url;

                    //get the image at data.url
                    this._generatedImage = this._getBase64ForImgUrl(imageUrl);
                } else {
                    //if there is no url, it means an error was encountered in generating the print ... so handle the error

                }
            }), lang.hitch(this, function(err) {
                //handle the error
                //report a message that could not gen a print
            }));


            if (this._printTask.async) {
                this._printTask.printGp.on('status-update', function(event) {
                    var jobStatus = event.jobInfo.jobStatus;
                    console.log(event.jobInfo);

                    if (jobStatus == "esriJobFailed") {
                        console.log("Print Error Encountered");
                        //this._sendMessage("Error", "Error generating Print Output!", "warning");

                        // Clean up
                        //canvas = null;

                        parent.document.getElementById('HiddenStatus').value = "Error - Print Error - Check Print Service";
                        console.log("MVC Hidden Status: " + parent.document.getElementById('HiddenStatus').value);

                        //hide the busy indicator
                        var busy = document.getElementById("busyIndicator");
                        busy.style.display = "none";

                        var dialog = new ConfirmDialog({
                            title: "Error!",
                            content: "There was an Error Generating the Map Image, Please contact your System Administrator!",
                            style: "width: 500px"
                        });
                        dialog.show();
                        dialog.on("Execute", lang.hitch(this, function() {
                            //try the print task again, this is a loop controlled by the user
                            console.log("Print Task fail!!!");
                        }));
                    }
                });
            }
        },
        _packageData(results) {
            //results consists of 4 arrays of 
            this._jsonReturnData = [];

            //loop and push required data
            for (a = 0; a < results.length; a++) {
                var attributes = results[a].attributes;
                this._jsonReturnData.push({
                    attributes
                });
            }
        },
        toDataUrl: function(url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                var reader = new FileReader();
                reader.onloadend = function() {
                    callback(reader.result);
                }
                reader.readAsDataURL(xhr.response);
            };
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.send();
        },
        _getBase64ForImgUrl: function(url) {
            console.log("#################### Summary Report Image: " + url);

            this.toDataUrl(url, function(myBase64) {
                //console.log(myBase64); // myBase64 is the base64 string
                myBase64 = myBase64.replace(/^data:image\/(png|jpg);base64,/, "");
                console.log(myBase64); // myBase64 is the base64 string

                //add to hidden field
                this._generatedImage = myBase64;

                parent.document.getElementById('HiddenImage').value = this._generatedImage;
                console.log("MVC Hidden Image: " + parent.document.getElementById('HiddenImage').value);

                // Clean up
                canvas = null;

                //hide the busy indicator
                document.getElementById("busyIndicator").style.display = "none";

                parent.document.getElementById('HiddenStatus').value = "Success";
                console.log("MVC Hidden Status: " + parent.document.getElementById('HiddenStatus').value);

                //Close the modal window
                var win = window.parent;
                window.parent.document.getElementById("mapCloseButton").click();
            });
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.dsdTool", Widget, esriNS);
    }
    return Widget;
});