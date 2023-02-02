/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert("nobles-20183-firebase-adminsdk-mu60o-e64257955a.json"),
  databaseURL: "https://nobles-20183-default-rtdb.firebaseio.com",
});

exports.notifyArticle = functions.https.onCall((data, context) => {
  console.log(data);
  const topic = data.topic;
  const message = data.message;
  const registrationToken = data.registrationToken;

  admin.messaging().subscribeToTopic(registrationToken, topic)
      .then((response) => {
        console.log("Successfully subscribed to topic:", response);
        admin.messaging().send(message)
            .then((response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
      })
      .catch((error) => {
        console.log("Error subscribing to topic:", error);
      });
});


/**
 It might also be:
    const { initializeApp } = require('firebase-admin/app');
    const app = initializeApp();
 */
