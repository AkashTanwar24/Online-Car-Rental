// * Load modules
const express = require("express");
const app = express();
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const formidable = require("formidable");
const socketIO = require("socket.io");
const http = require("http");

// * Create port
const PORT = process.env.PORT || 3000;

// * Load Files
const keys = require("./config/keys");

// * Load Stripe
const stripe = require("stripe")(keys.StripeSecretKey);

// * Load Collections
const User = require("./models/user");
const Contact = require("./models/contact");
const Car = require("./models/car");
const Chat = require("./models/chat");
const Budjet = require("./models/budjet");

// * Conneted to MONGODB
mongoose.connect(
  keys.MONGODB,
  {
    useCreateIndex: true,
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) throw err;
    console.log("Connected to mongodb.");
  }
);

// * Setup view engine
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main",
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,

      allowProtoMethodsByDefault: true,
    },
  })
);

app.set("view engine", "handlebars");

// * Connect client side to serve css and js files
app.use(express.static("public"));

// * Setup bodyParser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// * configuration for authentication
app.use(cookieParser());
app.use(
  session({
    secret: "mysecret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// * Load Helpers
const { ensureGuest, requireLogin } = require("./helpers/authHelper");
const { upload } = require("./helpers/aws");

// * Load passport
require("./passport/local");
require("./passport/facebook");

// * Make user a global object
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// * Handle home route
app.get("/", ensureGuest, (req, res) => {
  res.render("home");
});

app.get("/about", ensureGuest, (req, res) => {
  res.render("about", {
    title: "About",
  });
});

app.get("/contact", requireLogin, (req, res) => {
  res.render("contact", {
    title: "Contact Us",
  });
});

// Save Contact form data
app.post("/contact", requireLogin, (req, res) => {
  // console.log(req.body);

  const newContact = {
    name: req.user._id,
    mesaage: req.body.mesaage,
  };

  new Contact(newContact).save((err, user) => {
    if (err) {
      throw err;
    } else {
      console.log("We received message from user", user);
    }
  });
});

app.get("/signup", ensureGuest, (req, res) => {
  res.render("signupForm", {
    title: "Register",
  });
});

app.post("/signup", ensureGuest, (req, res) => {
  // console.log(req.body);
  let errors = [];
  if (req.body.password !== req.body.password2) {
    errors.push({ text: "Password does not match!" });
  }
  if (req.body.password < 5) {
    errors.push({ text: "Password must be at least 5 characters!" });
  }
  if (errors.length > 0) {
    res.render("signupForm", {
      errors: errors,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2,
    });
  } else {
    User.findOne({ email: req.body.email }).then((user) => {
      if (user) {
        let errors = [];
        errors.push({ text: "User already exists!" });
        res.render("signupForm", {
          errors: errors,
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          password: req.body.password,
          password2: req.body.password2,
        });
      } else {
        // * Encrypt password
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(req.body.password, salt);

        const newUser = {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          password: hash,
        };
        new User(newUser).save((err, user) => {
          if (err) {
            throw err;
          }
          if (user) {
            let success = [];
            success.push({
              text: "Your account has been created successfully! You can Login now",
            });
            res.render("loginForm", {
              success: success,
            });
          }
        });
      }
    });
  }
});

app.get("/displayLoginForm", ensureGuest, (req, res) => {
  res.render("loginForm", {
    title: "Login",
  });
});

// * Passport authentication
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/loginErrors",
  })
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
  })
);
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/profile",
    failureRedirect: "/",
  })
);

// * Display Profile
app.get("/profile", requireLogin, (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    user.online = true;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        res.render("profile", {
          user: user,
          title: "Profile",
        });
      }
    });
  });
});

// * Display Login Error
app.get("/loginErrors", (req, res) => {
  let errors = [];
  errors.push({ text: "User not found or Password incorrect" });
  res.render("loginForm", {
    errors: errors,
    title: "Error",
  });
});

// * List a car
app.get("/listCar", requireLogin, (req, res) => {
  res.render("listCar", {
    title: "Listing",
  });
});

