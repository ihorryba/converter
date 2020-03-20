/*const tippecanoe = require('tippecanoe');

tippecanoe(['road-fro.geojson'], {
    zg: true,
    readParallel: true,
    simplification: 10,
    layer: 'road',
    output: 'road-fro.mbtiles'
}, { echo: true });*/

/*const partOfRoad = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [
            [
              -114.9021957402574,
              50.18981812794442
            ],
            [
              -114.90211916610969,
              50.18974761280249
            ]
        ]
      }
    }
  ]
}*/

/*var vectorTile = require('@mapbox/vector-tile').VectorTile;
var Protobuf = require('pbf');
var vtpbf = require('vt-pbf')
var geojsonVt = require('geojson-vt')

var orig = JSON.parse(fs.readFileSync(__dirname + '/fixtures/rectangle.geojson'))
var tileindex = geojsonVt(orig)
var tile = tileindex.getTile(1, 0, 0)

// pass in an object mapping layername -> tile object
var buff = vtpbf.fromGeojsonVt({ 'geojsonLayer': tile })
fs.writeFileSync('my-tile.pbf', buff)*/

/*var fs = require('fs');
var geojsonvt = require('geojson-vt');
var vectorTile = require('@mapbox/vector-tile');
var vtPbf = require('vt-pbf');
var Protobuf = require('pbf');

const geo_vt = geojsonvt(partOfRoad, { tolerance: 0 });
console.log(geo_vt);
const tileFromData = geo_vt.getTile(1, 0, 0);
const pbfFile = vtPbf.fromGeojsonVt({ geojsonLayer: tileFromData });
fs.writeFileSync('my-tile.pbf', pbfFile);*/


const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');

const mbxClient = require('@mapbox/mapbox-sdk');
const mbxTilesets = require('@mapbox/mapbox-sdk/services/tilesets');
const mbxUploads = require('@mapbox/mapbox-sdk/services/uploads');

const access_token = 'sk.eyJ1IjoiaWhvcnJ5YmEiLCJhIjoiY2s3ZDk1eWJ1MHQxaDNmbXNqOHVscmw0ZyJ9.9oHJqJX14vuNI1PzmlwDjw';

const baseClient = mbxClient({ accessToken: access_token });
const tilesetsService = mbxTilesets(baseClient);

const uploadsClient = mbxUploads(baseClient);


const getCredentials = () => {
	return axios.post('https://api.mapbox.com/uploads/v1/ihorryba/credentials?access_token=' + access_token)
	 .then(res => res.data);
  /*return uploadsClient
    .createUploadCredentials()
    .send()
    .then(response => response.body);*/
}
const putFileOnS3 = (credentials) => {
  const s3 = new AWS.S3({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: 'us-east-1'
  });
  return s3.putObject({
    Bucket: credentials.bucket,
    Key: credentials.key,
    Body: fs.createReadStream('road-fro.geojson')
  }).promise().then(() => {
	/*uploadsClient.createUpload({
	  mapId: `ihorryba/newTileForRoad`,
	  url: credentials.url
	}).send().then((res) => {
		console.log(res.body);
	}, (err) => {
		console.log(err);
	})*/
	console.log(credentials.url);
	axios.post('https://api.mapbox.com/uploads/v1/ihorryba?access_token=' + access_token, {
		tileset: 'ihorryba.newTileForRoad',
		url: credentials.url
	  }).then((res) => {
		  console.log(res);
	  }, (err) => {
		  console.log(err);
	  });
  });
};

getCredentials().then(putFileOnS3);
