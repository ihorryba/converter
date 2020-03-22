const app = require('express')();
const http = require('http').createServer(app);

const fs = require('fs');

// const Curl = require('curl-request');
// const curl = new Curl();
// const curl = require('curlrequest');

const AWS = require('aws-sdk');
const axios = require('axios');
const UTM = require('utm-latlng');

const { PubSub } = require('@google-cloud/pubsub');
const { Storage } = require('@google-cloud/storage');

const pubSub = new PubSub();
const storage = new Storage();

const access_token = 'sk.eyJ1IjoiaWhvcnJ5YmEiLCJhIjoiY2s3ZDk1eWJ1MHQxaDNmbXNqOHVscmw0ZyJ9.9oHJqJX14vuNI1PzmlwDjw';

const mines = {
    fro: {
        zoneNumber: 11,
        zoneLetter: 'U'
    },
    evo: {
        zoneNumber: 11,
        zoneLetter: 'U'
    },
    gho: {
        zoneNumber: 11,
        zoneLetter: 'U'
    },
    lco: {
        zoneNumber: 11,
        zoneLetter: 'U'
    },
    hvc: {
        zoneNumber: 10,
        zoneLetter: 'U'
    },
};

subscribeToStorage();

http.listen(process.env.PORT || 8080, function(){
    console.log('listening on *:8080');
});

async function subscribeToStorage() {
    const topic = pubSub.topic('topography-bucket');
    const bucket = storage.bucket('topography');
    const [isTopicExists] = await topic.exists();

    if (!isTopicExists) {
        await topic.create();
    }
    await setTopicPolicy(topic);
    const [notifications] = await bucket.getNotifications();
    if (!notifications.length) {
        await bucket.createNotification('topography-bucket');
    }
    const [subscriptions] = await topic.getSubscriptions();
    const isSubscriptionExists =
        Boolean(subscriptions.length && subscriptions.find(item => item.name.includes('topography-bucket-subscription')));
    if (!isSubscriptionExists) {
        await topic.createSubscription('topography-bucket-subscription');
    }
    const subscription = topic.subscription('topography-bucket-subscription');
    subscription.on('message', async msg => {
        try {
            if (msg.attributes.eventType !== 'OBJECT_FINALIZE') return;
            const segments = msg.attributes.objectId.split('/');
            if (segments.length === 2 && Object.keys(mines).some(key => segments[0].toLowerCase() === key)) {
                const file = bucket.file(msg.attributes.objectId);
                const res = await file.download();
                const data = JSON.parse(res.toString());
                const mineData = mines[segments[0].toLowerCase()];
                convertUtmToLatLng(data, mineData.zoneNumber, mineData.zoneLetter);
                sendToMapBox(JSON.stringify(data))
                    .then(res => console.log(res))
                    .catch(err => console.log(err));
            }
        } catch (e) {
            console.log(e);
        } finally {
            msg.ack();
        }
    });
}

function convertUtmToLatLng(data, zoneNumber, zoneLetter) {
    const utm = new UTM();
    data.features.forEach(feature => {
        feature.geometry.coordinates.forEach(coordinates => {
            if (coordinates.length) {
                const latLng = utm.convertUtmToLatLng(coordinates[0], coordinates[1], zoneNumber, zoneLetter);
                coordinates[0] = latLng.lng;
                coordinates[1] = latLng.lat;
            }
        });
    });
}

async function setTopicPolicy(topic) {
    const newPolicy = {
        bindings: [
            {
                role: 'roles/pubsub.admin',
                members: ['allUsers'],
            },
        ],
    };

    await topic.iam.setPolicy(newPolicy);
}

function sendToMapBox(data) {
    const getCredentials = () => {
        return axios.post('https://api.mapbox.com/uploads/v1/ihorryba/credentials?access_token=' + access_token)
            .then(res => res.data);
    };
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
            Body: data
        }).promise().then(() => {
            return axios.post('https://api.mapbox.com/uploads/v1/ihorryba?access_token=' + access_token, {
                tileset: 'ihorryba.new-logic',
                url: credentials.url
            });
        });
    };

    return getCredentials().then(putFileOnS3);
}

// function getLineDelimitedJson(data) {
//     const arr = data.features.map(item => JSON.stringify(item));
//     const jsonString = arr.join('\n');
//     return jsonString.slice(0, -1);
// }
//
// fs.writeFile('my-file.geojson.ld', data, (err) => {
//     if (err) console.log(err);
//     console.log('File is created successfully.');
// });
