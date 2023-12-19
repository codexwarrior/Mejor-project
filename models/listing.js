const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listningSchema = new Schema({
    title :{
        type: String,
        required : true,
    },
    description : String ,
    image :{
        type : String,
        set :(v) => v === "" ? 
        "https://images.unsplash.com/photo-1695821449523-6929f4e61b6f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw3fHx8ZW58MHx8fHx8&auto=format&fit=crop&w=1000&q=60" : v,
    } ,
    price : Number,
    location : String,
    country : String,
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref: "Review"
        }
    ]
});

listningSchema.post("findOneAndDelete",async(listing)=>{
    if(listing){
    await Review.deleteMany({_id :{$in: listing.reviews}});
    }
})

const Listing = mongoose.model("Listing",listningSchema); //creating module

module.exports = Listing;