app.post("/listCar", requireLogin, (req, res) => {
  const newCar = {
    owner: req.user._id,
    make: req.body.make,
    modal: req.body.modal,
    year: req.body.year,
    type: req.body.type,
  };
  console.log("newCar", newCar);
  new Car(newCar).save((err, car) => {
    if (err) {
      throw err;
    }
    if (car) {
      console.log(car);
      res.render("listCar2", {
        title: "Finish",
        car: car,
      });
    }
  });
});

app.post("/listCar2", requireLogin, (req, res) => {
  console.log(req.body.carID);
  Car.findOne({ _id: req.body.carID, owner: req.user._id }).then((car) => {
    let imageUrl = {
      imageUrl: `https://online-car-rental.s3.ap-south-1.amazonaws.com/${req.body.image}`,
    };
    car.pricePerHour = req.body.pricePerHour;
    car.pricePerWeek = req.body.pricePerWeek;
    car.location = req.body.location;
    car.picture = `https://online-car-rental.s3.ap-south-1.amazonaws.com/${req.body.image}`;
    car.image.push(imageUrl);
    car.save((err, car) => {
      if (err) {
        throw err;
      }
      if (car) {
        res.redirect("/showCars");
      }
    });
  });
});

app.get("/showCars", (req, res) => {
  Car.find({})
    .populate("owner")
    .sort({ date: "desc" })
    .then((cars) => {
      console.log(cars);
      res.render("showCars", {
        cars: cars,
      });
    });
});

// *  Recieve Image
app.post("/uploadImage", requireLogin, upload.any(), (req, res) => {
  const form = new formidable.IncomingForm();
  form.on("file", (field, file) => {
    console.log(file);
  });
  form.on("error", (err) => {
    console.log(err);
  });
  form.on("end", () => {
    console.log("Image received successfully...");
  });
  form.parse(req);
});

// * Logout user
app.get("/logout", (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    user.online = false;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        req.logout();
        res.redirect("/");
      }
    });
  });
});

app.get("/openGoogleMap", (req, res) => {
  res.render("googlemap");
});

// display one car info

