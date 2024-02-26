const express = require("express");
const router = express.Router();
//index route
router.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  });

//New router

router.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
  });

  //show router
router.get("/listings/:id",async(req,res)=>{
    let {id} =req.params;
    const listing = await Listing.findById(id).populate("reviews");
  res.render("listings/show.ejs", { listing });
});

// create route
router.post("/listings",
async(req,res)=>{
   const newListing = new Listing(req.body.listing);
   await newListing.save();
    res.redirect("/listings");
});

//edit route
router.get("/listings/:id/edit", async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  });

  //Update Route
router.put("/listings/:id", 
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
  router.delete("/listings/:id",
     wrapAsync (async (req,res)=>{
      let {id} = req.params;
      let deletedListing = await Listing.findByIdAndDelete(id);
      console.log (deletedListing);
      req.redirect("/listing");
     })
  );