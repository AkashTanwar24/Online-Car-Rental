$(document).ready(function () {
  // auto scroll functionality by jquery
  $("#list").animate({ scrollTop: 10000 }, 80);

  var socket = io();
  //   connect client to server
  socket.on("connect", function (socket) {
    console.log("Connected to Server");
  });

  // Emit User Id
  var ObjectID = $("#ObjectID").val();
  var carID = $("#carID").val();
  socket.emit("ObjectID", {
    carID: carID,
    userID: ObjectID,
  });

  // listen to car event
  socket.on("car", (car) => {
    console.log(car);
    // Make a ajax request to fetch latitude and longitude
    $.ajax({
      url: `https://maps.googleapis.com/maps/api/geocode/json?address=${car.location}&key=AIzaSyAwFQiRGzzRnnlsL9aaTwZ4HW4Aaxt8ml4`,
      type: "POST",
      data: JSON,
      processData: true,
      success: function (data) {
        console.log(data);
        // send lat and lag
        socket.emit("LatLng", {
          data: data,
          car: car,
        });
      },
    });
  });

  //   Disconnect from server
  socket.on("disconnect", function (socket) {
    console.log("Disconnected from Server");
  });
});
