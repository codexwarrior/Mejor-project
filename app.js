if(process.env.NODE_ENV !="production"){
  require('dotenv').config();
}
//console.log(process.env);

const express =  require ("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const Review = require("./models/review.js");
const flash = require("connect-flash");
const passport = require ("passport");
const localStrategy = require ("passport-local");
const User = require ("./models/user.js");
const {isLoggedin, saveRedirectUrl, isOwner} = require("./middleware.js");
const multer  = require('multer')
const {storage} = require("./cloudCofig.js");
const upload = multer({ storage})

const session = require("express-session");
const MongoStore = require('connect-mongo');



//const mongo_url =  "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

main().then(()=>{
    console.log("connected to db");
})
.catch(()=>{
    console.log("err");
})

async function main() {
  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw new Error("Unable to connect to the database");
  }
}


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto:{
    secret: process.env.SECRET,
  },
  touchAfter: 24*3600,
})

store.on("error",()=>{
  console.log("error in mongo session store",err);
})

const sessionOptions = {
  store,
  secret: process.env.SECRET ,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7*24*60*60*1000,
    maxAge:7*24*60*60*1000,
    httpOnly: true,
  },
};




// app.get("/",(req,res)=>{    //Root Api 
//   res.send("hi, i'm root");
// })

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




app.use((req,res,next)=>{
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;

  next();
})


//signup get
app.get("/signup",(req,res)=>{
  res.render("users/signup.ejs");
})


//signup post
app.post("/signup", async (req, res) => {
  try {
    let { username, email, password } = req.body;
    console.log("Received data:", req.body);


    // Log the received data for debugging
    //console.log("Received data:", { username, email, password });

    const newUser = new User({ email, username  });
    const registeredUser = await User.register(newUser, password);

    req.logIn(registeredUser,(err)=>{
      if(err){
        return next(err);
      }
      req.flash("success", "Welcome to wonderlust!");
    res.redirect("/listings");
    })
  } catch (e) {
    // Log the error for debugging
    console.error("Error during signup:", e);

    req.flash("error", e.message);
    res.redirect("/signup");
  }
});

//LOGIN GET 

app.get("/login" ,(req,res)=>{
    res.render("users/login.ejs");
})

//login post
app.post("/login", saveRedirectUrl ,
passport.authenticate("local",
{failureRedirect: '/login' ,failureFlash: true}),
 async(req,res)=>{
    req.flash("success","wolcome back to wonderlust ! you are logged in");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
})


//logout get
app.get("/logout",(req,res)=>{
  req.logOut((err)=>{
    if(err){
      next(err);
    }
    req.flash("success","you are logged out");
    res.redirect("/listings");
  });
});




//index route
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  });

//New route

app.get("/listings/new",isLoggedin, (req, res) => {
    res.render("listings/new.ejs");
  });

  //show route
app.get("/listings/:id",async(req,res)=>{
    let {id} =req.params;
    const listing = await Listing.findById(id).populate("reviews").populate("owner");
    if(!listing){
      req.flash("error" , "Listing does not exist");
       return res.redirect("/listings");
    }
   return res.render("listings/show.ejs", { listing});
});

// create route
app.post("/listings",upload.single('listing[image]'),isLoggedin,
async(req,res)=>{
  let url = req.file.path;
  let filename = req.file.filename;
  console.log(url,"...",filename);
   const newListing = new Listing(req.body.listing);
   newListing.owner = req.user._id;
   newListing.image = {url , filename};
   await newListing.save();
   req.flash("success","New Listing Created");
    res.redirect("/listings");
  
});

//edit route
app.get("/listings/:id/edit",isLoggedin,isOwner, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if(!listing){
    req.flash("error","Listing you requested for does not exist!");
    res.redirect("/listing");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload","/upload/h_300,w_250");
  res.render("listings/edit.ejs", { listing ,originalImageUrl });
});

  //Update Route
  app.put("/listings/:id", upload.single('listing[image]'), isLoggedin, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params; 
   let listing =  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
   if( typeof req.file !=="undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url,filename};
    await listing.save();
   }
    req.flash("success", "Listing Updated successfully");
    res.redirect(`/listings/${id}`);
}));


  //Delete route
  app.delete("/listings/:id",isLoggedin,
     wrapAsync (async (req,res)=>{
      let {id} = req.params;
      let deletedListing = await Listing.findByIdAndDelete(id);
      //req.flash("error", "you can not delete listing ");
      req.flash("success", "Listing Deleted");
      res.redirect("/listings");
     })
  );

  //Reviews
  //post
  app.post("/listings/:id/reviews", wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
  
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success", "New Review added");
    res.redirect(`/listings/${listing._id}`);  
  }));
  

  //Delete review
  app.delete("/listings/:id/reviews/:reviewId",isOwner,
  wrapAsync(async(req,res)=>{
    let {id, reviewId} = req.params;
    await Listing.findByIdAndUpdate(id,{$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    
    res.redirect(`/listings/${id}`);
  }))
  
  
  app.all("*" ,(req,res,next)=>{
    next(new ExpressError(404, "page not found"));
  })
  


  app.use((err, req, res, next) => {
    let { statusCode, message } = err;
    res.status(statusCode || 500).send(message || 'Internal Server Error');
  });
  
  


app.listen(8080 ,() => {
    console.log("server is listning to port 2000");  
});