app.get("/displayCar/:id", (req, res) => {
  Car.findOne({ _id: req.params.id })
    .then((car) => {
      res.render("displayCar", {
        car: car,
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

// Open owner profiel page
app.get("/contactOwner/:id", (req, res) => {
  User.findOne({
    _id: req.params.id,
  })
    .then((owner) => {
      res.render("ownerProfile", {
        owner: owner,
      });
    })
    .catch((err) => {
      console.log(err);
    });
  // res.render("googlemap");
});

// * Renting a car
app.get("/RentCar/:id", (req, res) => {
  Car.findOne({
    _id: req.params.id,
  })
    .then((car) => {
      res.render("calculate", {
        car: car,
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/calculateTotal/:id", (req, res) => {
  Car.findOne({
    _id: req.params.id,
  })
    .then((car) => {
      console.log(req.body);
      var hour = parseInt(req.body.hour);
      var week = parseInt(req.body.week);
      var totalHours = hour * car.pricePerHour;
      var totalWeeks = week * car.pricePerWeek;
      var total = totalHours * totalWeeks;
      console.log("Total is", total);
      //  create a budjet
      const budjet = {
        carID: req.params.id,
        total: total,
        renter: req.user._id,
        date: new Date(),
      };

      new Budjet(budjet).save((err, budjet) => {
        if (err) {
          console.log(err);
        }
        if (budjet) {
          Car.findOne({ _id: req.params.id })
            .then((car) => {
              // caluculate totla for stripe
              var stripeTotal = budjet.total * 100;
              res.render("checkout", {
                budjet: budjet,
                car: car,
                StripePublishableKey: keys.StripePublishableKey,
                stripeTotal,
              });
            })
            .catch(() => {
              console.log(err);
            });
        }
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

// Charge client
app.post("/chargeRenter/:id", (req, res) => {
  Budjet.findOne({ _id: req.params.id })
    .populate("renter")
    .then((budjet) => {
      const amount = budjet.total * 100;
      stripe.customers
        .create({
          email: req.body.stripeEmail,
          source: req.body.stripeToken,
        })
        .then((customer) => {
          stripe.paymentIntents.create(
            {
              amount: amount,
              description: `$${budjet.total} for renting a car`,
              currency: "usd",
              customer: customer.id,
              receipt_email: customer.email,
            },
            (err, charge) => {
              if (err) {
                console.log(err);
              }
              if (charge) {
                console.log(charge);
                res.render("success", {
                  charge: charge,
                  budjet: budjet,
                });
              }
            }
          );
        })
        .catch((err) => console.log(err));
    })

    .catch((err) => console.log(err));
});

// * Socket Connection
const server = http.createServer(app);
const io = socketIO(server);
io.on("connection", (socket) => {
  console.log("Connected to client");

  // Handle chat room route
  app.get("/chatOwner/:id", (req, res) => {
    Chat.findOne({ sender: req.params.id, receiver: req.user._id })
      .then((chat) => {
        if (chat) {
          chat.date = new Date();
          chat.senderRead = false;
          chat.receiverRead = true;
          chat
            .save()
            .then((chat) => {
              res.redirect(`/chat/${chat._id}`);
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          Chat.findOne({ sender: req.user._id, receiver: req.params.id })
            .then((chat) => {
              if (chat) {
                chat.senderRead = true;
                chat.receiverRead = false;
                chat.date = new Date();
                chat
                  .save()
                  .then((chat) => {
                    res.redirect(`/chat/${chat._id}`);
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              } else {
                const newChat = {
                  sender: req.user._id,
                  receiver: req.params.id,
                  date: new Date(),
                };
                new Chat(newChat)
                  .save()
                  .then((chat) => {
                    res.redirect(`/chat/${chat._id}`);
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              }
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });

  // Handle /chat/chat ID route
  app.get("/chat/:id", (req, res) => {
    Chat.findOne({ _id: req.params.id })
      .populate("sender")
      .populate("receiver")
      .populate("dialogue.sender")
      .populate("dialogue.receiver")
      .then((chat) => {
        res.render("chatRoom", {
          chat: chat,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  // Post request to /chat/ID
  app.post("/chat/:id", (req, res) => {
    Chat.findById({ _id: req.params.id })
      .populate("sender")
      .populate("receiver")
      .populate("dialogue.sender")
      .populate("dialogue.receiver")
      .then((chat) => {
        const newDialogue = {
          sender: req.user._id,
          date: new Date(),
          senderMessage: req.body.message,
        };
        chat.dialogue.push(newDialogue);
        chat.save((err, chat) => {
          if (err) {
            console.log(err);
          }
          if (chat) {
            Chat.findOne({ _id: chat._id })
              .populate("sender")
              .populate("receiver")
              .populate("dialogue.sender")
              .populate("dialogue.receiver")
              .then((chat) => {
                res.render("chatRoom", {
                  chat: chat,
                });
              })
              .catch((err) => {
                console.log(err);
              });
          }
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  // Listem to object id event
  socket.on("ObjectID", (oneCar) => {
    console.log("oneCar is " + oneCar);
    Car.findOne({ owner: oneCar.userID, _id: oneCar.carID }).then((car) => {
      socket.emit("car", car);
    });
  });

  // Find a cars and send them to browser for map
  Car.find({})
    .then((cars) => {
      socket.emit("allcars", {
        cars: cars,
      });
    })
    .catch((err) => {
      console.log(err);
    });

  // Listen to event to recieve lat and lng
  socket.on("LatLng", (data) => {
    console.log(data);
    // find a cart object and update lat and lng
    Car.findOne({ owner: data.car.owner })
      .then((car) => {
        car.coords.lat = data.data.results[0].geometry.location.lat;
        car.coords.lng = data.data.results[0].geometry.location.lng;
        car.save((err, car) => {
          if (err) {
            throw err;
          }
          if (car) {
            console.log("Car Lat and Lng is updated!");
          }
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  // Listen to disconnection
  socket.on("disconnect", (socket) => {
    console.log("Disconnected from Client");
  });
});

server.listen(PORT, () => {
  console.log(`Server is up on port ${PORT}`);
});
