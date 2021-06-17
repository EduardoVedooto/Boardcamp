import Joi from "joi";

const gamesSchema = data => {
    const schema = Joi.object({
        name: Joi.string().required(),
        image: Joi.string().uri(),
        stockTotal: Joi.number().positive().strict(),
        pricePerDay: Joi.number().positive().strict(),
        categoryId: Joi.number().positive().allow(0).strict()
    });
    return schema.validate(data);
};

export default gamesSchema;