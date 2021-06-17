import Joi from "joi";

const categoriesSchema = data => {
    const schema = Joi.object({
        name: Joi.string().required()
    });
    return schema.validate(data);
};

export default categoriesSchema;