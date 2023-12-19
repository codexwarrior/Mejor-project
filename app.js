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




 const mongo_url =  "mongodb://127.0.0.1:27017/wanderlust";

main().then(()=>{
    console.log("connected to db");
})
.catch(()=>{
    console.log(err);
})

async function main () {
    await  mongoose.connect( mongo_url);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

app.get("/",(req,res)=>{    //Root Api 
    res.send("hi, i'm root");
})

//index route
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  });

//New route

app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
  });

  //show route
app.get("/listings/:id",async(req,res)=>{
    let {id} =req.params;
    const listing = await Listing.findById(id).populate("reviews");
  res.render("listings/show.ejs", { listing });
});

// create route
app.post("/listings",
async(req,res)=>{
   const newListing = new Listing(req.body.listing);
   await newListing.save();
    res.redirect("/listings");
});

//edit route
app.get("/listings/:id/edit", async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  });

  //Update Route
app.put("/listings/:id", 
 wrapAsync(async(req,res)=>{
  if(!req.body.listen){
    throw new ExpressError (404, " send valid data for listing ");
  }
  let {id} = req.params; 
  await Listing.findByIdAndUpdate(id , {...req.body.listing});
  res.redirect(`/listing/${id}`);
 })
  );

  //Delete route
  app.delete("/listings/:id",
     wrapAsync (async (req,res)=>{
      let {id} = req.params;
      let deletedListing = await Listing.findByIdAndDelete(id);
      console.log (deletedListing);
      req.redirect("/listing");
     })
  );

  //Reviews
  //post
  app.post("/listings/:id/reviews", wrapAsync (async(req,res)=>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    res.redirect(`/listings/${listings._id}`);
  }))

  //Delete review
  app.delete("/listings/:id/reviews/:reviewId",
  wrapAsync(async(req,res)=>{
    let {id, reviewId} = req.params;
    await Listing.findByIdAndUpdate(id,{$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
  }))


  app.all("*" ,(req,res,next)=>{
    next(new ExpressError(404, "page not found"));
  })


  app.use((err,req,res,next)=>{
    let {statusCode , message} = err;
    res.status(statusCode ) .send(message);
  });
  



app.listen(3000 ,() => {
    console.log("server is listning to port 8080");  
});

