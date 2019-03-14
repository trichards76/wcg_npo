define({
	"item": {
		"title": "DSD NPO Application",
		"type": "Web Map",
		"extent": [
			[17.6713, -34.2245],
			[19.3075, -33.5726]
		]
	},
	"itemData": {
		"operationalLayers": [{
			"id": "0",
			"layerType": "ArcGISImageServiceLayer",
				"url": "https://webservices.westerncape.gov.za/server/rest/services/DSD/NPO_Census2011_SubplaceBoundaries/MapServer/0",
			"visibility": true,
			"opacity": 1,
			"title": "Sub-Place boundaries"
		}],
		"baseMap": {
			"baseMapLayers": [{
				"id": "Base_Data_0",
				"layerType": "ArcGISTiledMapServiceLayer",
				"url": "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
				"visibility": true,
				"opacity": 1,
				"title": "Base Data"
			}],
			"title": "Base Data"
		}
	}
});