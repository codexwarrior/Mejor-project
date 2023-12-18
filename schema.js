const Joi = require('joi');

module.exports.listingSchema = Joi.object ({
    listing : Joi.object({
        title : joi.string().required(),
        description : Joi.string().required(),
        location: joi.string().required(),
        country:Joi.string().required(),
        price: Joi.number().required().min(0),
        image: Joi.string().allow("",null)
    }).required()
});